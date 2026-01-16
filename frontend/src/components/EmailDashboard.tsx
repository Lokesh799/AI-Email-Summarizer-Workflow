import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Checkbox,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Skeleton,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { EmailSummary } from '../types';
import { KeywordsDisplay } from './KeywordsDisplay';

interface EmailDashboardProps {
  summaries: EmailSummary[];
  onFilter?: (category?: string) => void;
  onReSummarize: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

interface ProcessingState {
  [id: string]: 'idle' | 'processing' | 'success' | 'error';
}

// Gmail-like tab categories
type GmailTab = 'Primary' | 'Promotions' | 'Social' | 'All';

// Map our categories to Gmail tabs
const mapCategoryToGmailTab = (category: string): GmailTab => {
  switch (category) {
    case 'Promotion':
    case 'Newsletter':
      return 'Promotions';
    case 'Personal':
      return 'Social';
    case 'Invoice':
    case 'Support Request':
    case 'Meeting':
    case 'Work':
    case 'Other':
    default:
      return 'Primary';
  }
};

const ROWS_PER_PAGE = 50; // Gmail shows 50 per page

// Debounce hook for search
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Loading skeleton component
const EmailRowSkeleton = memo(() => (
  <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, gap: 2 }}>
    <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 1 }} />
    <Skeleton variant="text" width={180} height={20} />
    <Skeleton variant="text" width={250} height={20} />
    <Skeleton variant="text" width={300} height={40} />
    <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
    <Skeleton variant="rectangular" width={150} height={24} sx={{ borderRadius: 1 }} />
    <Skeleton variant="circular" width={28} height={28} />
  </Box>
));

EmailRowSkeleton.displayName = 'EmailRowSkeleton';

export const EmailDashboard: React.FC<EmailDashboardProps> = ({
  summaries,
  onReSummarize,
  onDelete,
  loading,
}) => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState<GmailTab>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
  const [batchMenuAnchor, setBatchMenuAnchor] = useState<null | HTMLElement>(null);

  // Calculate counts for each Gmail tab
  const tabCounts = useMemo(() => {
    const counts: Record<GmailTab, number> = {
      Primary: 0,
      Promotions: 0,
      Social: 0,
      All: summaries.length,
    };

    summaries.forEach((summary) => {
      const tab = mapCategoryToGmailTab(summary.category);
      counts[tab]++;
    });

    return counts;
  }, [summaries]);

  // Filter summaries by selected tab
  const tabFilteredSummaries = useMemo(() => {
    if (selectedTab === 'All') {
      return summaries;
    }
    return summaries.filter((summary) => {
      const tab = mapCategoryToGmailTab(summary.category);
      return tab === selectedTab;
    });
  }, [summaries, selectedTab]);

  // Apply search filter with debounced query
  const filteredSummaries = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return tabFilteredSummaries;
    }

    const query = debouncedSearchQuery.toLowerCase();
    return tabFilteredSummaries.filter(
      (summary) =>
        summary.sender.toLowerCase().includes(query) ||
        summary.subject.toLowerCase().includes(query) ||
        summary.summary.toLowerCase().includes(query) ||
        summary.category.toLowerCase().includes(query) ||
        summary.keywords?.some((k) => k.toLowerCase().includes(query))
    );
  }, [tabFilteredSummaries, debouncedSearchQuery]);

  // Pagination
  const paginatedSummaries = useMemo(() => {
    const startIndex = page * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;
    return filteredSummaries.slice(startIndex, endIndex);
  }, [filteredSummaries, page]);

  const totalPages = Math.ceil(filteredSummaries.length / ROWS_PER_PAGE);
  const startIndex = page * ROWS_PER_PAGE + 1;
  const endIndex = Math.min((page + 1) * ROWS_PER_PAGE, filteredSummaries.length);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: GmailTab) => {
    setSelectedTab(newValue);
    setPage(0);
    setSelectedIds(new Set());
  }, []);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedSummaries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSummaries.map((s) => s.id)));
    }
  }, [selectedIds.size, paginatedSummaries]);

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const confirmMessage = `Delete ${selectedIds.size} email${selectedIds.size > 1 ? 's' : ''}?`;
    if (window.confirm(confirmMessage)) {
      for (const id of selectedIds) {
        await onDelete(id);
      }
      setSelectedIds(new Set());
      setBatchMenuAnchor(null);
    }
  };

  const handleReSummarizeClick = useCallback(async (id: string) => {
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
  }, [onReSummarize]);

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.id) {
      await onDelete(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null, summary: null });
    }
  };

  const handleViewDetails = useCallback((summary: EmailSummary) => {
    setDetailView({ open: true, summary });
  }, []);

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

  const handlePreviousPage = () => {
    if (page > 0) {
      setPage(page - 1);
      setSelectedIds(new Set());
    }
  };

  const handleNextPage = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
      setSelectedIds(new Set());
    }
  };

  const allSelected = paginatedSummaries.length > 0 && selectedIds.size === paginatedSummaries.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < paginatedSummaries.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Statistics Bar */}
      {/* <Fade in={!loading && summaries.length > 0}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 2,
            p: 1.5,
            backgroundColor: 'background.paper',
            borderRadius: 1,
            boxShadow: theme.shadows[1],
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon color="primary" fontSize="small" />
            <Typography variant="body2" color="text.secondary">
              Total: <strong>{stats.total}</strong> emails
            </Typography>
          </Box>
          {Object.entries(stats.byCategory).slice(0, 3).map(([category, count]) => (
            <Box key={category} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label={category}
                size="small"
                color={getCategoryColor(category)}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
              <Typography variant="caption" color="text.secondary">
                {count}
              </Typography>
            </Box>
          ))}
        </Box>
      </Fade> */}

      {/* Search Bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search emails by sender, subject, summary, category, or keywords..."
          value={searchQuery}
          onChange={handleSearchChange}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            backgroundColor: 'background.paper',
            '& .MuiOutlinedInput-root': {
              borderRadius: 1,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: theme.shadows[2],
              },
              '&.Mui-focused': {
                boxShadow: theme.shadows[4],
              },
            },
          }}
        />
      </Box>

      {/* Gmail-like Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              minHeight: 48,
              fontWeight: 500,
              fontSize: '0.875rem',
            },
            '& .Mui-selected': {
              color: theme.palette.primary.main,
              fontWeight: 600,
            },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                All
                {tabCounts.All > 0 && (
                  <Tooltip title={`${tabCounts.All} total emails`}>
                    <Chip
                      label={tabCounts.All}
                      size="small"
                      sx={{
                        height: 20,
                        minWidth: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: '#6c757d',
                        color: '#ffffff',
                        '& .MuiChip-label': {
                          px: 0.75,
                        },
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
            }
            value="All"
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Primary
                {tabCounts.Primary > 0 && (
                  <Tooltip title={`${tabCounts.Primary} emails in Primary`}>
                    <Chip
                      label={tabCounts.Primary}
                      size="small"
                      sx={{
                        height: 20,
                        minWidth: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: '#1a73e8',
                        color: '#ffffff',
                        '& .MuiChip-label': {
                          px: 0.75,
                        },
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
            }
            value="Primary"
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Promotions
                {tabCounts.Promotions > 0 && (
                  <Tooltip title={`${tabCounts.Promotions} emails in Promotions`}>
                    <Chip
                      label={tabCounts.Promotions}
                      size="small"
                      sx={{
                        height: 20,
                        minWidth: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: '#34a853',
                        color: '#ffffff',
                        '& .MuiChip-label': {
                          px: 0.75,
                        },
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
            }
            value="Promotions"
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Social
                {tabCounts.Social > 0 && (
                  <Tooltip title={`${tabCounts.Social} emails in Social`}>
                    <Chip
                      label={tabCounts.Social}
                      size="small"
                      sx={{
                        height: 20,
                        minWidth: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: '#ea4335',
                        color: '#ffffff',
                        '& .MuiChip-label': {
                          px: 0.75,
                        },
                      }}
                    />
                  </Tooltip>
                )}
              </Box>
            }
            value="Social"
          />
        </Tabs>
      </Box>

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            backgroundColor: 'action.selected',
            borderRadius: 1,
            mb: 2,
          }}
        >
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            {selectedIds.size} selected
          </Typography>
          <Button
            size="small"
            startIcon={<DeleteIcon />}
            onClick={handleBatchDelete}
            color="error"
            sx={{ textTransform: 'none' }}
          >
            Delete
          </Button>
          <IconButton
            size="small"
            onClick={(e) => setBatchMenuAnchor(e.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>
      )}

      {/* Email List */}
      {loading && summaries.length === 0 ? (
        <Paper
          sx={{
            flex: 1,
            overflow: 'auto',
            boxShadow: theme.shadows[1],
            borderRadius: 1,
          }}
        >
          {Array.from({ length: 5 }).map((_, idx) => (
            <EmailRowSkeleton key={idx} />
          ))}
        </Paper>
      ) : filteredSummaries.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: theme.palette.background.paper,
            borderRadius: 2,
          }}
        >
          <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500, mb: 1 }}>
            No emails found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery || selectedTab !== 'All'
              ? 'Try adjusting your search or filters'
              : 'Click "Load Mock Emails" to get started'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Paper
            sx={{
              flex: 1,
              overflow: 'auto',
              boxShadow: theme.shadows[1],
              borderRadius: 1,
            }}
          >
            {/* Table Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1,
                backgroundColor: '#f5f5f5',
                borderBottom: `1px solid ${theme.palette.divider}`,
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={handleSelectAll}
                size="small"
                sx={{ mr: 1 }}
              />
              <Typography
                variant="body2"
                sx={{
                  width: 180,
                  fontWeight: 600,
                  color: '#000000',
                  fontSize: '0.875rem',
                }}
              >
                Sender
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  width: 250,
                  fontWeight: 600,
                  color: '#000000',
                  fontSize: '0.875rem',
                }}
              >
                Subject
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  width: 300,
                  fontWeight: 600,
                  color: '#000000',
                  fontSize: '0.875rem',
                }}
              >
                Summary
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  width: 120,
                  fontWeight: 600,
                  color: '#000000',
                  fontSize: '0.875rem',
                }}
              >
                Category
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  width: 200,
                  fontWeight: 600,
                  color: '#000000',
                  fontSize: '0.875rem',
                }}
              >
                Keywords
              </Typography>
              <Box sx={{ width: 120, textAlign: 'right', ml: 2 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: '#000000',
                    fontSize: '0.875rem',
                  }}
                >
                  Actions
                </Typography>
              </Box>
            </Box>

            {/* Email Rows */}
            {paginatedSummaries.map((summary, idx) => (
              <Fade in timeout={300} key={summary.id} style={{ transitionDelay: `${idx * 50}ms` }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                      transform: 'translateX(2px)',
                      boxShadow: theme.shadows[1],
                    },
                    cursor: 'pointer',
                  }}
                  onClick={() => handleViewDetails(summary)}
                >
                <Checkbox
                  checked={selectedIds.has(summary.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSelectOne(summary.id);
                  }}
                  size="small"
                  sx={{ mr: 1 }}
                  onClick={(e) => e.stopPropagation()}
                />
                <Typography
                  variant="body2"
                  sx={{
                    width: 180,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {summary.sender}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    width: 250,
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {summary.subject}
                </Typography>
                <Tooltip title={summary.summary} arrow placement="top">
                  <Typography
                    variant="body2"
                    sx={{
                      width: 300,
                      color: theme.palette.text.secondary,
                      fontSize: '0.875rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.4,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {summary.summary}
                  </Typography>
                </Tooltip>
                <Box sx={{ width: 120 }}>
                  <Chip
                    label={summary.category}
                    color={getCategoryColor(summary.category)}
                    size="small"
                    sx={{
                      fontWeight: 500,
                      borderRadius: 1,
                      height: '24px',
                      fontSize: '0.75rem',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Box>
                <Box
                  sx={{ width: 200 }}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <KeywordsDisplay keywords={summary.keywords} maxVisible={2} />
                </Box>
                <Box
                  sx={{
                    width: 120,
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 0.5,
                    ml: 2,
                  }}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => handleViewDetails(summary)}
                      sx={{
                        borderRadius: 1,
                        height: '28px',
                        width: '28px',
                        padding: 0.5,
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
                    <Zoom in={processingStates[summary.id] !== 'processing'}>
                      <IconButton
                        size="small"
                        onClick={() => handleReSummarizeClick(summary.id)}
                        disabled={loading || processingStates[summary.id] === 'processing'}
                        sx={{
                          borderRadius: 1,
                          height: '28px',
                          width: '28px',
                          padding: 0.5,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                            color: 'primary.contrastText',
                            transform: 'rotate(180deg)',
                          },
                        }}
                      >
                        {processingStates[summary.id] === 'processing' ? (
                          <CircularProgress size={14} />
                        ) : (
                          <RefreshIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Zoom>
                  </Tooltip>
                </Box>
              </Box>
            </Fade>
            ))}
          </Paper>

          {/* Gmail-style Pagination */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderTop: `1px solid ${theme.palette.divider}`,
              backgroundColor: 'background.paper',
              position: 'sticky',
              bottom: 0,
              zIndex: 10,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {filteredSummaries.length > 0
                ? `${startIndex}-${endIndex} of ${filteredSummaries.length}`
                : '0 results'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                onClick={handlePreviousPage}
                disabled={page === 0}
                sx={{ textTransform: 'none', minWidth: 80 }}
              >
                Previous
              </Button>
              <Typography variant="body2" color="text.secondary">
                Page {page + 1} of {totalPages || 1}
              </Typography>
              <Button
                size="small"
                onClick={handleNextPage}
                disabled={page >= totalPages - 1}
                sx={{ textTransform: 'none', minWidth: 80 }}
              >
                Next
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Batch Actions Menu */}
      <Menu
        anchorEl={batchMenuAnchor}
        open={Boolean(batchMenuAnchor)}
        onClose={() => setBatchMenuAnchor(null)}
      >
        <MenuItem onClick={handleBatchDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

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
