import { useRef }                          from 'react';
import { streamAsk }                       from '../api/chat';
import { useChatStore }                    from '../store/chatStore';
import { useSessionStore }                 from '../store/sessionStore';
import { useModelStore, LOCAL_MODELS, API_MODELS } from '../store/modelStore';

export function useSendMessage() {
  const abortRef = useRef<AbortController | null>(null);
  const { appendToken, setSources, finalizeStreaming, setStreamingError, startStreaming, setStreamingMeta } = useChatStore();
  const { updateLocalTitle, sessions } = useSessionStore();
  const { provider, localModelId, apiModelId } = useModelStore();
  const modelId    = provider === 'local' ? localModelId : apiModelId;
  const models     = provider === 'local' ? LOCAL_MODELS : API_MODELS;
  const modelLabel = models.find(m => m.id === modelId)?.label ?? modelId;

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

    setStreamingMeta({ provider, modelLabel, startedAt: Date.now() });

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
    }, controller.signal, provider);
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  return { send, stop };
}
