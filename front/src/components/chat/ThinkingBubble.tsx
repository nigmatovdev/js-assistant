import { useState, useEffect } from 'react';
import Box                     from '@mui/material/Box';
import Avatar                  from '@mui/material/Avatar';
import Typography              from '@mui/material/Typography';
import { useTheme }            from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import SmartToyIcon            from '@mui/icons-material/SmartToy';

const STEPS = [
  'Kodeksni tekshirayapman…',
  'Manbalar qidirilmoqda…',
  'Javob tayyorlanmoqda…',
];

export default function ThinkingBubble() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';
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
      {/* Glowing avatar */}
      <Avatar sx={{
        width: 34, height: 34, mt: 0.25, flexShrink: 0,
        bgcolor: isDark ? 'rgba(18,20,32,0.9)' : 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(91,140,255,0.4)',
        color: 'primary.main',
        animation: 'jkAiPulse 2s ease-in-out infinite',
        '@keyframes jkAiPulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(91,140,255,0)' },
          '50%':       { boxShadow: '0 0 0 5px rgba(91,140,255,0.14)' },
        },
      }}>
        <SmartToyIcon sx={{ fontSize: 17 }} />
      </Avatar>

      {/* Glass capsule */}
      <Box sx={{
        px: 2.25, py: 1.4,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        bgcolor: isDark ? 'rgba(20,22,36,0.78)' : 'rgba(255,255,255,0.78)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)',
        borderRadius: '4px 18px 18px 18px',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.38), 0 1px 0 rgba(255,255,255,0.05) inset'
          : '0 4px 24px rgba(91,140,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        {/* Gradient dots */}
        <Box sx={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <Box key={i} sx={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'linear-gradient(135deg, #5B8CFF, #9C6BFF)',
              boxShadow: '0 0 8px rgba(91,140,255,0.5)',
              animation: 'jkDotBounce 1.3s ease-in-out infinite',
              animationDelay: `${i * 0.22}s`,
              '@keyframes jkDotBounce': {
                '0%, 55%, 100%': { transform: 'translateY(0)',    opacity: 0.4 },
                '27%':           { transform: 'translateY(-6px)', opacity: 1   },
              },
            }} />
          ))}
        </Box>

        {/* Rotating status text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.28 }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {STEPS[step]}
              {seconds > 0 && (
                <Box component="span" sx={{ color: 'text.disabled', ml: 1, fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums' }}>
                  {seconds}s
                </Box>
              )}
            </Typography>
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
