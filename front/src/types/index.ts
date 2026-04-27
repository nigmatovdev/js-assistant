export interface SourceChunk {
  id: string;
  text: string;
  metadata: {
    modda: string;
    title: string;
    [key: string]: string;
  };
  score: number;
}

export interface MessageMeta {
  provider:    'local' | 'api';
  modelLabel:  string;
  elapsed_ms:  number;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceChunk[];
  created_at: string;
  meta?: MessageMeta;
}

export interface Session {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface SessionWithMessages extends Session {
  messages: Message[];
}
