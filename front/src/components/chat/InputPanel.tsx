import { useState }            from 'react';
import type { KeyboardEvent }  from 'react';
import Box                     from '@mui/material/Box';
import Paper                   from '@mui/material/Paper';
import TextField               from '@mui/material/TextField';
import IconButton              from '@mui/material/IconButton';
import Tooltip                 from '@mui/material/Tooltip';
import Chip                    from '@mui/material/Chip';
import CircularProgress        from '@mui/material/CircularProgress';
import SendRoundedIcon         from '@mui/icons-material/SendRounded';
import StopCircleIcon          from '@mui/icons-material/StopCircle';
import ManageSearchIcon        from '@mui/icons-material/ManageSearch';
import { useChatStore }        from '../../store/chatStore';
import { useSendMessage }      from '../../hooks/useSendMessage';

interface Props {
  sessionId: string;
}

export default function InputPanel({ sessionId }: Props) {
  const [input, setInput]     = useState('');
  const [ragMode, setRagMode] = useState(true);
  const { isStreaming }       = useChatStore();
  const { send, stop }        = useSendMessage();

  const submit = () => {
    const q = input.trim();
    if (!q || isStreaming) return;
    setInput('');
    send(sessionId, q, ragMode ? 5 : 2);
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 3, md: 6 },
        py: 2,
        bgcolor: 'background.default',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 760, mx: 'auto',
          border: 1,
          borderColor: isStreaming ? 'primary.main' : 'divider',
          borderRadius: 4,
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: isStreaming
            ? '0 0 0 3px rgba(37,99,235,0.15)'
            : '0 2px 16px rgba(0,0,0,0.06)',
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={6}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Savol bering… (Shift+Enter yangi qator)"
          variant="standard"
          disabled={isStreaming}
          InputProps={{ disableUnderline: true }}
          sx={{
            px: 2.5, pt: 1.75, pb: 0.5,
            '& .MuiInputBase-root': { fontSize: '0.95rem', lineHeight: 1.7 },
          }}
        />

        {/* Bottom toolbar */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, pb: 1, gap: 1 }}>
          <Chip
            icon={<ManageSearchIcon sx={{ fontSize: '16px !important' }} />}
            label="RAG"
            size="small"
            color={ragMode ? 'primary' : 'default'}
            variant={ragMode ? 'filled' : 'outlined'}
            onClick={() => setRagMode(m => !m)}
            sx={{ borderRadius: 2, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
          />

          <Box sx={{ flex: 1 }} />

          {isStreaming ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} thickness={5} />
              <Tooltip title="To'xtatish">
                <IconButton onClick={stop} size="small" sx={{ color: 'error.main' }}>
                  <StopCircleIcon />
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
                    bgcolor: input.trim() ? 'primary.main' : 'action.disabledBackground',
                    color: input.trim() ? '#fff' : 'action.disabled',
                    borderRadius: 2,
                    p: 0.75,
                    '&:hover': { bgcolor: 'primary.dark' },
                    transition: 'all 0.15s',
                  }}
                >
                  <SendRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
