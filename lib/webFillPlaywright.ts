import { chromium } from 'playwright';
import { GrantApplicationInstance } from '@/types';

export type WebFillResult = {
  fieldsFilled: number;
  fieldsSkipped: number;
  mappings: {
    question: string;
    answer: string | string[];
    selector: string;
    confidence: number;
  }[];
};

const SEMANTIC_KEYWORDS = {
  organization: ['org', 'company', 'nonprofit', 'entity', 'legal', 'name'],
  mission: ['purpose', 'goal', 'objective', 'vision', 'statement'],
  contact: ['email', 'phone', 'address', 'representative', 'person'],
  funding: ['amount', 'budget', 'grant', 'request', 'money', 'funds'],
  ein: ['tax', 'id', 'taxpayer', 'federal', 'employer', 'identification'],
  timeline: ['schedule', 'date', 'duration', 'period', 'start', 'end'],
  beneficiaries: ['served', 'participants', 'recipients', 'population', 'target', 'number'],
  outcomes: ['results', 'impact', 'metrics', 'success', 'goals', 'achievements', 'measurable'],
  program: ['project', 'initiative', 'activity', 'service'],
  description: ['describe', 'explain', 'detail', 'summary'],
  sustainability: ['sustain', 'continue', 'maintain', 'future', 'ongoing'],
  budget: ['breakdown', 'expenses', 'costs', 'spending'],
  technology: ['tech', 'digital', 'computer', 'software', 'hardware'],
};

const TYPE_COMPATIBILITY: Record<string, string[]> = {
  text: ['text', 'email', 'tel', 'url', 'search'],
  textarea: ['textarea', 'text'],
  number: ['number', 'text'],
  date: ['date', 'text'],
  single_choice: ['radio', 'select-one'],
  multi_choice: ['checkbox', 'select-multiple'],
  yes_no: ['radio', 'select-one'],
};

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getSemanticScore(text1: string, text2: string): number {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  
  for (const keywords of Object.values(SEMANTIC_KEYWORDS)) {
    const matches1 = keywords.filter(kw => norm1.includes(normalizeText(kw)));
    const matches2 = keywords.filter(kw => norm2.includes(normalizeText(kw)));
    
    if (matches1.length > 0 && matches2.length > 0) {
      const overlap = matches1.filter(m => matches2.includes(m)).length;
      if (overlap > 0) return 0.9;
      return 0.7;
    }
  }
  
  return 0.0;
}

function calculateTextSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);
  
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;
  
  const words1 = str1.toLowerCase().split(/\s+/).map(normalizeText).filter(w => w.length > 2);
  const words2 = str2.toLowerCase().split(/\s+/).map(normalizeText).filter(w => w.length > 2);
  const commonWords = words1.filter(w => words2.includes(w)).length;
  
  if (commonWords === 0) return 0;
  
  const ratio = commonWords / Math.max(words1.length, words2.length);
  return ratio;
}

function getTypeCompatibility(answerType: string, fieldType: string, answerLength: number): number {
  const compatible = TYPE_COMPATIBILITY[answerType] || [];
  if (compatible.includes(fieldType)) return 1.0;
  
  if (answerType === 'textarea' && fieldType === 'text' && answerLength < 100) return 0.7;
  if (answerType === 'text' && fieldType === 'textarea') return 0.9;
  if (answerType === 'number' && fieldType === 'text') return 0.8;
  if (answerType === 'date' && fieldType === 'text') return 0.8;
  
  return 0.0;
}

function calculateFieldScore(
  questionText: string,
  field: any,
  answerType: string,
  answerLength: number
): number {
  const allFieldText = [
    field.labelText,
    field.helperText,
    field.groupLabel,
    field.id,
    field.name,
    field.placeholder,
    field.ariaLabel
  ].filter(Boolean).join(' ');
  
  const textSim = calculateTextSimilarity(questionText, allFieldText);
  const semanticSim = getSemanticScore(questionText, allFieldText);
  const typeCompat = getTypeCompatibility(answerType, field.type, answerLength);
  
  const idBoost = field.id && normalizeText(questionText).includes(normalizeText(field.id)) && field.id.length > 3 ? 0.15 : 0;
  const nameBoost = field.name && normalizeText(questionText).includes(normalizeText(field.name)) && field.name.length > 3 ? 0.15 : 0;
  
  const score = (
    textSim * 0.4 +
    semanticSim * 0.3 +
    typeCompat * 0.3 +
    Math.max(idBoost, nameBoost)
  );
  
  return Math.min(score, 1.0);
}

async function highlightElement(page: any, selector: string) {
  await page.evaluate((sel: string) => {
    const el = document.querySelector(sel);
    if (el && el instanceof HTMLElement) {
      el.style.outline = '3px solid #9333ea';
      el.style.outlineOffset = '2px';
    }
  }, selector);
}

async function extractFormFields(page: any) {
  return await page.evaluate(() => {
    const fields: any[] = [];
    
    // Helper to check visibility
    const isVisible = (el: HTMLElement) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0';
    };
    
    // Helper to extract from iframe
    const extractFromIframe = (iframe: HTMLIFrameElement) => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) return [];
        
        const iframeFields: any[] = [];
        iframeDoc.querySelectorAll('input, textarea, select').forEach((el: any, index: number) => {
          if (!isVisible(el)) return;
          if (el.disabled || el.readOnly) return;
          
          // Extract field info (same as main document)
          const fieldInfo = extractFieldInfo(el, index, true);
          if (fieldInfo) iframeFields.push(fieldInfo);
        });
        return iframeFields;
      } catch (e) {
        // Cross-origin iframe, can't access
        return [];
      }
    };
    
    // Helper to extract field info
    const extractFieldInfo = (el: any, index: number, isIframe: boolean = false) => {
      const id = el.id || '';
      const name = el.name || '';
      const type = el.type || el.tagName.toLowerCase();
      const placeholder = el.placeholder || '';
      const ariaLabel = el.getAttribute('aria-label') || '';
      const ariaDescribedBy = el.getAttribute('aria-describedby') || '';
      const required = el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';
      
      let labelText = '';
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        labelText = label?.textContent?.trim() || '';
      }
      if (!labelText) {
        const parent = el.closest('label');
        labelText = parent?.textContent?.trim() || '';
      }
      if (!labelText) {
        const prevLabel = el.previousElementSibling;
        if (prevLabel?.tagName === 'LABEL') {
          labelText = prevLabel.textContent?.trim() || '';
        }
      }
      
      let helperText = '';
      if (ariaDescribedBy) {
        const helper = document.getElementById(ariaDescribedBy);
        helperText = helper?.textContent?.trim() || '';
      }
      if (!helperText && labelText) {
        const labelEl = id ? document.querySelector(`label[for="${id}"]`) : el.closest('label');
        if (labelEl) {
          const spans = labelEl.querySelectorAll('span');
          spans.forEach(span => {
            const text = span.textContent?.trim() || '';
            if (text && text.length > 20) helperText += ' ' + text;
          });
        }
      }
      
      let groupLabel = '';
      const fieldset = el.closest('fieldset');
      if (fieldset) {
        const legend = fieldset.querySelector('legend');
        groupLabel = legend?.textContent?.trim() || '';
      }
      
      el.setAttribute('data-field-index', index.toString());
      if (isIframe) el.setAttribute('data-in-iframe', 'true');
      
      return { 
        id, name, type, placeholder, ariaLabel, 
        labelText, helperText, groupLabel, index, required,
        isIframe
      };
    };
    
    // Extract from main document
    document.querySelectorAll('input, textarea, select').forEach((el: any, index: number) => {
      if (!isVisible(el as HTMLElement)) return;
      if (el.disabled || el.readOnly) return;
      
      const fieldInfo = extractFieldInfo(el, index);
      if (fieldInfo) fields.push(fieldInfo);
    });
    
    // Extract from iframes
    document.querySelectorAll('iframe').forEach((iframe: HTMLIFrameElement) => {
      const iframeFields = extractFromIframe(iframe);
      fields.push(...iframeFields);
    });
    
    // Extract contenteditable elements (rich text editors)
    document.querySelectorAll('[contenteditable="true"]').forEach((el: any, index: number) => {
      if (!isVisible(el as HTMLElement)) return;
      
      const ariaLabel = el.getAttribute('aria-label') || '';
      const role = el.getAttribute('role') || '';
      
      // Try to find associated label
      let labelText = ariaLabel;
      if (!labelText) {
        const prevLabel = el.previousElementSibling;
        if (prevLabel?.tagName === 'LABEL') {
          labelText = prevLabel.textContent?.trim() || '';
        }
      }
      
      el.setAttribute('data-field-index', `contenteditable-${index}`);
      fields.push({
        id: el.id || '',
        name: el.getAttribute('name') || '',
        type: 'contenteditable',
        placeholder: '',
        ariaLabel,
        labelText,
        helperText: '',
        groupLabel: '',
        index: `contenteditable-${index}`,
        required: el.getAttribute('aria-required') === 'true',
        isIframe: false
      });
    });
    
    return fields;
  });
}

function escapeSelector(str: string): string {
  return str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}

function normalizeDateForInput(dateStr: string): string {
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export async function fillFormWithPlaywright(input: {
  targetUrl: string;
  grant: GrantApplicationInstance;
}): Promise<WebFillResult> {
  const { targetUrl, grant } = input;
  const mappings: WebFillResult['mappings'] = [];
  let fieldsFilled = 0;
  let fieldsSkipped = 0;

  const browser = await chromium.launch({
    headless: false,
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`[Playwright] Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for dynamic content to load
    await page.waitForTimeout(3000);
    
    // Try to detect and wait for common frameworks
    const hasReact = await page.evaluate(() => {
      return !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    });
    const hasVue = await page.evaluate(() => {
      return !!(window as any).__VUE__;
    });
    
    if (hasReact || hasVue) {
      console.log('[Playwright] Detected SPA framework, waiting for render...');
      await page.waitForTimeout(2000);
    }
    
    // Wait for network to be idle (handles AJAX)
    await page.waitForLoadState('networkidle').catch(() => {
      console.log('[Playwright] Network idle timeout, continuing...');
    });

    // Multi-page form handling loop
    let currentPage = 1;
    let hasMorePages = true;
    const maxPages = 20; // Safety limit
    const filledQuestions = new Set<string>(); // Track which questions have been filled
    
    while (hasMorePages && currentPage <= maxPages) {
      console.log(`[Playwright] Processing page ${currentPage}...`);
      
      const formFields = await extractFormFields(page);
      console.log(`[Playwright] Found ${formFields.length} form fields on page ${currentPage}`);

      // Fill fields on current page
      for (const response of grant.responses) {
        const { question_id, question_text, type, answer } = response;

        // Skip if already filled on a previous page
        if (filledQuestions.has(question_id)) {
          continue;
        }

        if (!answer || 
            (typeof answer === 'string' && answer.trim() === '') ||
            (Array.isArray(answer) && answer.length === 0)) {
          continue;
        }

        const answerLength = typeof answer === 'string' ? answer.length : 0;
        let filled = false;
        let selector = '';
        let confidence = 0;

        const effectiveType = type === 'other' ? 'text' : type;

        if (effectiveType === 'text' || effectiveType === 'number' || effectiveType === 'date' || effectiveType === 'textarea') {
          const TEXT_LIKE_TYPES = ['text', 'email', 'tel', 'url', 'search'];
          
          const candidates = formFields
            .filter(f => !f.used)
            .filter(f => {
              if (effectiveType === 'text') return TEXT_LIKE_TYPES.includes(f.type);
              if (effectiveType === 'textarea') return f.type === 'textarea' || TEXT_LIKE_TYPES.includes(f.type);
              if (effectiveType === 'number') return f.type === 'number' || f.type === 'text';
              if (effectiveType === 'date') return f.type === 'date' || f.type === 'text';
              return false;
            })
            .map(f => ({
              field: f,
              score: calculateFieldScore(question_text, f, effectiveType, answerLength)
            }))
            .filter(c => c.score >= 0.5)
            .sort((a, b) => b.score - a.score);

          if (candidates.length > 0) {
            const best = candidates[0];
            const field = best.field;
            selector = field.id ? `#${escapeSelector(field.id)}` : 
                       field.name ? `[name="${escapeSelector(field.name)}"]` : 
                       `[data-field-index="${field.index}"]`;
            
            await highlightElement(page, selector);
            try {
              let value = effectiveType === 'date' && typeof answer === 'string' 
                ? normalizeDateForInput(answer)
                : String(answer);
              
              if (field.type === 'contenteditable') {
                await page.evaluate((sel: string, val: string) => {
                  const el = document.querySelector(sel);
                  if (el) {
                    el.textContent = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }, selector, value);
              } else {
                await page.fill(selector, value, { timeout: 5000 });
              }
              
              await page.waitForTimeout(200);
              
              filled = true;
              confidence = best.score;
              field.used = true;
              filledQuestions.add(question_id); // Mark question as filled
              console.log(`[Playwright] ✓ Filled ${selector} (${confidence.toFixed(2)})`);
            } catch (error: any) {
              console.log(`[Playwright] ✗ Failed to fill ${selector}: ${error.message}`);
            }
          }
        } else if (effectiveType === 'single_choice' || effectiveType === 'yes_no') {
          const radioFields = formFields.filter(f => f.type === 'radio' && !f.used);
          const selectFields = formFields.filter(f => f.type === 'select-one' && !f.used);
          
          let bestMatch: any = null;
          let bestScore = 0;

          for (const field of radioFields) {
            const score = calculateFieldScore(question_text, field, effectiveType, 0);
            if (score > bestScore && score >= 0.5) {
              bestScore = score;
              bestMatch = { field, isRadio: true };
            }
          }

          for (const field of selectFields) {
            const score = calculateFieldScore(question_text, field, effectiveType, 0);
            if (score > bestScore && score >= 0.5) {
              bestScore = score;
              bestMatch = { field, isRadio: false };
            }
          }

          if (bestMatch?.isRadio) {
            const radioGroup = await page.locator(`input[name="${escapeSelector(bestMatch.field.name)}"]`).all();
            for (const r of radioGroup) {
              const value = await r.getAttribute('value') || '';
              const valueSim = calculateTextSimilarity(String(answer), value);
              if (valueSim >= 0.6) {
                selector = `input[name="${escapeSelector(bestMatch.field.name)}"][value="${escapeSelector(value)}"]`;
                await highlightElement(page, selector);
                await r.check();
                filled = true;
                confidence = bestScore;
                formFields.forEach(f => {
                  if (f.type === 'radio' && f.name === bestMatch.field.name) {
                    f.used = true;
                  }
                });
                filledQuestions.add(question_id); // Mark question as filled
                console.log(`[Playwright] ✓ Checked radio (${confidence.toFixed(2)})`);
                break;
              }
            }
          } else if (bestMatch && !bestMatch.isRadio) {
            selector = bestMatch.field.id ? `#${escapeSelector(bestMatch.field.id)}` : `[name="${escapeSelector(bestMatch.field.name)}"]`;
            const options = await page.locator(selector + ' option').all();
            
            for (const option of options) {
              const optionText = await option.textContent() || '';
              const optionValue = await option.getAttribute('value') || '';
              if (!optionValue) continue;
              
              const textSim = calculateTextSimilarity(String(answer), optionText);
              const valueSim = calculateTextSimilarity(String(answer), optionValue);
              
              if (textSim >= 0.6 || valueSim >= 0.6) {
                await highlightElement(page, selector);
                await page.selectOption(selector, optionValue);
                filled = true;
                confidence = bestScore;
                bestMatch.field.used = true;
                filledQuestions.add(question_id); // Mark question as filled
                console.log(`[Playwright] ✓ Selected option (${confidence.toFixed(2)})`);
                break;
              }
            }
          }
        } else if (effectiveType === 'multi_choice') {
          const answers = Array.isArray(answer) ? answer : [answer];
          const checkboxFields = formFields.filter(f => f.type === 'checkbox');
          
          const candidates = checkboxFields.map(f => ({
            field: f,
            score: calculateFieldScore(question_text, f, effectiveType, 0)
          })).filter(c => c.score >= 0.5).sort((a, b) => b.score - a.score);

          if (candidates.length > 0) {
            const bestGroup = candidates[0].field;
            const checkboxGroup = await page.locator(`input[name="${escapeSelector(bestGroup.name)}"]`).all();
            let checkedCount = 0;
            
            for (const cb of checkboxGroup) {
              const value = await cb.getAttribute('value') || '';
              const id = await cb.getAttribute('id') || '';
              
              for (const ans of answers) {
                const valueSim = calculateTextSimilarity(String(ans), value);
                if (valueSim >= 0.6) {
                  selector = id ? `#${escapeSelector(id)}` : `input[name="${escapeSelector(bestGroup.name)}"][value="${escapeSelector(value)}"]`;
                  await highlightElement(page, selector);
                  await cb.check();
                  checkedCount++;
                  if (!filled) {
                    filled = true;
                    confidence = candidates[0].score;
                  }
                }
              }
            }
            
            if (checkedCount > 0) {
              formFields.forEach(f => {
                if (f.type === 'checkbox' && f.name === bestGroup.name) {
                  f.used = true;
                }
              });
              console.log(`[Playwright] ✓ Checked ${checkedCount} boxes (${confidence.toFixed(2)})`);
            }
          }
        }

        if (filled) {
          fieldsFilled++;
          mappings.push({ question: question_text, answer, selector, confidence });
        } else {
          fieldsSkipped++;
        }

        await page.waitForTimeout(100);
      }

      // Look for "Next" or "Continue" button to navigate to next page
      console.log('[Playwright] Looking for navigation button...');
      const nextButton = await findNextButton(page);
      
      if (nextButton) {
        console.log(`[Playwright] Found navigation button, clicking...`);
        await highlightElement(page, nextButton);
        await page.waitForTimeout(500);
        
        try {
          await page.click(nextButton, { timeout: 5000 });
          
          // Wait for navigation/page update
          await page.waitForTimeout(2000);
          await page.waitForLoadState('networkidle').catch(() => {});
          
          currentPage++;
          console.log(`[Playwright] Navigated to page ${currentPage}`);
        } catch (error: any) {
          console.log(`[Playwright] Failed to click next button: ${error.message}`);
          hasMorePages = false;
        }
      } else {
        console.log('[Playwright] No navigation button found, assuming last page');
        hasMorePages = false;
      }
    }

    console.log(`[Playwright] Complete: ${fieldsFilled} filled, ${fieldsSkipped} skipped across ${currentPage} page(s)`);
    console.log('[Playwright] Browser left open for manual completion and submission');
    
    // Keep browser open indefinitely for manual completion
    // User will close it manually after submitting
    
  } catch (error) {
    console.error('[Playwright] Error:', error);
    await browser.close();
    throw error;
  }

  return { fieldsFilled, fieldsSkipped, mappings };
}

async function findNextButton(page: any): Promise<string | null> {
  return await page.evaluate(() => {
    const nextKeywords = [
      'next', 'continue', 'proceed', 'forward', 'siguiente', 'suivant',
      'weiter', 'avanti', 'próximo', 'continuar', 'continuer'
    ];
    
    // Look for buttons
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]'));
    
    for (const btn of buttons) {
      const text = (btn.textContent || '').toLowerCase().trim();
      const value = (btn as HTMLInputElement).value?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      const title = btn.getAttribute('title')?.toLowerCase() || '';
      
      const allText = `${text} ${value} ${ariaLabel} ${title}`;
      
      // Check if it's a next/continue button (not submit)
      const isNext = nextKeywords.some(kw => allText.includes(kw));
      const isSubmit = allText.includes('submit') || allText.includes('send') || 
                       allText.includes('enviar') || allText.includes('soumettre');
      
      if (isNext && !isSubmit) {
        // Generate selector
        const id = btn.id;
        const className = btn.className;
        
        if (id) return `#${id}`;
        if (className) {
          const classes = className.split(' ').filter(c => c.length > 0);
          if (classes.length > 0) return `.${classes[0]}`;
        }
        
        // Fallback: use text content
        return `button:has-text("${text}")`;
      }
    }
    
    return null;
  });
}
