import { create }                from 'zustand';
import type { Message, SourceChunk } from '../types';
import { useSessionStore }      from './sessionStore';

interface ChatState {
  messages: Message[];
  streamingContent: string;
  streamingSources: SourceChunk[];
  isStreaming: boolean;
  currentSessionId: string | null;

  loadMessages: (messages: Message[], sessionId?: string) => void;
  clearMessages: () => void;
  startStreaming: (userMsg: Message) => void;
  appendToken: (token: string) => void;
  setSources: (sources: SourceChunk[]) => void;
  finalizeStreaming: () => void;
  cancelStreaming: () => void;
  setStreamingError: (msg: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  streamingContent: '',
  streamingSources: [],
  isStreaming: false,
  currentSessionId: null,

  // sessionId = which session these messages belong to.
  // If a stream is active for that exact session, skip entirely — startStreaming
  // already added the user message and the store is ahead of what the backend has.
  // If streaming for a different session, update messages but keep streaming state.
  loadMessages: (messages, sessionId) =>
    set(s => {
      if (s.isStreaming && s.currentSessionId === sessionId) return {};
      return {
        messages,
        ...(s.isStreaming
          ? {}
          : { streamingContent: '', streamingSources: [], isStreaming: false, currentSessionId: null }),
      };
    }),

  clearMessages: () =>
    set({ messages: [], streamingContent: '', streamingSources: [], isStreaming: false, currentSessionId: null }),

  startStreaming: (userMsg) =>
    set(s => ({
      messages: [...s.messages, userMsg],
      streamingContent: '',
      streamingSources: [],
      isStreaming: true,
      currentSessionId: userMsg.session_id,
    })),

  appendToken: (token) =>
    set(s => ({ streamingContent: s.streamingContent + token })),

  setSources: (sources) => set({ streamingSources: sources }),

  cancelStreaming: () =>
    set({ streamingContent: '', streamingSources: [], isStreaming: false, currentSessionId: null }),

  // Only append the assistant message when the user is still on the session that
  // owns this stream. If they switched away, the backend has already saved the
  // message — loadMessages will fetch it when they return.
  finalizeStreaming: () =>
    set(s => {
      const streamClear = { streamingContent: '', streamingSources: [], isStreaming: false };
      const activeId    = useSessionStore.getState().activeId;

      if (s.currentSessionId !== activeId) {
        // User navigated away — clear stream state. Response is saved by backend.
        return streamClear;
      }

      return {
        ...streamClear,
        messages: [
          ...s.messages,
          {
            id:         crypto.randomUUID(),
            session_id: s.currentSessionId ?? '',
            role:       'assistant' as const,
            content:    s.streamingContent,
            sources:    s.streamingSources.length ? s.streamingSources : undefined,
            created_at: new Date().toISOString(),
          },
        ],
      };
    }),

  setStreamingError: (msg) =>
    set(s => {
      const streamClear = { streamingContent: '', streamingSources: [], isStreaming: false };
      const activeId    = useSessionStore.getState().activeId;

      if (s.currentSessionId !== activeId) return streamClear;

      return {
        ...streamClear,
        messages: [
          ...s.messages,
          {
            id:         crypto.randomUUID(),
            session_id: s.currentSessionId ?? '',
            role:       'assistant' as const,
            content:    `Xatolik yuz berdi: ${msg}`,
            created_at: new Date().toISOString(),
          },
        ],
      };
    }),
}));
