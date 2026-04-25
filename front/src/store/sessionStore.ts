import { create } from 'zustand';
import type { Session } from '../types';
import * as api from '../api/sessions';

interface SessionState {
  sessions: Session[];
  activeId: string | null;
  loading: boolean;

  fetchSessions: () => Promise<void>;
  createSession: () => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  setActive: (id: string) => void;
  updateLocalTitle: (id: string, title: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeId: null,
  loading: false,

  fetchSessions: async () => {
    set({ loading: true });
    try {
      const sessions = await api.listSessions();
      set({ sessions, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createSession: async () => {
    const session = await api.createSession();
    set(s => ({ sessions: [session, ...s.sessions], activeId: session.id }));
    return session;
  },

  deleteSession: async (id: string) => {
    await api.deleteSession(id);
    set(s => {
      const sessions = s.sessions.filter(x => x.id !== id);
      const activeId = s.activeId === id ? (sessions[0]?.id ?? null) : s.activeId;
      return { sessions, activeId };
    });
  },

  setActive: (id: string) => {
    if (get().activeId !== id) set({ activeId: id });
  },

  updateLocalTitle: (id: string, title: string) =>
    set(s => ({
      sessions: s.sessions.map(x => (x.id === id ? { ...x, title } : x)),
    })),
}));
