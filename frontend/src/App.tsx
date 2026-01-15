import { useState, useEffect } from 'react';
import { Container, Typography, Box, Alert, Snackbar } from '@mui/material';
import { EmailSummary } from './types';
import { emailService } from './services/email.service';
import { EmailDashboard } from './components/EmailDashboard';
import { Header } from './components/Header';
import { LoadingSpinner } from './components/LoadingSpinner';

function App() {
  const [summaries, setSummaries] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string | undefined>(undefined);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadSummaries = async (category?: string) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentCategory(category); // Store current category filter
      const data = await emailService.getSummaries(category);
      
      // Remove duplicates by ID (in case backend returns duplicates)
      const uniqueSummaries = Array.from(
        new Map(data.map(item => [item.id, item])).values()
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
      // Reload with current category filter to maintain filter state
      await loadSummaries(currentCategory);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to re-summarize email';
      showSnackbar(errorMessage, 'error');
      throw err; // Re-throw so component can handle state
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await emailService.deleteSummary(id);
      showSnackbar('Email deleted successfully!', 'success');
      // Reload with current category filter to maintain filter state
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header
        onLoadMockEmails={handleLoadMockEmails}
        onExport={handleExport}
        loading={loading}
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          AI Email Summarizer Dashboard
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && summaries.length === 0 ? (
          <LoadingSpinner />
        ) : (
          <EmailDashboard
            summaries={summaries}
            onFilter={loadSummaries}
            onReSummarize={handleReSummarize}
            onDelete={handleDelete}
            loading={loading}
          />
        )}
      </Container>

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
  );
}

export default App;
