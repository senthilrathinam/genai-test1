export interface OrgExtraSection {
  id: string;
  title: string;
  content: string;
}

export interface OrganizationProfile {
  org_id: string;
  legal_name: string;
  mission_short: string;
  mission_long: string;
  address: string;
  extra_sections?: OrgExtraSection[];
}

export type QuestionType =
  | "text"
  | "textarea"
  | "single_choice"
  | "multi_choice"
  | "yes_no"
  | "number"
  | "date"
  | "other";

export interface GrantResponse {
  question_id: string;
  question_text: string;
  type: QuestionType;
  options?: string[];
  answer: string | string[];
  required?: boolean;
  char_limit?: number;
  depends_on?: string;
  depends_value?: string | string[];
  reviewed: boolean;
  needs_manual_input?: boolean;
}

export interface GrantApplicationInstance {
  grant_id: string;
  grant_name: string;
  grant_url: string;
  portal_url?: string; // Separate URL for web form filling (if different from grant_url)
  status: 'draft' | 'ready' | 'filled' | 'submitted';
  created_at: string;
  updated_at: string;
  responses: GrantResponse[];
  source_type?: 'pdf' | 'web' | 'docx';
  source_file_key?: string;
  export_file_key?: string;
}
