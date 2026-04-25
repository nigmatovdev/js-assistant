import { useState }     from 'react';
import Box              from '@mui/material/Box';
import Paper            from '@mui/material/Paper';
import Typography       from '@mui/material/Typography';
import Avatar           from '@mui/material/Avatar';
import Chip             from '@mui/material/Chip';
import Collapse         from '@mui/material/Collapse';
import IconButton       from '@mui/material/IconButton';
import ExpandMoreIcon   from '@mui/icons-material/ExpandMore';
import PersonIcon       from '@mui/icons-material/Person';
import SmartToyIcon     from '@mui/icons-material/SmartToy';
import ArticleIcon      from '@mui/icons-material/Article';
import ReactMarkdown    from 'react-markdown';
import type { Message } from '../../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming = false }: Props) {
  const isUser = message.role === 'user';
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const hasSources = !isUser && message.sources && message.sources.length > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 1.5,
        mb: 2,
      }}
    >
      <Avatar
        sx={{
          width: 32, height: 32, mt: 0.5, flexShrink: 0,
          bgcolor: isUser ? 'primary.main' : 'secondary.main',
        }}
      >
        {isUser
          ? <PersonIcon sx={{ fontSize: 18 }} />
          : <SmartToyIcon sx={{ fontSize: 18 }} />}
      </Avatar>

      <Box sx={{ maxWidth: '72%' }}>
        <Paper
          elevation={0}
          sx={{
            px: 2, py: 1.5,
            bgcolor: isUser ? 'primary.main' : 'background.paper',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            border: isUser ? 'none' : 1,
            borderColor: 'divider',
            borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          }}
        >
          {isUser ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {message.content}
            </Typography>
          ) : (
            <Box
              sx={{
                '& p':         { margin: 0, lineHeight: 1.75 },
                '& p + p':     { marginTop: '0.6em' },
                '& ul, & ol':  { pl: 2, my: 0.5 },
                '& li':        { mb: 0.25, lineHeight: 1.6 },
                '& strong':    { fontWeight: 600 },
                '& code':      {
                  bgcolor: 'action.hover', px: 0.5, py: 0.2,
                  borderRadius: 0.5, fontSize: '0.85em', fontFamily: 'monospace',
                },
                '& pre':       {
                  bgcolor: 'action.hover', p: 1.5, borderRadius: 1,
                  overflow: 'auto', fontSize: '0.85em',
                },
                '& pre code':  { bgcolor: 'transparent', p: 0 },
                fontSize: '0.9rem',
              }}
            >
              <ReactMarkdown>
                {message.content + (isStreaming ? ' ▊' : '')}
              </ReactMarkdown>
            </Box>
          )}
        </Paper>

        {hasSources && (
          <Box sx={{ mt: 0.75 }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', width: 'fit-content' }}
              onClick={() => setSourcesOpen(o => !o)}
            >
              <ArticleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {message.sources!.length} ta manba
              </Typography>
              <IconButton size="small" sx={{ p: 0.25 }}>
                <ExpandMoreIcon
                  sx={{
                    fontSize: 16,
                    transform: sourcesOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </IconButton>
            </Box>
            <Collapse in={sourcesOpen}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.75 }}>
                {message.sources!.map(src => (
                  <Chip
                    key={src.id}
                    size="small"
                    icon={<ArticleIcon />}
                    label={`${src.metadata.modda}-modda`}
                    title={`${src.metadata.title} (${(src.score * 100).toFixed(0)}%)`}
                    variant="outlined"
                  />
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>
    </Box>
  );
}
