import { GrantApplicationInstance } from '@/types';

export const mockGrants: Record<string, GrantApplicationInstance> = {
  'grant-1': {
    grant_id: 'grant-1',
    grant_name: 'Community Arts Grant 2025',
    grant_url: 'https://example.com/grants/arts-2025',
    status: 'draft',
    created_at: '2025-11-20T10:00:00Z',
    updated_at: '2025-11-20T10:00:00Z',
    responses: [
      {
        question_id: 'q1',
        question_text: 'Describe your organization\'s mission and primary activities.',
        type: 'textarea' as const,
        answer: 'Our organization focuses on providing accessible arts education to underserved communities through workshops, exhibitions, and mentorship programs.',
        reviewed: false,
      },
      {
        question_id: 'q2',
        question_text: 'What is the total budget for this project?',
        type: 'text' as const,
        answer: '$50,000',
        reviewed: false,
      },
      {
        question_id: 'q3',
        question_text: 'How will you measure the success of this project?',
        type: 'textarea' as const,
        answer: 'We will track participant enrollment, completion rates, and conduct post-program surveys to measure community impact and skill development.',
        reviewed: false,
      },
    ],
  },
  'grant-2': {
    grant_id: 'grant-2',
    grant_name: 'Environmental Sustainability Fund',
    grant_url: 'https://example.com/grants/env-2025',
    status: 'ready',
    created_at: '2025-11-15T14:30:00Z',
    updated_at: '2025-11-15T14:30:00Z',
    responses: [
      {
        question_id: 'q1',
        question_text: 'What environmental challenge does your project address?',
        type: 'textarea' as const,
        answer: 'Our project addresses urban heat islands by planting native trees and creating green spaces in low-income neighborhoods.',
        reviewed: true,
      },
    ],
  },
};

let nextGrantId = 3;

export function getAllGrants(): GrantApplicationInstance[] {
  return Object.values(mockGrants);
}

export function getGrantById(id: string): GrantApplicationInstance | undefined {
  return mockGrants[id];
}

export function createGrant(name: string, url?: string): GrantApplicationInstance {
  const grantId = `grant-${nextGrantId++}`;
  const newGrant: GrantApplicationInstance = {
    grant_id: grantId,
    grant_name: name,
    grant_url: url || '',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    responses: [
      {
        question_id: 'q1',
        question_text: 'Sample question: What is your organization about?',
        type: 'textarea' as const,
        answer: 'Draft answer will be generated here...',
        reviewed: false,
      },
    ],
  };
  mockGrants[grantId] = newGrant;
  return newGrant;
}
