import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon, AttachFile as AttachFileIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';

interface UploadEmailDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadEmailDialog: React.FC<UploadEmailDialogProps> = ({ open, onClose, onSuccess }) => {
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        if (file.size > 10 * 1024 * 1024) {
          setError('PDF file size must be less than 10MB');
          return;
        }
        setPdfFile(file);
        setError(null);
      } else {
        setError('Please select a PDF file');
      }
    }
  };

  const handleRemoveFile = () => {
    setPdfFile(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!sender.trim() || !subject.trim() || !body.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('sender', sender.trim());
      formData.append('subject', subject.trim());
      formData.append('body', body.trim());
      
      if (pdfFile) {
        formData.append('pdf', pdfFile);
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/summaries`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process email');
      }

      await response.json();
      setSuccess(true);
      
      // Reset form after a short delay
      setTimeout(() => {
        setSender('');
        setSubject('');
        setBody('');
        setPdfFile(null);
        setSuccess(false);
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process email');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSender('');
      setSubject('');
      setBody('');
      setPdfFile(null);
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
          Upload Email with PDF Attachment
        </Typography>
        <IconButton onClick={handleClose} disabled={loading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success">
              Email processed successfully! {pdfFile && 'PDF attachment extracted.'}
            </Alert>
          )}

          <TextField
            label="Sender Email"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            fullWidth
            required
            placeholder="billing@company.com"
            disabled={loading}
          />

          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            required
            placeholder="Invoice #INV-2024-001"
            disabled={loading}
          />

          <TextField
            label="Email Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
            required
            multiline
            rows={4}
            placeholder="Please find attached invoice for your review."
            disabled={loading}
          />

          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              PDF Attachment (Optional)
            </Typography>
            {!pdfFile ? (
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <input
                  accept=".pdf,application/pdf"
                  style={{ display: 'none' }}
                  id="pdf-upload"
                  type="file"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <label htmlFor="pdf-upload">
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      Click to upload PDF invoice
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Maximum file size: 10MB
                    </Typography>
                  </Box>
                </label>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'background.paper',
                }}
              >
                <AttachFileIcon color="primary" />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {pdfFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(pdfFile.size / 1024).toFixed(2)} KB
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={handleRemoveFile}
                  disabled={loading}
                  color="error"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>

          {pdfFile && (
            <Alert severity="info">
              PDF attachment detected. Invoice data will be extracted from the PDF if it contains invoice information.
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !sender.trim() || !subject.trim() || !body.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Processing...' : 'Upload & Process'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
