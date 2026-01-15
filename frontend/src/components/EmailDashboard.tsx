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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { EmailSummary } from '../types';

interface EmailDashboardProps {
  summaries: EmailSummary[];
  onFilter: (category?: string) => void;
  onReSummarize: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
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
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 200 }}>
                      {summary.keywords?.slice(0, 3).map((keyword, idx) => (
                        <Chip key={idx} label={keyword} size="small" variant="outlined" />
                      ))}
                      {summary.keywords && summary.keywords.length > 3 && (
                        <Chip
                          label={`+${summary.keywords.length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Re-summarize">
                      <IconButton
                        size="small"
                        onClick={() => onReSummarize(summary.id)}
                        disabled={loading}
                        color="primary"
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => onDelete(summary.id)}
                        disabled={loading}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
                      <Tooltip title="Re-summarize">
                        <IconButton
                          size="small"
                          onClick={() => onReSummarize(summary.id)}
                          disabled={loading}
                          color="primary"
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => onDelete(summary.id)}
                          disabled={loading}
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
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {summary.keywords?.map((keyword, idx) => (
                      <Chip key={idx} label={keyword} size="small" variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
