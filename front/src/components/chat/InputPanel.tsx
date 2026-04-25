import { useState, useRef }       from 'react';
import type { KeyboardEvent }     from 'react';
import Box                        from '@mui/material/Box';
import Paper                      from '@mui/material/Paper';
import TextField                  from '@mui/material/TextField';
import IconButton                 from '@mui/material/IconButton';
import Tooltip                    from '@mui/material/Tooltip';
import FormControlLabel           from '@mui/material/FormControlLabel';
import Switch                     from '@mui/material/Switch';
import Typography                 from '@mui/material/Typography';
import CircularProgress           from '@mui/material/CircularProgress';
import SendIcon                   from '@mui/icons-material/Send';
import AttachFileIcon             from '@mui/icons-material/AttachFile';
import StopIcon                   from '@mui/icons-material/Stop';
import { streamAsk }              from '../../api/chat';
import { useChatStore }           from '../../store/chatStore';
import { useSessionStore }        from '../../store/sessionStore';

interface Props {
  sessionId: string;
}

export default function InputPanel({ sessionId }: Props) {
  const [input, setInput]     = useState('');
  const [ragMode, setRagMode] = useState(true);
  const abortRef              = useRef<AbortController | null>(null);

  const { isStreaming, startStreaming, appendToken, setSources, finalizeStreaming, setStreamingError } =
    useChatStore();
  const { updateLocalTitle, sessions } = useSessionStore();

  const send = async () => {
    const q = input.trim();
    if (!q || isStreaming) return;
    setInput('');

    startStreaming({
      id:         crypto.randomUUID(),
      session_id: sessionId,
      role:       'user',
      content:    q,
      created_at: new Date().toISOString(),
    });

    const controller = new AbortController();
    abortRef.current = controller;

    await streamAsk(
      sessionId,
      q,
      ragMode ? 5 : 3,
      {
        onToken:   appendToken,
        onSources: setSources,
        onDone: () => {
          finalizeStreaming();
          const session = sessions.find(s => s.id === sessionId);
          if (session && !session.title) updateLocalTitle(sessionId, q.slice(0, 60));
        },
        onError: setStreamingError,
      },
      controller.signal,
    );
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <Paper
      elevation={0}
      sx={{ borderTop: 1, borderColor: 'divider', px: 2, py: 1.5 }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Tooltip title="Hujjat yuklash (tez orada)">
          <span>
            <IconButton size="small" disabled>
              <AttachFileIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={ragMode}
              onChange={e => setRagMode(e.target.checked)}
              color="primary"
            />
          }
          label={<Typography variant="caption" color="text.secondary">RAG rejim</Typography>}
          sx={{ ml: 0 }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          fullWidth
          multiline
          maxRows={6}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Savol bering… (Shift+Enter yangi qator)"
          variant="outlined"
          size="small"
          disabled={isStreaming}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />

        {isStreaming ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <CircularProgress size={18} thickness={5} />
            <Tooltip title="To'xtatish">
              <IconButton onClick={stop} color="error" size="small">
                <StopIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Tooltip title="Yuborish (Enter)">
            <span>
              <IconButton
                onClick={send}
                disabled={!input.trim()}
                color="primary"
                sx={{ mb: 0.5 }}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
}
