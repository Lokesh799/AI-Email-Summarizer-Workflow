export interface InvoiceItem {
  item: string;
  price: number;
  quantity?: number;
  total?: number;
}

export interface InvoiceData {
  items: InvoiceItem[];
  total: number;
  currency: string;
}

export interface EmailSummary {
  id: string;
  sender: string;
  subject: string;
  body: string;
  summary: string;
  category: string;
  keywords: string[] | null;
  invoiceData: InvoiceData | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailData {
  sender: string;
  subject: string;
  body: string;
}
