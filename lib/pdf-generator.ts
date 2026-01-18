import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { GrantApplicationInstance, GrantResponse } from '@/types';

export async function generateFilledPDF(
  grant: GrantApplicationInstance,
  orgName: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Header
  page.drawText(grant.grant_name, {
    x: margin,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  page.drawText(`Organization: ${orgName}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 20;

  page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 40;

  // Responses
  for (const response of grant.responses) {
    // Check if we need a new page
    if (y < 100) {
      page = pdfDoc.addPage([612, 792]);
      y = height - margin;
    }

    // Question
    const questionLines = wrapText(response.question_text, width - 2 * margin, 11, boldFont);
    for (const line of questionLines) {
      if (y < 100) {
        page = pdfDoc.addPage([612, 792]);
        y = height - margin;
      }
      page.drawText(line, {
        x: margin,
        y,
        size: 11,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      y -= 16;
    }

    // Answer
    const answerText = formatAnswer(response);
    const answerLines = wrapText(answerText, width - 2 * margin - 10, 10, font);
    
    for (const line of answerLines) {
      if (y < 100) {
        page = pdfDoc.addPage([612, 792]);
        y = height - margin;
      }
      
      // Parse and render bold text
      drawTextWithBold(page, line, margin + 10, y, 10, font, boldFont);
      y -= 14;
    }

    y -= 20; // Space between questions
  }

  return Buffer.from(await pdfDoc.save());
}

function formatAnswer(response: GrantResponse): string {
  if (!response.answer || (Array.isArray(response.answer) && response.answer.length === 0)) {
    return '(No answer provided)';
  }

  switch (response.type) {
    case 'single_choice':
    case 'yes_no':
    case 'text':
    case 'textarea':
    case 'number':
    case 'date':
      return `Answer: ${response.answer}`;
    
    case 'multi_choice':
      if (Array.isArray(response.answer)) {
        return 'Answer:\n' + response.answer.map(opt => `  • ${opt}`).join('\n');
      }
      return `Answer: ${response.answer}`;
    
    default:
      return `Answer: ${Array.isArray(response.answer) ? response.answer.join(', ') : response.answer}`;
  }
}

function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
  const avgCharWidth = fontSize * 0.5;
  const maxChars = Math.floor(maxWidth / avgCharWidth);
  
  // Split by newlines first to preserve them
  const paragraphs = text.split('\n');
  const allLines: string[] = [];
  
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      allLines.push(''); // Preserve empty lines
      continue;
    }
    
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length > maxChars && currentLine) {
        allLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      allLines.push(currentLine);
    }
  }

  return allLines.length > 0 ? allLines : [text];
}

function drawTextWithBold(page: any, text: string, x: number, y: number, size: number, regularFont: any, boldFont: any) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  let currentX = x;
  
  for (const part of parts) {
    if (!part) continue;
    
    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold text
      const boldText = part.slice(2, -2);
      page.drawText(boldText, {
        x: currentX,
        y,
        size,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentX += boldText.length * size * 0.5;
    } else {
      // Regular text
      page.drawText(part, {
        x: currentX,
        y,
        size,
        font: regularFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      currentX += part.length * size * 0.5;
    }
  }
}
