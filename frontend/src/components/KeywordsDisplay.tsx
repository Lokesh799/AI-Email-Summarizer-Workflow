import { useState } from 'react';
import { Box, Chip, IconButton, Tooltip, Popover, Typography, Paper } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';

interface KeywordsDisplayProps {
  keywords: string[] | null;
  maxVisible?: number;
}

export const KeywordsDisplay: React.FC<KeywordsDisplayProps> = ({ keywords, maxVisible = 3 }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!keywords || keywords.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        No keywords
      </Typography>
    );
  }

  const visibleKeywords = expanded ? keywords : keywords.slice(0, maxVisible);
  const remainingCount = keywords.length - maxVisible;

  const handleExpandClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (expanded) {
      setExpanded(false);
      setAnchorEl(null);
    } else {
      setAnchorEl(event.currentTarget);
      setExpanded(true);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setExpanded(false);
  };

  const open = Boolean(anchorEl);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
      {visibleKeywords.map((keyword, idx) => (
        <Chip
          key={idx}
          label={keyword}
          size="small"
          variant="outlined"
          sx={{
            fontSize: '0.75rem',
            height: '24px',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        />
      ))}
      {keywords.length > maxVisible && (
        <>
          <Tooltip title={expanded ? 'Show less keywords' : `Show all ${keywords.length} keywords`}>
            <Chip
              label={expanded ? 'See less' : 'See more'}
              size="small"
              variant="outlined"
              onClick={handleExpandClick}
              sx={{
                fontSize: '0.75rem',
                height: '24px',
                cursor: 'pointer',
                backgroundColor: expanded ? 'primary.main' : 'primary.light',
                color: expanded ? 'primary.contrastText' : 'primary.contrastText',
                borderColor: 'primary.main',
                '&:hover': {
                  backgroundColor: expanded ? 'primary.dark' : 'primary.main',
                  borderColor: 'primary.dark',
                },
              }}
            />
          </Tooltip>
          <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handleClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <Paper sx={{ p: 2, maxWidth: 300, maxHeight: 300, overflow: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  All Keywords ({keywords.length})
                </Typography>
                <IconButton size="small" onClick={handleClose}>
                  <ExpandLess fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {keywords.map((keyword, idx) => (
                  <Chip
                    key={idx}
                    label={keyword}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Paper>
          </Popover>
        </>
      )}
    </Box>
  );
};
