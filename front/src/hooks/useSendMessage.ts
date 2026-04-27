import { useRef }          from 'react';
import { streamAsk }       from '../api/chat';
import { useChatStore }    from '../store/chatStore';
import { useSessionStore } from '../store/sessionStore';
import { useModelStore }   from '../store/modelStore';

export function useSendMessage() {
  const abortRef = useRef<AbortController | null>(null);
  const { appendToken, setSources, finalizeStreaming, setStreamingError, startStreaming } = useChatStore();
  const { updateLocalTitle, sessions } = useSessionStore();
  const { modelId }                    = useModelStore();

  const send = async (sessionId: string, question: string, topK = 5) => {
    if (!question.trim()) return;
    if (useChatStore.getState().isStreaming) return;

    startStreaming({
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    });

    const controller = new AbortController();
    abortRef.current = controller;

    await streamAsk(sessionId, question, topK, modelId, {
      onToken: appendToken,
      onSources: setSources,
      onDone: () => {
        finalizeStreaming();
        const session = sessions.find(s => s.id === sessionId);
        if (session && !session.title) updateLocalTitle(sessionId, question.slice(0, 60));
      },
      onError: setStreamingError,
    }, controller.signal);
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  return { send, stop };
}
