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

const scrollbarSx = {
  scrollbarWidth: 'thin' as const,
  scrollbarColor: 'rgba(128,128,128,0.2) transparent',
  '&::-webkit-scrollbar': { width: '5px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': { borderRadius: '4px', bgcolor: 'rgba(128,128,128,0.2)' },
  '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'rgba(128,128,128,0.38)' },
};

const msgVariants = {
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
};

export default function ChatArea() {
  const { messages, streamingContent, streamingSources, isStreaming, currentSessionId } = useChatStore();
  const { activeId, createSession }                                                      = useSessionStore();
  const { send }                                                                         = useSendMessage();
  const bottomRef                                                                        = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  const handleSuggest = async (question: string) => {
    let sid = activeId;
    if (!sid) { const session = await createSession(); sid = session.id; }
    send(sid, question);
  };

  const isMyStream   = !!currentSessionId && currentSessionId === activeId;
  const streamingMsg = isMyStream && (isStreaming || streamingContent)
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
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', ...scrollbarSx }}>
        <Box sx={{ flex: '0 1 100px' }} />
        <WelcomeScreen onSuggest={handleSuggest} />
        <Box sx={{ flex: 1 }} />
        <InputPanel sessionId={activeId} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, ...scrollbarSx }}>
        <Box sx={{ px: { xs: 2, sm: 4, md: 8 }, py: 3 }}>
          <Box sx={{ maxWidth: 720, mx: 'auto' }}>
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={msgVariants.initial}
                  animate={msgVariants.animate}
                  transition={msgVariants.transition}
                >
                  <MessageBubble message={msg} />
                </motion.div>
              ))}

              {isMyStream && isStreaming && !streamingContent && (
                <motion.div
                  key="thinking"
                  initial={msgVariants.initial}
                  animate={msgVariants.animate}
                  transition={msgVariants.transition}
                >
                  <ThinkingBubble />
                </motion.div>
              )}

              {streamingMsg && streamingContent && (
                <motion.div
                  key="streaming"
                  initial={msgVariants.initial}
                  animate={msgVariants.animate}
                  transition={msgVariants.transition}
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
