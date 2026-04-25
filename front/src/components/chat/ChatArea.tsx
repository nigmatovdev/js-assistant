import { useEffect, useRef }   from 'react';
import Box                     from '@mui/material/Box';
import Typography              from '@mui/material/Typography';
import GavelIcon               from '@mui/icons-material/Gavel';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble           from './MessageBubble';
import InputPanel              from './InputPanel';
import { useChatStore }        from '../../store/chatStore';
import { useSessionStore }     from '../../store/sessionStore';

export default function ChatArea() {
  const { messages, streamingContent, streamingSources, isStreaming } = useChatStore();
  const { activeId } = useSessionStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  if (!activeId) {
    return (
      <Box
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', gap: 2, color: 'text.secondary',
          px: 3, textAlign: 'center',
        }}
      >
        <GavelIcon sx={{ fontSize: 72, opacity: 0.2 }} />
        <Typography variant="h5" fontWeight={700} color="text.primary">
          JK AI
        </Typography>
        <Typography variant="body1" color="text.secondary">
          O'zbekiston Jinoyat Kodeksi bo'yicha savollaringizni bering
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Yangi chat boshlash uchun yuqoridagi + tugmasini bosing
        </Typography>
      </Box>
    );
  }

  const streamingMsg = isStreaming || streamingContent
    ? {
        id:         '__streaming__',
        session_id: activeId,
        role:       'assistant' as const,
        content:    streamingContent,
        sources:    streamingSources.length ? streamingSources : undefined,
        created_at: new Date().toISOString(),
      }
    : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 1, sm: 3, md: 6 }, py: 3 }}>
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageBubble message={msg} />
            </motion.div>
          ))}

          {streamingMsg && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <MessageBubble message={streamingMsg} isStreaming />
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </Box>

      <InputPanel sessionId={activeId} />
    </Box>
  );
}
