import { useState, useEffect } from 'react';
import Box                     from '@mui/material/Box';
import Avatar                  from '@mui/material/Avatar';
import Paper                   from '@mui/material/Paper';
import Typography              from '@mui/material/Typography';
import SmartToyIcon            from '@mui/icons-material/SmartToy';

const STEPS = [
  'Kodeksni tekshirayapman…',
  'Manbalar qidirilmoqda…',
  'Javob tayyorlanmoqda…',
];

export default function ThinkingBubble() {
  const [seconds, setSeconds] = useState(0);
  const [step,    setStep]    = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % STEPS.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 3 }}>
      <Avatar
        sx={{
          width: 34, height: 34, mt: 0.25, flexShrink: 0,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'primary.main',
          color: 'primary.main',
          animation: 'jk-glow 2s ease-in-out infinite',
          '@keyframes jk-glow': {
            '0%, 100%': { boxShadow: '0 0 0 0 rgba(37,99,235,0)' },
            '50%':       { boxShadow: '0 0 0 5px rgba(37,99,235,0.18)' },
          },
        }}
      >
        <SmartToyIcon sx={{ fontSize: 18 }} />
      </Avatar>

      <Paper
        elevation={1}
        sx={{
          px: 2.25, py: 1.5,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: '4px 18px 18px 18px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          {/* Bouncing dots */}
          <Box sx={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {[0, 1, 2].map(i => (
              <Box
                key={i}
                sx={{
                  width: 7, height: 7,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  animation: 'jk-bounce 1.3s ease-in-out infinite',
                  animationDelay: `${i * 0.22}s`,
                  '@keyframes jk-bounce': {
                    '0%, 55%, 100%': { transform: 'translateY(0)',    opacity: 0.3 },
                    '27%':           { transform: 'translateY(-6px)', opacity: 1   },
                  },
                }}
              />
            ))}
          </Box>

          {/* Status text + timer inline */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            {STEPS[step]}
            {seconds > 0 && (
              <Box component="span" sx={{ color: 'text.disabled', ml: 0.75 }}>
                {seconds}s
              </Box>
            )}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
