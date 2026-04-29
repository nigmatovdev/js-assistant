import type { Session, SessionSearchResult, SessionWithMessages } from '../types';
import { apiFetch } from './client';

export const listSessions = () =>
  apiFetch<Session[]>('/sessions');

export const createSession = (title?: string) =>
  apiFetch<Session>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

export const getSession = (id: string) =>
  apiFetch<SessionWithMessages>(`/sessions/${id}`);

export const updateSessionTitle = (id: string, title: string) =>
  apiFetch<Session>(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });

export const deleteSession = (id: string) =>
  apiFetch<void>(`/sessions/${id}`, { method: 'DELETE' });

export const searchSessions = (q: string) =>
  apiFetch<SessionSearchResult[]>(`/sessions/search?q=${encodeURIComponent(q)}`);
