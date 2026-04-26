import { useState, useEffect } from 'react';
import { ThemeProvider }       from '@mui/material/styles';
import CssBaseline             from '@mui/material/CssBaseline';
import Box                     from '@mui/material/Box';
import { lightTheme, darkTheme } from './theme/theme';
import TopBar                  from './components/layout/TopBar';
import Sidebar                 from './components/layout/Sidebar';
import ChatArea                from './components/chat/ChatArea';
import { useSessionStore }     from './store/sessionStore';
import { useChatStore }        from './store/chatStore';
import { getSession }          from './api/sessions';

export default function App() {
  const [darkMode,    setDarkMode]    = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { fetchSessions, activeId } = useSessionStore();
  const { loadMessages, clearMessages } = useChatStore();

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    if (!activeId) { clearMessages(); return; }

    getSession(activeId)
      .then(s => {
        // Don't overwrite an in-progress stream (e.g. suggestion card → createSession + send race)
        if (!useChatStore.getState().isStreaming) {
          loadMessages(s.messages);
        }
      })
      .catch(() => clearMessages());
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <TopBar
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode(d => !d)}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
        />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <ChatArea />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
