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
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TablePagination,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
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

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export const EmailDashboard: React.FC<EmailDashboardProps> = ({
  summaries,
  onFilter,
  onReSummarize,
  onDelete,
  loading,
}) => {
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [processingStates, setProcessingStates] = useState<ProcessingState>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    id: string | null;
    summary: EmailSummary | null;
  }>({
    open: false,
    id: null,
    summary: null,
  });
  const [detailView, setDetailView] = useState<{ open: boolean; summary: EmailSummary | null }>({
    open: false,
    summary: null,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const filteredSummaries = useMemo(() => {
    if (selectedCategory === 'All') {
      return summaries;
    }
    return summaries.filter((summary) => summary.category === selectedCategory);
  }, [summaries, selectedCategory]);

  const paginatedSummaries = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredSummaries.slice(startIndex, endIndex);
  }, [filteredSummaries, page, rowsPerPage]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    summaries.forEach((summary) => {
      counts[summary.category] = (counts[summary.category] || 0) + 1;
    });
    return counts;
  }, [summaries]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(0); // Reset to first page when filter changes
    onFilter(category === 'All' ? undefined : category);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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

  const getCategoryColor = (
    category: string
  ): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' => {
    const colorMap: Record<
      string,
      'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
    > = {
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
      <Box
        sx={{
          mb: 1.5,
          display: 'flex',
          gap: 2,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
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
          label={`Total: ${summaries.length} | Filtered: ${filteredSummaries.length}`}
          variant="outlined"
          sx={{
            fontWeight: 500,
            borderColor: theme.palette.primary.main,
            color: theme.palette.text.primary,
          }}
        />
      </Box>

      {filteredSummaries.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
            No email summaries found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click "Load Mock Emails" to get started
          </Typography>
        </Paper>
      ) : (
        <>
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
            }}
          >
            <TableContainer
              component={Paper}
              sx={{
                boxShadow: theme.shadows[2],
                borderRadius: 1,
                flex: 1,
                overflow: 'auto',
              }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: '#f5f5f5',
                      '& .MuiTableCell-head': {
                        color: '#000000',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        padding: '16px',
                        borderBottom: '2px solid #e0e0e0',
                      },
                    }}
                  >
                    <TableCell>Sender</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Summary</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Keywords</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSummaries.map((summary) => (
                    <TableRow
                      key={summary.id}
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: theme.palette.action.hover,
                        },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {summary.sender}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {summary.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={summary.summary} arrow placement="top">
                          <Typography
                            variant="body2"
                            sx={{
                              maxWidth: 400,
                              color: theme.palette.text.secondary,
                              lineHeight: 1.6,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              cursor: 'pointer',
                            }}
                          >
                            {summary.summary}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={summary.category}
                          color={getCategoryColor(summary.category)}
                          size="small"
                          sx={{
                            fontWeight: 500,
                            borderRadius: 1,
                            height: '28px',
                          }}
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
                              sx={{
                                borderRadius: 1,
                                height: '36px',
                                width: '36px',
                                '&:hover': {
                                  backgroundColor: theme.palette.info.light,
                                  color: theme.palette.info.contrastText,
                                },
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            title={
                              processingStates[summary.id] === 'processing'
                                ? 'Re-summarizing...'
                                : 'Re-summarize'
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleReSummarizeClick(summary.id)}
                                disabled={loading || processingStates[summary.id] === 'processing'}
                                color={
                                  processingStates[summary.id] === 'success'
                                    ? 'success'
                                    : 'primary'
                                }
                                sx={{
                                  borderRadius: 1,
                                  height: '36px',
                                  width: '36px',
                                  '&:hover': {
                                    backgroundColor: theme.palette.primary.light,
                                    color: theme.palette.primary.contrastText,
                                  },
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
                                borderRadius: 1,
                                height: '36px',
                                width: '36px',
                                '&:hover': {
                                  backgroundColor: theme.palette.error.light,
                                  color: theme.palette.error.contrastText,
                                },
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
            <Paper
              sx={{
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                borderTop: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.shadows[4],
                borderRadius: '0 0 4px 4px',
              }}
            >
              <TablePagination
                component="div"
                count={filteredSummaries.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
                sx={{
                  backgroundColor: theme.palette.background.paper,
                }}
              />
            </Paper>
          </Box>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null, summary: null })}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the summary for:</Typography>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>
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
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, fontWeight: 600 }}>
          Email Details
          {detailView.summary && (
            <Chip
              label={detailView.summary.category}
              color={getCategoryColor(detailView.summary.category)}
              size="small"
            />
          )}
        </DialogTitle>
        <DialogContent>
          {detailView.summary && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                From
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, fontFamily: 'monospace' }}>
                {detailView.summary.sender}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                Subject
              </Typography>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {detailView.summary.subject}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                Summary
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                {detailView.summary.summary}
              </Typography>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                Keywords
              </Typography>
              <KeywordsDisplay keywords={detailView.summary.keywords} maxVisible={10} />

              {detailView.summary.invoiceData && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight={600}>
                    Invoice Details
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Item</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            Quantity
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            Price
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            Total
                          </TableCell>
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
                                currency: detailView.summary?.invoiceData?.currency || 'USD',
                              }).format(item.price)}
                            </TableCell>
                            <TableCell align="right">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: detailView.summary?.invoiceData?.currency || 'USD',
                              }).format(item.total || item.price)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} align="right" sx={{ fontWeight: 600 }}>
                            Total:
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: detailView.summary?.invoiceData?.currency || 'USD',
                            }).format(detailView.summary?.invoiceData?.total || 0)}
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
          <Button onClick={() => setDetailView({ open: false, summary: null })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
