import { useState, useEffect } from 'react';
import { Container, Typography, Box, Alert, Snackbar, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { EmailSummary } from './types';
import { emailService } from './services/email.service';
import { EmailDashboard } from './components/EmailDashboard';
import { Header } from './components/Header';
import { LoadingSpinner } from './components/LoadingSpinner';

// Create a custom theme with improved typography and colors
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  const [summaries, setSummaries] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadSummaries = async (category?: string) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentCategory(category);
      const data = await emailService.getSummaries(category);

      // Remove duplicates by ID
      const uniqueSummaries = Array.from(
        new Map(data.map((item) => [item.id, item])).values()
      );

      setSummaries(uniqueSummaries);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load summaries';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleLoadMockEmails = async () => {
    try {
      setLoading(true);
      await emailService.loadMockEmails();
      showSnackbar('Mock emails loaded and summarized successfully!', 'success');
      await loadSummaries();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load mock emails';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReSummarize = async (id: string) => {
    try {
      showSnackbar('Re-summarizing email with AI...', 'success');
      const updated = await emailService.reSummarize(id);
      showSnackbar(`Email re-summarized successfully! New category: ${updated.category}`, 'success');
      await loadSummaries(currentCategory);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to re-summarize email';
      showSnackbar(errorMessage, 'error');
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emailService.deleteSummary(id);
      showSnackbar('Email deleted successfully!', 'success');
      await loadSummaries(currentCategory);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete email';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleExport = async (category?: string) => {
    try {
      await emailService.exportSummaries(category);
      showSnackbar('Export started successfully!', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export summaries';
      showSnackbar(errorMessage, 'error');
    }
  };

  useEffect(() => {
    loadSummaries();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          overflow: 'hidden',
        }}
      >
        <Header
          onLoadMockEmails={handleLoadMockEmails}
          onExport={handleExport}
          loading={loading}
        />
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Container maxWidth="xl" sx={{ py: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                mb: 2,
                fontWeight: 600,
                color: 'text.primary',
              }}
            >
              AI Email Summarizer Dashboard
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            {loading && summaries.length === 0 ? (
              <LoadingSpinner />
            ) : (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <EmailDashboard
                  summaries={summaries}
                  onFilter={loadSummaries}
                  onReSummarize={handleReSummarize}
                  onDelete={handleDelete}
                  loading={loading}
                />
              </Box>
            )}
          </Container>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
