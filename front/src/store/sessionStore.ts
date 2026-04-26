import { create } from 'zustand';
import type { Session } from '../types';
import * as api from '../api/sessions';

interface SessionState {
  sessions:  Session[];
  activeId:  string | null;
  loading:   boolean;

  fetchSessions:   () => Promise<void>;
  createSession:   () => Promise<Session>;
  deleteSession:   (id: string) => Promise<void>;
  setActive:       (id: string | null) => void;
  clearActive:     () => void;
  updateLocalTitle:(id: string, title: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeId: null,
  loading:  false,

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
    const prev = get().sessions;
    // Optimistic remove
    set(s => {
      const sessions = s.sessions.filter(x => x.id !== id);
      const activeId = s.activeId === id ? (sessions[0]?.id ?? null) : s.activeId;
      return { sessions, activeId };
    });
    try {
      await api.deleteSession(id);
    } catch {
      set({ sessions: prev });
    }
  },

  setActive: (id: string | null) => {
    if (get().activeId !== id) set({ activeId: id });
  },

  clearActive: () => {
    if (get().activeId !== null) set({ activeId: null });
  },

  updateLocalTitle: (id: string, title: string) =>
    set(s => ({
      sessions: s.sessions.map(x => (x.id === id ? { ...x, title } : x)),
    })),
}));
