import { useEffect, useRef }        from 'react';
import Box                          from '@mui/material/Box';
import { motion, AnimatePresence }  from 'framer-motion';
import MessageBubble                from './MessageBubble';
import ThinkingBubble               from './ThinkingBubble';
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
    if (!sid) { const session = await createSession(); sid = session.id; }
    send(sid, question);
  };

  const streamingMsg = isStreaming || streamingContent
    ? {
        id:         '__streaming__',
        session_id: activeId ?? '',
        role:       'assistant' as const,
        content:    streamingContent,
        sources:    streamingSources.length ? streamingSources : undefined,
        created_at: new Date().toISOString(),
      }
    : null;

  const isWelcome = !activeId && messages.length === 0 && !streamingMsg;

  if (isWelcome) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: 'background.default',
          overflowY: 'auto',
        }}
      >
        {/* Equal spacer above — matches the spacer below the cards */}
        <Box sx={{ flex: 1, minHeight: 24 }} />
        <WelcomeScreen onSuggest={handleSuggest} />
        {/* Equal spacer below cards — same flex weight as top spacer */}
        <Box sx={{ flex: 1, minHeight: 24 }} />
        <InputPanel sessionId={activeId} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <Box sx={{ px: { xs: 2, sm: 4, md: 8 }, py: 3 }}>
          <Box sx={{ maxWidth: 720, mx: 'auto' }}>
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

              {isStreaming && !streamingContent && (
                <motion.div
                  key="thinking"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <ThinkingBubble />
                </motion.div>
              )}

              {streamingMsg && streamingContent && (
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
      </Box>

      <InputPanel sessionId={activeId} />
    </Box>
  );
}
