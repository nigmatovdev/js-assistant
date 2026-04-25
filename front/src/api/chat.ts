import type { SourceChunk } from '../types';

const BASE_URL = '/api';

export interface SSECallbacks {
  onToken: (token: string) => void;
  onSources: (sources: SourceChunk[]) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

export async function streamAsk(
  sessionId: string,
  question: string,
  topK: number = 5,
  callbacks: SSECallbacks,
  signal?: AbortSignal,
) {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/${sessionId}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, top_k: topK }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      callbacks.onError((err as Error).message);
    }
    return;
  }

  if (!res.ok || !res.body) {
    callbacks.onError(`HTTP ${res.status}: ${res.statusText}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6)) as {
            type: string;
            content?: string;
            sources?: SourceChunk[];
            message?: string;
          };
          if (event.type === 'token' && event.content) callbacks.onToken(event.content);
          else if (event.type === 'sources' && event.sources) callbacks.onSources(event.sources);
          else if (event.type === 'done') callbacks.onDone();
          else if (event.type === 'error') callbacks.onError(event.message ?? 'Unknown error');
        } catch {
          // malformed SSE chunk — skip
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      callbacks.onError((err as Error).message);
    }
  }
}
