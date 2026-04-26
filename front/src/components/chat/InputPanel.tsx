import { useState, useRef }       from 'react';
import type { KeyboardEvent }     from 'react';
import Box                        from '@mui/material/Box';
import TextField                  from '@mui/material/TextField';
import IconButton                 from '@mui/material/IconButton';
import Tooltip                    from '@mui/material/Tooltip';
import CircularProgress           from '@mui/material/CircularProgress';
import SendRoundedIcon            from '@mui/icons-material/SendRounded';
import StopCircleIcon             from '@mui/icons-material/StopCircle';
import AttachFileIcon             from '@mui/icons-material/AttachFile';
import { useChatStore }           from '../../store/chatStore';
import { useSessionStore }        from '../../store/sessionStore';
import { useSendMessage }         from '../../hooks/useSendMessage';

interface Props {
  sessionId: string | null;
}

export default function InputPanel({ sessionId }: Props) {
  const [input, setInput]  = useState('');
  const fileRef            = useRef<HTMLInputElement>(null);
  const { isStreaming }    = useChatStore();
  const { createSession }  = useSessionStore();
  const { send, stop }     = useSendMessage();

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
    <Box sx={{ px: { xs: 2, sm: 4, md: 8 }, pb: 2.5, pt: 1.5, bgcolor: 'background.default' }}>
      <Box
        sx={{
          maxWidth: 720,
          mx: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          border: 1.5,
          borderColor: isStreaming ? 'primary.main' : 'divider',
          borderRadius: 6,
          px: 1.25,
          py: 0.75,
          bgcolor: 'background.paper',
          transition: 'border-color 0.25s, box-shadow 0.25s',
          boxShadow: isStreaming
            ? '0 0 0 4px rgba(37,99,235,0.12), 0 4px 24px rgba(0,0,0,0.08)'
            : '0 2px 20px rgba(0,0,0,0.07)',
        }}
      >
        {/* Paperclip */}
        <input ref={fileRef} type="file" hidden />
        <Tooltip title="Fayl biriktirish (tez orada)">
          <span>
            <IconButton size="small" disabled sx={{ color: 'text.disabled', p: 0.5, flexShrink: 0 }}>
              <AttachFileIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </span>
        </Tooltip>

        {/* Text input */}
        <TextField
          fullWidth
          multiline
          maxRows={6}
          minRows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Savol bering…"
          variant="standard"
          disabled={isStreaming}
          InputProps={{ disableUnderline: true }}
          sx={{
            flex: 1,
            '& .MuiInputBase-root': {
              fontSize: '0.95rem',
              lineHeight: 1.65,
              color: 'text.primary',
              py: 0.4,
            },
            '& .MuiInputBase-input::placeholder': {
              color: 'text.disabled',
              opacity: 1,
            },
          }}
        />

        {/* Stop / Send */}
        {isStreaming ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <CircularProgress size={14} thickness={5} sx={{ color: 'primary.main' }} />
            <Tooltip title="To'xtatish">
              <IconButton
                onClick={stop}
                size="small"
                sx={{
                  color: 'error.main',
                  border: 1,
                  borderColor: 'error.light',
                  borderRadius: 2,
                  p: 0.5,
                  '&:hover': { bgcolor: 'error.main', color: '#fff' },
                }}
              >
                <StopCircleIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Tooltip title="Yuborish (Enter)">
            <span>
              <IconButton
                onClick={submit}
                disabled={!input.trim()}
                size="small"
                sx={{
                  flexShrink: 0,
                  borderRadius: 2.5,
                  p: 0.75,
                  background: input.trim()
                    ? 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)'
                    : undefined,
                  bgcolor: input.trim() ? undefined : 'action.disabledBackground',
                  color: input.trim() ? '#fff' : 'action.disabled',
                  boxShadow: input.trim() ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: input.trim()
                      ? 'linear-gradient(135deg, #1D4ED8 0%, #6D28D9 100%)'
                      : undefined,
                    boxShadow: input.trim() ? '0 6px 20px rgba(37,99,235,0.45)' : 'none',
                  },
                  '&.Mui-disabled': { opacity: 0.5 },
                }}
              >
                <SendRoundedIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
