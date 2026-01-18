import { NextRequest, NextResponse } from 'next/server';
import { addSubmission, getSubmissions } from '@/app/test-portal/store';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  
  const data: Record<string, any> = {};
  
  for (const [key, value] of formData.entries()) {
    if (key === 'grade_levels') {
      if (!data.grade_levels) {
        data.grade_levels = [];
      }
      data.grade_levels.push(value);
    } else {
      data[key] = value;
    }
  }
  
  const submission = {
    timestamp: new Date().toISOString(),
    path: '/test-portal/basic-grant',
    data
  };
  
  console.log('Adding submission:', submission);
  addSubmission(submission);
  console.log('Total submissions:', getSubmissions().length);
  
  return NextResponse.redirect(new URL('/test-portal/submissions', request.url));
}
