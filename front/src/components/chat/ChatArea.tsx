import { useEffect, useRef }        from 'react';
import Box                          from '@mui/material/Box';
import { motion, AnimatePresence }  from 'framer-motion';
import MessageBubble                from './MessageBubble';
import InputPanel                   from './InputPanel';
import WelcomeScreen                from './WelcomeScreen';
import { useChatStore }             from '../../store/chatStore';
import { useSessionStore }          from '../../store/sessionStore';
import { useSendMessage }           from '../../hooks/useSendMessage';

export default function ChatArea() {
  const { messages, streamingContent, streamingSources, isStreaming } = useChatStore();
  const { activeId, createSession }                                   = useSessionStore();
  const { send }                                                       = useSendMessage();
  const bottomRef                                                      = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  const handleSuggest = async (question: string) => {
    let sid = activeId;
    if (!sid) {
      const session = await createSession();
      sid = session.id;
    }
    send(sid, question);
  };

  if (!activeId) {
    return <WelcomeScreen onSuggest={handleSuggest} />;
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
      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 1, sm: 3, md: 6 }, py: 3 }}>
        <Box sx={{ maxWidth: 760, mx: 'auto' }}>
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
              >
                <MessageBubble message={msg} />
              </motion.div>
            ))}

            {streamingMsg && (
              <motion.div
                key="streaming"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
              >
                <MessageBubble message={streamingMsg} isStreaming />
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </Box>
      </Box>

      <InputPanel sessionId={activeId} />
    </Box>
  );
}
