import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Email, Download, Upload } from '@mui/icons-material';

interface HeaderProps {
  onLoadMockEmails: () => void;
  onExport: (category?: string) => void;
  onUploadEmail: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLoadMockEmails, onExport, onUploadEmail, loading }) => {
  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: '#2c3e50',
        boxShadow: 2,
        zIndex: 1100,
      }}
    >
      <Toolbar>
        <Email sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AI Email Summarizer
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            color="inherit"
            startIcon={<Upload />}
            onClick={onUploadEmail}
            disabled={loading}
            sx={{
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Upload Email
          </Button>
          <Button
            color="inherit"
            startIcon={<Email />}
            onClick={onLoadMockEmails}
            disabled={loading}
            sx={{
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Load Mock Emails
          </Button>
          <Button
            color="inherit"
            startIcon={<Download />}
            onClick={() => onExport()}
            disabled={loading}
            sx={{
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Export CSV
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
