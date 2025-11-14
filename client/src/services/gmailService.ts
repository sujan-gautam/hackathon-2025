// src/services/gmailService.ts
import { fetchAPI } from './api';
import { User } from '../types/user';

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  labels: string[];
  headers: Record<string, string>;
}

export interface GmailResponse {
  messages: GmailMessage[];
  nextPageToken?: string;
  total: number;
}

export const getGmailEmails = async (
  options: { pageToken?: string; limit?: number } = {}
): Promise<GmailResponse> => {
  return fetchAPI<GmailResponse>('/gmail/emails', {
    method: 'GET',
    params: options,
  });
};

export const getEmailById = async (emailId: string): Promise<GmailMessage> => {
  return fetchAPI<GmailMessage>(`/gmail/emails/${emailId}`);
};