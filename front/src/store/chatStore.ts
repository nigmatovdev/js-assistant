import { create }                from 'zustand';
import type { Message, MessageMeta, SourceChunk } from '../types';
import { useSessionStore }      from './sessionStore';

interface StreamingMeta {
  provider:   'local' | 'api';
  modelLabel: string;
  startedAt:  number;
}

interface ChatState {
  messages: Message[];
  streamingContent: string;
  streamingSources: SourceChunk[];
  streamingMeta:    StreamingMeta | null;
  isStreaming: boolean;
  currentSessionId: string | null;

  loadMessages:      (messages: Message[], sessionId?: string) => void;
  clearMessages:     () => void;
  startStreaming:    (userMsg: Message) => void;
  setStreamingMeta:  (meta: StreamingMeta) => void;
  appendToken:       (token: string) => void;
  setSources:        (sources: SourceChunk[]) => void;
  finalizeStreaming:  () => void;
  cancelStreaming:    () => void;
  setStreamingError: (msg: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  streamingContent: '',
  streamingSources: [],
  streamingMeta:    null,
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
    set({ messages: [], streamingContent: '', streamingSources: [], streamingMeta: null, isStreaming: false, currentSessionId: null }),

  startStreaming: (userMsg) =>
    set(s => ({
      messages: [...s.messages, userMsg],
      streamingContent: '',
      streamingSources: [],
      streamingMeta: null,
      isStreaming: true,
      currentSessionId: userMsg.session_id,
    })),

  setStreamingMeta: (meta) => set({ streamingMeta: meta }),

  appendToken: (token) =>
    set(s => ({ streamingContent: s.streamingContent + token })),

  setSources: (sources) => set({ streamingSources: sources }),

  cancelStreaming: () =>
    set({ streamingContent: '', streamingSources: [], streamingMeta: null, isStreaming: false, currentSessionId: null }),

  // Only append the assistant message when the user is still on the session that
  // owns this stream. If they switched away, the backend has already saved the
  // message — loadMessages will fetch it when they return.
  finalizeStreaming: () =>
    set(s => {
      const streamClear = { streamingContent: '', streamingSources: [], streamingMeta: null, isStreaming: false };
      const activeId    = useSessionStore.getState().activeId;

      if (s.currentSessionId !== activeId) {
        return streamClear;
      }

      const meta: MessageMeta | undefined = s.streamingMeta
        ? {
            provider:   s.streamingMeta.provider,
            modelLabel: s.streamingMeta.modelLabel,
            elapsed_ms: Date.now() - s.streamingMeta.startedAt,
          }
        : undefined;

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
            meta,
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
