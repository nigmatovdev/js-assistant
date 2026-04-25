import Box           from '@mui/material/Box';
import Typography    from '@mui/material/Typography';
import Card          from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent   from '@mui/material/CardContent';
import Avatar        from '@mui/material/Avatar';
import Chip          from '@mui/material/Chip';
import { motion }    from 'framer-motion';
import GavelIcon           from '@mui/icons-material/Gavel';
import AccountBalanceIcon  from '@mui/icons-material/AccountBalance';
import BalanceIcon         from '@mui/icons-material/Balance';
import PolicyIcon          from '@mui/icons-material/Policy';
import ArrowForwardIcon    from '@mui/icons-material/ArrowForward';

const suggestions = [
  {
    icon:     <AccountBalanceIcon />,
    color:    '#2563EB',
    label:    'Mulk jinoyatlari',
    question: "O'g'irlik qilganda qanday jazo ko'zda tutilgan va u qanday omillarga bog'liq?",
  },
  {
    icon:     <PolicyIcon />,
    color:    '#7C3AED',
    label:    'Korrupsiya',
    question: 'Mansabdor shaxs tomonidan pora olish uchun jinoyat kodeksida qanday jazo belgilangan?',
  },
  {
    icon:     <BalanceIcon />,
    color:    '#0891B2',
    label:    'Shaxsga qarshi',
    question: "Qasddan odam o'ldirish jinoyati uchun maksimal jazo qancha va qachon qo'llaniladi?",
  },
];

interface WelcomeScreenProps {
  onSuggest: (question: string) => void;
}

export default function WelcomeScreen({ onSuggest }: WelcomeScreenProps) {
  return (
    <Box
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%',
        px: { xs: 2, sm: 4 }, py: 4,
        maxWidth: 760, mx: 'auto', width: '100%',
      }}
    >
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 48 }}
      >
        <Box
          sx={{
            width: 80, height: 80, borderRadius: 4,
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 3,
            boxShadow: '0 20px 60px rgba(37, 99, 235, 0.35)',
          }}
        >
          <GavelIcon sx={{ fontSize: 42, color: '#fff' }} />
        </Box>

        <Typography
          variant="h3"
          sx={{
            fontWeight: 800, mb: 1.5,
            background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          JK AI
        </Typography>
        <Typography variant="h6" color="text.secondary" fontWeight={400} sx={{ mb: 1 }}>
          O'zbekiston Jinoyat Kodeksi bo'yicha AI yordamchi
        </Typography>
        <Chip
          label="BAAI/bge-m3 · Qwen3 · RAG"
          size="small"
          variant="outlined"
          sx={{ borderRadius: 2, fontSize: '0.7rem', color: 'text.disabled', borderColor: 'divider' }}
        />
      </motion.div>

      {/* Suggestion cards */}
      <Box sx={{ width: '100%', mb: 4 }}>
        <Typography variant="overline" color="text.secondary" sx={{ mb: 2, display: 'block', textAlign: 'center', letterSpacing: 2 }}>
          Namuna savollar
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {suggestions.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
            >
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 3,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: s.color,
                    boxShadow: `0 8px 32px ${s.color}22`,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => onSuggest(s.question)}
                  sx={{ height: '100%', p: 0.5 }}
                >
                  <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: `${s.color}18`, width: 40, height: 40, color: s.color }}>
                        {s.icon}
                      </Avatar>
                      <Typography variant="caption" fontWeight={700} sx={{ color: s.color, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                        {s.label}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, flex: 1 }}>
                      {s.question}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: s.color }}>
                      <Typography variant="caption" fontWeight={600}>So'rash</Typography>
                      <ArrowForwardIcon sx={{ fontSize: 14 }} />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </motion.div>
          ))}
        </Box>
      </Box>

      <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
        Yuqoridagi + tugmasi yoki kartaga bosib yangi suhbat boshlang
      </Typography>
    </Box>
  );
}
