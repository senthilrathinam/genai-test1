import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup } from 'pdf-lib';
import { GrantApplicationInstance, GrantResponse } from '@/types';

export async function fillPDFForm(
  pdfBuffer: Buffer,
  grant: GrantApplicationInstance
): Promise<{ filled: boolean; pdfBytes: Buffer }> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    if (fields.length === 0) {
      return { filled: false, pdfBytes: pdfBuffer };
    }

    console.log(`Found ${fields.length} form fields in PDF`);

    // Map responses by question text for matching
    const responseMap = new Map<string, GrantResponse>();
    for (const response of grant.responses) {
      responseMap.set(normalizeText(response.question_text), response);
    }

    let filledCount = 0;

    for (const field of fields) {
      const fieldName = field.getName();
      console.log(`Trying to match field: ${fieldName}`);

      // Try to find matching response
      let matchedResponse: GrantResponse | undefined;
      let bestMatchScore = 0;

      for (const response of grant.responses) {
        const score = calculateMatchScore(fieldName, response.question_text);
        if (score > bestMatchScore && score >= 0.4) {
          bestMatchScore = score;
          matchedResponse = response;
        }
      }

      if (!matchedResponse) {
        console.log(`  No match found for field: ${fieldName}`);
        continue;
      }

      console.log(`  Matched to: ${matchedResponse.question_text} (score: ${bestMatchScore})`);

      try {
        if (field instanceof PDFTextField) {
          const answer = formatAnswerForField(matchedResponse);
          if (answer) {
            const textField = field as PDFTextField;
            const maxLength = textField.getMaxLength();
            const truncated = maxLength && answer.length > maxLength 
              ? answer.substring(0, maxLength) 
              : answer;
            textField.setText(truncated);
            filledCount++;
          }
        } else if (field instanceof PDFCheckBox) {
          const answer = matchedResponse.answer;
          
          // For yes/no questions
          if (matchedResponse.type === 'yes_no' && answer === 'Yes') {
            (field as PDFCheckBox).check();
            filledCount++;
          }
          // For multi-choice, check if any selected option matches this checkbox
          else if (Array.isArray(answer)) {
            const checkboxMatched = answer.some(selectedOption => 
              normalizeText(fieldName).includes(normalizeText(selectedOption)) ||
              normalizeText(selectedOption).includes(normalizeText(fieldName))
            );
            if (checkboxMatched) {
              (field as PDFCheckBox).check();
              filledCount++;
            }
          }
        } else if (field instanceof PDFRadioGroup) {
          const answer = matchedResponse.answer as string;
          if (answer) {
            const options = (field as PDFRadioGroup).getOptions();
            const matchingOption = options.find(opt => 
              normalizeText(opt).includes(normalizeText(answer)) ||
              normalizeText(answer).includes(normalizeText(opt))
            );
            if (matchingOption) {
              (field as PDFRadioGroup).select(matchingOption);
              filledCount++;
            }
          }
        }
      } catch (fieldError) {
        console.error(`Error filling field ${fieldName}:`, fieldError);
      }
    }

    console.log(`Filled ${filledCount} out of ${fields.length} fields`);

    if (filledCount === 0) {
      return { filled: false, pdfBytes: pdfBuffer };
    }

    const pdfBytes = await pdfDoc.save();
    return { filled: true, pdfBytes: Buffer.from(pdfBytes) };
  } catch (error) {
    console.error('Error filling PDF form:', error);
    return { filled: false, pdfBytes: pdfBuffer };
  }
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function calculateMatchScore(fieldName: string, questionText: string): number {
  const normalizedField = normalizeText(fieldName);
  const normalizedQuestion = normalizeText(questionText);

  // Exact match
  if (normalizedField === normalizedQuestion) return 1.0;

  // One contains the other
  if (normalizedField.includes(normalizedQuestion)) return 0.9;
  if (normalizedQuestion.includes(normalizedField)) return 0.9;

  // Split into words and check overlap
  const fieldWords = fieldName.toLowerCase().split(/[_\s-]+/);
  const questionWords = questionText.toLowerCase().split(/\s+/);

  let matchingWords = 0;
  for (const fieldWord of fieldWords) {
    if (fieldWord.length < 3) continue; // Skip short words
    for (const questionWord of questionWords) {
      if (questionWord.includes(fieldWord) || fieldWord.includes(questionWord)) {
        matchingWords++;
        break;
      }
    }
  }

  if (fieldWords.length === 0) return 0;
  const score = matchingWords / fieldWords.length;
  
  // Require at least 2 matching words or 60% overlap for scores above 0.5
  if (score > 0.5 && matchingWords < 2 && score < 0.6) {
    return score * 0.8; // Reduce confidence
  }
  
  return score;
}

function formatAnswerForField(response: GrantResponse): string {
  const answer = response.answer;

  if (!answer || (Array.isArray(answer) && answer.length === 0)) {
    return '';
  }

  if (Array.isArray(answer)) {
    return answer.join('; ');
  }

  return answer.toString();
}
