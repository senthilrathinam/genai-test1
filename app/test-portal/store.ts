// In-memory store for test portal submissions
export interface Submission {
  timestamp: string;
  path: string;
  data: Record<string, any>;
}

// Use global to persist across hot reloads in development
const globalForStore = globalThis as unknown as {
  submissions: Submission[] | undefined;
};

const submissions = globalForStore.submissions ?? [];
globalForStore.submissions = submissions;

export function addSubmission(submission: Submission) {
  submissions.push(submission);
}

export function getSubmissions(): Submission[] {
  return submissions;
}
