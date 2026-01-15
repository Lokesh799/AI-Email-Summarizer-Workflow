import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { EmailSummary } from '../types';
import { KeywordsDisplay } from './KeywordsDisplay';

interface EmailDashboardProps {
  summaries: EmailSummary[];
  onFilter: (category?: string) => void;
  onReSummarize: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

interface ProcessingState {
  [id: string]: 'idle' | 'processing' | 'success' | 'error';
}

const CATEGORIES = [
  'All',
  'Meeting',
  'Invoice',
  'Support Request',
  'Newsletter',
  'Promotion',
  'Personal',
  'Work',
  'Other',
];

export const EmailDashboard: React.FC<EmailDashboardProps> = ({
  summaries,
  onFilter,
  onReSummarize,
  onDelete,
  loading,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode] = useState<'table' | 'cards'>('table');
  const [processingStates, setProcessingStates] = useState<ProcessingState>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null; summary: EmailSummary | null }>({
    open: false,
    id: null,
    summary: null,
  });
  const [detailView, setDetailView] = useState<{ open: boolean; summary: EmailSummary | null }>({
    open: false,
    summary: null,
  });

  const filteredSummaries = useMemo(() => {
    if (selectedCategory === 'All') {
      return summaries;
    }
    return summaries.filter((summary) => summary.category === selectedCategory);
  }, [summaries, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    summaries.forEach((summary) => {
      counts[summary.category] = (counts[summary.category] || 0) + 1;
    });
    return counts;
  }, [summaries]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    onFilter(category === 'All' ? undefined : category);
  };

  const handleReSummarizeClick = async (id: string) => {
    setProcessingStates((prev) => ({ ...prev, [id]: 'processing' }));
    try {
      await onReSummarize(id);
      setProcessingStates((prev) => ({ ...prev, [id]: 'success' }));
      setTimeout(() => {
        setProcessingStates((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }, 2000);
    } catch (error) {
      setProcessingStates((prev) => ({ ...prev, [id]: 'error' }));
      setTimeout(() => {
        setProcessingStates((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }, 3000);
    }
  };

  const handleDeleteClick = (summary: EmailSummary) => {
    setDeleteConfirm({ open: true, id: summary.id, summary });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id) {
      await onDelete(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null, summary: null });
    }
  };

  const handleViewDetails = (summary: EmailSummary) => {
    setDetailView({ open: true, summary });
  };

  const getCategoryColor = (category: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
    const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
      Meeting: 'primary',
      Invoice: 'warning',
      'Support Request': 'error',
      Newsletter: 'info',
      Promotion: 'success',
      Personal: 'default',
      Work: 'secondary',
      Other: 'default',
    };
    return colorMap[category] || 'default';
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          select
          label="Filter by Category"
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          sx={{ minWidth: 200 }}
          size="small"
        >
          {CATEGORIES.map((category) => (
            <MenuItem key={category} value={category}>
              {category} {category !== 'All' && `(${categoryCounts[category] || 0})`}
            </MenuItem>
          ))}
        </TextField>

        <Chip
          icon={<FilterIcon />}
          label={`Total: ${summaries.length} | Filtered: ${filteredSummaries.length}`}
          variant="outlined"
        />
      </Box>

      {filteredSummaries.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No email summaries found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click "Load Mock Emails" to get started
          </Typography>
        </Paper>
      ) : viewMode === 'table' ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Sender</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Summary</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Keywords</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSummaries.map((summary) => (
                <TableRow key={summary.id} hover>
                  <TableCell>{summary.sender}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {summary.subject}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 400 }}>
                      {summary.summary}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={summary.category}
                      color={getCategoryColor(summary.category)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <KeywordsDisplay keywords={summary.keywords} maxVisible={3} />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(summary)}
                          color="info"
                          sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={processingStates[summary.id] === 'processing' ? 'Re-summarizing...' : 'Re-summarize'}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleReSummarizeClick(summary.id)}
                            disabled={loading || processingStates[summary.id] === 'processing'}
                            color={processingStates[summary.id] === 'success' ? 'success' : 'primary'}
                            sx={{
                              '&:hover': { backgroundColor: 'action.hover' },
                              '&.Mui-disabled': { opacity: 0.5 },
                            }}
                          >
                            {processingStates[summary.id] === 'processing' ? (
                              <CircularProgress size={16} />
                            ) : (
                              <RefreshIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(summary)}
                          disabled={loading || processingStates[summary.id] === 'processing'}
                          color="error"
                          sx={{
                            '&:hover': { backgroundColor: 'error.light', color: 'error.contrastText' },
                            '&.Mui-disabled': { opacity: 0.5 },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Grid container spacing={3}>
          {filteredSummaries.map((summary) => (
            <Grid item xs={12} md={6} lg={4} key={summary.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip
                      label={summary.category}
                      color={getCategoryColor(summary.category)}
                      size="small"
                    />
                    <Box>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(summary)}
                          color="info"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={processingStates[summary.id] === 'processing' ? 'Re-summarizing...' : 'Re-summarize'}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleReSummarizeClick(summary.id)}
                            disabled={loading || processingStates[summary.id] === 'processing'}
                            color={processingStates[summary.id] === 'success' ? 'success' : 'primary'}
                          >
                            {processingStates[summary.id] === 'processing' ? (
                              <CircularProgress size={16} />
                            ) : (
                              <RefreshIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(summary)}
                          disabled={loading || processingStates[summary.id] === 'processing'}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {summary.sender}
                  </Typography>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {summary.subject}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {summary.summary}
                  </Typography>
                  <KeywordsDisplay keywords={summary.keywords} maxVisible={5} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null, summary: null })}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the summary for:
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
            {deleteConfirm.summary?.subject}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            From: {deleteConfirm.summary?.sender}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null, summary: null })}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog
        open={detailView.open}
        onClose={() => setDetailView({ open: false, summary: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Email Details
          {detailView.summary && (
            <Chip
              label={detailView.summary.category}
              color={getCategoryColor(detailView.summary.category)}
              size="small"
              sx={{ ml: 2 }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          {detailView.summary && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                From
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {detailView.summary.sender}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Subject
              </Typography>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {detailView.summary.subject}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Summary
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                {detailView.summary.summary}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Keywords
              </Typography>
              <KeywordsDisplay keywords={detailView.summary.keywords} maxVisible={10} />

              {detailView.summary.invoiceData && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Invoice Details
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Total</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailView.summary.invoiceData.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.item}</TableCell>
                            <TableCell align="right">{item.quantity || 1}</TableCell>
                            <TableCell align="right">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: detailView.summary.invoiceData?.currency || 'USD',
                              }).format(item.price)}
                            </TableCell>
                            <TableCell align="right">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: detailView.summary.invoiceData?.currency || 'USD',
                              }).format(item.total || item.price)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                            Total:
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: detailView.summary.invoiceData?.currency || 'USD',
                            }).format(detailView.summary.invoiceData.total)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary">
                  Created: {new Date(detailView.summary.createdAt).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Updated: {new Date(detailView.summary.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailView({ open: false, summary: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
