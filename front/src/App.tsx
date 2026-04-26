import { useState, useEffect }   from 'react';
import { ThemeProvider }          from '@mui/material/styles';
import CssBaseline                from '@mui/material/CssBaseline';
import Box                        from '@mui/material/Box';
import { lightTheme, darkTheme }  from './theme/theme';
import TopBar                     from './components/layout/TopBar';
import Sidebar                    from './components/layout/Sidebar';
import SessionSearchModal         from './components/common/SessionSearchModal';
import ChatArea                   from './components/chat/ChatArea';
import { useSessionStore }        from './store/sessionStore';
import { useChatStore }           from './store/chatStore';
import { getSession }             from './api/sessions';

export default function App() {
  const [darkMode,    setDarkMode]    = useState(() => localStorage.getItem('jk-theme') === 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);

  const { fetchSessions, activeId, setActive, clearActive } = useSessionStore();
  const { loadMessages, clearMessages }                      = useChatStore();

  // Bootstrap: load sessions, then restore active session from URL
  useEffect(() => {
    fetchSessions().then(() => {
      const match = window.location.pathname.match(/^\/chat\/([^/]+)$/);
      if (match) setActive(match[1]);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL when active session changes
  useEffect(() => {
    const path = activeId ? `/chat/${activeId}` : '/';
    window.history.replaceState(null, '', path);
  }, [activeId]);

  // Load messages for the active session
  useEffect(() => {
    if (!activeId) { clearMessages(); return; }
    getSession(activeId)
      .then(s => {
        if (!useChatStore.getState().isStreaming) {
          loadMessages(s.messages);
        }
      })
      .catch(() => clearMessages());
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    setDarkMode(d => {
      const next = !d;
      localStorage.setItem('jk-theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;
      if (e.key === 'O' || e.key === 'o') {
        e.preventDefault();
        clearActive();
        clearMessages();
      }
      if (e.key === 'F' || e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearActive, clearMessages]);

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <TopBar
          darkMode={darkMode}
          onToggleTheme={toggleTheme}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
        />
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSearchOpen={() => setSearchOpen(true)}
        />
        <SessionSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <ChatArea />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
