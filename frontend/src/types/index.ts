export interface EmailSummary {
  id: string;
  sender: string;
  subject: string;
  body: string;
  summary: string;
  category: string;
  keywords: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailData {
  sender: string;
  subject: string;
  body: string;
}
