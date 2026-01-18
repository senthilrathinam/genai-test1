import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { QuestionType, GrantResponse } from '@/types';
import crypto from 'crypto';

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'us-east-1',
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

export async function parseHtmlQuestions(url: string): Promise<GrantResponse[]> {
  try {
    console.log('[HTML Parser] Parsing questions from:', url);
    
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
      
      const allQuestions: any[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      const maxPages = 20;
      
      while (hasMorePages && currentPage <= maxPages) {
        console.log(`[HTML Parser] Extracting questions from page ${currentPage}...`);
        
        // Extract HTML from current page
        const html = await page.content();
        const truncatedHtml = html.substring(0, 100000);
        
        const prompt = `Analyze this HTML form page and extract ALL questions with their types and options.

IMPORTANT: Look for fields in:
- Standard HTML inputs, textareas, selects
- Custom components (data-* attributes, role attributes)
- Nested structures (divs with input-like behavior)
- contenteditable elements
- ARIA-labeled elements

For each question, determine:
1. question_text: The exact question text (from labels, legends, aria-label, placeholder, or nearby text)
2. type: one of: text, textarea, single_choice, multi_choice, yes_no, number, date, other
3. options: array of choices (for single_choice, multi_choice, yes_no)
4. required: if the field is required (required attribute or aria-required)

Return ONLY a valid JSON array, no other text:
[{
  "question_text": "What is your organization name?",
  "type": "text",
  "required": true
}]

HTML:
${truncatedHtml}`;

        const payload = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 8000,
          messages: [{ role: "user", content: prompt }]
        };

        const command = new InvokeModelCommand({
          modelId: MODEL_ID,
          body: JSON.stringify(payload),
        });

        const bedrockResponse = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
        
        if (responseBody.content && responseBody.content[0]) {
          const text = responseBody.content[0].text;
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsed)) {
                console.log(`[HTML Parser] Found ${parsed.length} questions on page ${currentPage}`);
                allQuestions.push(...parsed);
              }
            } catch (e) {
              console.error(`[HTML Parser] Failed to parse questions from page ${currentPage}`);
            }
          }
        }
        
        // Look for Next button
        const nextButton = await page.evaluate(() => {
          const nextKeywords = [
            'next', 'continue', 'proceed', 'forward', 'siguiente', 'suivant',
            'weiter', 'avanti', 'próximo', 'continuar', 'continuer'
          ];
          
          const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]'));
          
          for (const btn of buttons) {
            const text = (btn.textContent || '').toLowerCase().trim();
            const value = (btn as HTMLInputElement).value?.toLowerCase() || '';
            const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
            const title = btn.getAttribute('title')?.toLowerCase() || '';
            
            const allText = `${text} ${value} ${ariaLabel} ${title}`;
            
            const isNext = nextKeywords.some(kw => allText.includes(kw));
            const isSubmit = allText.includes('submit') || allText.includes('send') || 
                           allText.includes('enviar') || allText.includes('soumettre');
            
            if (isNext && !isSubmit) {
              const id = btn.id;
              if (id) return `#${id}`;
              
              const className = btn.className;
              if (className) {
                const classes = className.split(' ').filter(c => c.length > 0);
                if (classes.length > 0) return `.${classes[0]}`;
              }
              
              return `button:has-text("${text}")`;
            }
          }
          
          return null;
        });
        
        if (nextButton) {
          console.log(`[HTML Parser] Found Next button, navigating to page ${currentPage + 1}...`);
          try {
            await page.click(nextButton, { timeout: 5000 });
            await page.waitForTimeout(2000);
            await page.waitForLoadState('networkidle').catch(() => {});
            currentPage++;
          } catch (error) {
            console.log('[HTML Parser] Failed to navigate, stopping');
            hasMorePages = false;
          }
        } else {
          console.log('[HTML Parser] No Next button found, assuming last page');
          hasMorePages = false;
        }
      }
      
      await browser.close();
      
      console.log(`[HTML Parser] Total questions found across ${currentPage} page(s): ${allQuestions.length}`);
      
      if (allQuestions.length === 0) {
        return getFallbackQuestions();
      }

      // Deduplicate questions by question text (case-insensitive)
      const seen = new Set<string>();
      const uniqueQuestions = allQuestions.filter(q => {
        const normalized = (q.question_text || '').toLowerCase().trim();
        if (!normalized || seen.has(normalized)) {
          return false;
        }
        seen.add(normalized);
        return true;
      });

      console.log(`[HTML Parser] After deduplication: ${uniqueQuestions.length} unique questions`);

      return uniqueQuestions.map((q: any) => ({
        question_id: crypto.randomUUID(),
        question_text: q.question_text || 'Untitled Question',
        type: (q.type || 'textarea') as QuestionType,
        options: q.options,
        answer: q.type === 'multi_choice' ? [] : '',
        required: q.required || false,
        reviewed: false,
      }));
    } catch (pageError) {
      await browser.close();
      throw pageError;
    }
  } catch (error) {
    console.error('HTML parsing error:', error);
    return getFallbackQuestions();
  }
}

function getFallbackQuestions(): GrantResponse[] {
  return [
    {
      question_id: crypto.randomUUID(),
      question_text: 'Describe your organization and its mission.',
      type: 'textarea',
      answer: '',
      reviewed: false,
    },
    {
      question_id: crypto.randomUUID(),
      question_text: 'What is the purpose of this grant request?',
      type: 'textarea',
      answer: '',
      reviewed: false,
    },
    {
      question_id: crypto.randomUUID(),
      question_text: 'How will the funds be used?',
      type: 'textarea',
      answer: '',
      reviewed: false,
    },
  ];
}
