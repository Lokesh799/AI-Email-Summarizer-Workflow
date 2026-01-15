import axios from 'axios';
import { EmailSummary, EmailData } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const emailService = {
  async getSummaries(category?: string): Promise<EmailSummary[]> {
    const params = category ? { category } : {};
    const response = await api.get<{ data: EmailSummary[] }>('/summaries', { params });
    return response.data.data;
  },

  async getSummaryById(id: string): Promise<EmailSummary> {
    const response = await api.get<{ data: EmailSummary }>(`/summaries/${id}`);
    return response.data.data;
  },

  async createSummary(email: EmailData): Promise<EmailSummary> {
    const response = await api.post<{ data: EmailSummary }>('/summaries', email);
    return response.data.data;
  },

  async batchCreateSummaries(emails: EmailData[]): Promise<EmailSummary[]> {
    const response = await api.post<{ data: EmailSummary[] }>('/summaries/batch', { emails });
    return response.data.data;
  },

  async loadMockEmails(): Promise<EmailSummary[]> {
    const response = await api.post<{ data: EmailSummary[] }>('/mock/load');
    return response.data.data;
  },

  async reSummarize(id: string): Promise<EmailSummary> {
    const response = await api.post<{ data: EmailSummary }>(`/summaries/${id}/resummarize`);
    return response.data.data;
  },

  async deleteSummary(id: string): Promise<void> {
    await api.delete(`/summaries/${id}`);
  },

  async exportSummaries(category?: string): Promise<void> {
    const params = category ? { category } : {};
    const response = await api.get('/summaries/export', {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-summaries-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
