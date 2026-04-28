import { useState, useEffect } from 'react';
import { ThemeProvider }      from '@mui/material/styles';
import CssBaseline            from '@mui/material/CssBaseline';
import Box                    from '@mui/material/Box';
import { lightTheme, darkTheme } from './theme/theme';
import TopBar                 from './components/layout/TopBar';
import Sidebar                from './components/layout/Sidebar';
import SessionSearchModal     from './components/common/SessionSearchModal';
import SettingsModal          from './components/common/SettingsModal';
import ChatArea               from './components/chat/ChatArea';
import { useSessionStore }    from './store/sessionStore';
import { useChatStore }       from './store/chatStore';
import { getSession }         from './api/sessions';

function AmbientBlobs({ dark }: { dark: boolean }) {
  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      <Box sx={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: dark
          ? 'radial-gradient(circle, rgba(91,140,255,0.10) 0%, transparent 65%)'
          : 'radial-gradient(circle, rgba(91,140,255,0.11) 0%, transparent 65%)',
        top: '-20%', left: '-15%',
        animation: 'jkBlob1 24s ease-in-out infinite',
        '@keyframes jkBlob1': {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%':     { transform: 'translate(6%,10%) scale(1.08)' },
          '66%':     { transform: 'translate(-3%,5%) scale(0.95)' },
        },
      }} />
      <Box sx={{
        position: 'absolute', width: 580, height: 580, borderRadius: '50%',
        background: dark
          ? 'radial-gradient(circle, rgba(124,77,255,0.09) 0%, transparent 65%)'
          : 'radial-gradient(circle, rgba(124,77,255,0.07) 0%, transparent 65%)',
        bottom: '-5%', right: '-8%',
        animation: 'jkBlob2 30s ease-in-out infinite',
        '@keyframes jkBlob2': {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '50%':     { transform: 'translate(-5%,-8%) scale(1.12)' },
        },
      }} />
      <Box sx={{
        position: 'absolute', width: 420, height: 420, borderRadius: '50%',
        background: dark
          ? 'radial-gradient(circle, rgba(156,107,255,0.06) 0%, transparent 65%)'
          : 'radial-gradient(circle, rgba(156,107,255,0.05) 0%, transparent 65%)',
        top: '42%', left: '38%',
        animation: 'jkBlob3 38s ease-in-out infinite',
        '@keyframes jkBlob3': {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%':     { transform: 'translate(-8%,4%) scale(1.06)' },
          '66%':     { transform: 'translate(4%,-6%) scale(0.97)' },
        },
      }} />
    </Box>
  );
}

export default function App() {
  const [darkMode,     setDarkMode]     = useState(() => localStorage.getItem('jk-theme') !== 'light');
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { fetchSessions, activeId, setActive, clearActive } = useSessionStore();
  const { loadMessages, clearMessages }                      = useChatStore();

  useEffect(() => {
    fetchSessions().then(() => {
      const match = window.location.pathname.match(/^\/chat\/([^/]+)$/);
      if (match) setActive(match[1]);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const path = activeId ? `/chat/${activeId}` : '/';
    window.history.replaceState(null, '', path);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) { clearMessages(); return; }
    getSession(activeId)
      .then(s => loadMessages(s.messages, activeId))
      .catch(() => clearMessages());
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    setDarkMode(d => {
      const next = !d;
      localStorage.setItem('jk-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key === 'O' || e.key === 'o') { e.preventDefault(); clearActive(); clearMessages(); }
      if (e.key === 'F' || e.key === 'f') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearActive, clearMessages]);

  const handleNewChat = () => { clearActive(); clearMessages(); };

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', bgcolor: 'background.default' }}>
        <AmbientBlobs dark={darkMode} />

        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSearchOpen={() => setSearchOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <TopBar
            darkMode={darkMode}
            onToggleTheme={toggleTheme}
            onToggleSidebar={() => setSidebarOpen(o => !o)}
            onNewChat={handleNewChat}
          />
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <ChatArea />
          </Box>
        </Box>

        <SessionSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        <SettingsModal      open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Box>
    </ThemeProvider>
  );
}
