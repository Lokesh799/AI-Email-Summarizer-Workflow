import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Email, Download } from '@mui/icons-material';

interface HeaderProps {
  onLoadMockEmails: () => void;
  onExport: (category?: string) => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLoadMockEmails, onExport, loading }) => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Email sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          AI Email Summarizer
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            color="inherit"
            startIcon={<Email />}
            onClick={onLoadMockEmails}
            disabled={loading}
          >
            Load Mock Emails
          </Button>
          <Button
            color="inherit"
            startIcon={<Download />}
            onClick={() => onExport()}
            disabled={loading}
          >
            Export CSV
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
