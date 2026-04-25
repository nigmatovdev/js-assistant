import { create } from 'zustand';
import type { Message, SourceChunk } from '../types';

interface ChatState {
  messages: Message[];
  streamingContent: string;
  streamingSources: SourceChunk[];
  isStreaming: boolean;
  currentSessionId: string | null;

  loadMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  startStreaming: (userMsg: Message) => void;
  appendToken: (token: string) => void;
  setSources: (sources: SourceChunk[]) => void;
  finalizeStreaming: () => void;
  setStreamingError: (msg: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  streamingContent: '',
  streamingSources: [],
  isStreaming: false,
  currentSessionId: null,

  loadMessages: (messages) =>
    set({ messages, streamingContent: '', streamingSources: [], isStreaming: false }),

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

  finalizeStreaming: () =>
    set(s => ({
      messages: [
        ...s.messages,
        {
          id: crypto.randomUUID(),
          session_id: s.currentSessionId ?? '',
          role: 'assistant' as const,
          content: s.streamingContent,
          sources: s.streamingSources.length ? s.streamingSources : undefined,
          created_at: new Date().toISOString(),
        },
      ],
      streamingContent: '',
      streamingSources: [],
      isStreaming: false,
    })),

  setStreamingError: (msg) =>
    set(s => ({
      messages: [
        ...s.messages,
        {
          id: crypto.randomUUID(),
          session_id: s.currentSessionId ?? '',
          role: 'assistant' as const,
          content: `Xatolik yuz berdi: ${msg}`,
          created_at: new Date().toISOString(),
        },
      ],
      streamingContent: '',
      streamingSources: [],
      isStreaming: false,
    })),
}));
