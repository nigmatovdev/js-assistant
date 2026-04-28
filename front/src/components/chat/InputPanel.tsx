import { useState }               from 'react';
import type { KeyboardEvent }      from 'react';
import Box                         from '@mui/material/Box';
import TextField                   from '@mui/material/TextField';
import IconButton                  from '@mui/material/IconButton';
import Tooltip                     from '@mui/material/Tooltip';
import CircularProgress            from '@mui/material/CircularProgress';
import { useTheme }                from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import SendRoundedIcon             from '@mui/icons-material/SendRounded';
import StopCircleIcon              from '@mui/icons-material/StopCircle';
import { useChatStore }            from '../../store/chatStore';
import { useSessionStore }         from '../../store/sessionStore';
import { useSendMessage }          from '../../hooks/useSendMessage';

interface Props {
  sessionId: string | null;
}

export default function InputPanel({ sessionId }: Props) {
  const [input, setInput]  = useState('');
  const { isStreaming }    = useChatStore();
  const { createSession }  = useSessionStore();
  const { send, stop }     = useSendMessage();
  const theme              = useTheme();
  const isDark             = theme.palette.mode === 'dark';
  const hasInput           = input.trim().length > 0;

  const submit = async () => {
    const q = input.trim();
    if (!q || isStreaming) return;
    setInput('');
    let sid = sessionId;
    if (!sid) { const session = await createSession(); sid = session.id; }
    send(sid, q);
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, pb: 3, pt: 1.5 }}>
      <Box sx={{ maxWidth: 720, mx: 'auto', position: 'relative' }}>

        {/* Ambient glow behind container */}
        {(isStreaming || hasInput) && (
          <Box sx={{
            position: 'absolute', inset: -6, borderRadius: '22px', pointerEvents: 'none',
            background: isStreaming
              ? 'radial-gradient(ellipse, rgba(91,140,255,0.14) 0%, transparent 70%)'
              : 'radial-gradient(ellipse, rgba(91,140,255,0.09) 0%, transparent 70%)',
            transition: 'opacity 0.3s',
          }} />
        )}

        {/* Glass container */}
        <Box sx={{
          display: 'flex', alignItems: 'flex-end', gap: 0.75,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          bgcolor: isDark ? 'rgba(16,18,28,0.84)' : 'rgba(255,255,255,0.88)',
          border: '1px solid',
          borderColor: isStreaming
            ? 'rgba(91,140,255,0.42)'
            : isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
          borderRadius: '18px',
          px: 1.5, py: 0.9,
          boxShadow: isDark
            ? '0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset'
            : '0 8px 40px rgba(91,140,255,0.09), 0 1px 0 rgba(255,255,255,0.95) inset',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}>

          {/* Textarea */}
          <TextField
            fullWidth multiline maxRows={6} minRows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Savol bering… (Shift+Enter = yangi qator)"
            variant="standard"
            disabled={isStreaming}
            InputProps={{ disableUnderline: true }}
            sx={{
              flex: 1,
              '& .MuiInputBase-root': { fontSize: '0.94rem', lineHeight: 1.66, color: 'text.primary', py: 0.4 },
              '& .MuiInputBase-input::placeholder': { color: 'text.disabled', opacity: 1 },
            }}
          />

          {/* Stop / Send button */}
          <Box sx={{ flexShrink: 0, pb: 0.15 }}>
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <CircularProgress size={13} thickness={5} sx={{ color: 'primary.main' }} />
                  <Tooltip title="To'xtatish">
                    <IconButton
                      onClick={stop} size="small"
                      sx={{
                        color: 'error.main', borderRadius: '10px', p: 0.6,
                        border: '1px solid rgba(220,38,38,0.28)',
                        bgcolor: 'rgba(220,38,38,0.07)',
                        '&:hover': { bgcolor: 'error.main', color: '#fff', border: '1px solid transparent' },
                        transition: 'all 0.2s',
                      }}
                    >
                      <StopCircleIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Tooltip title="Yuborish (Enter)">
                    <span>
                      <IconButton
                        onClick={submit}
                        disabled={!hasInput}
                        size="small"
                        sx={{
                          borderRadius: '12px', p: 0.9,
                          background: hasInput
                            ? 'linear-gradient(135deg, #5B8CFF 0%, #7C4DFF 100%)'
                            : undefined,
                          bgcolor: hasInput ? undefined : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                          color: hasInput ? '#fff' : 'text.disabled',
                          boxShadow: hasInput ? '0 4px 16px rgba(91,140,255,0.42)' : 'none',
                          transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
                          '&:hover': {
                            background: hasInput ? 'linear-gradient(135deg, #4070E0 0%, #6B3AEA 100%)' : undefined,
                            boxShadow: hasInput ? '0 6px 22px rgba(91,140,255,0.55)' : 'none',
                            transform: hasInput ? 'scale(1.06)' : 'none',
                          },
                          '&.Mui-disabled': { opacity: 0.4 },
                        }}
                      >
                        <SendRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
