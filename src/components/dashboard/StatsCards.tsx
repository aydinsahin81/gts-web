import React from 'react';
import { Grid, Typography, Paper, Box } from '@mui/material';
import {
  PeopleOutline as PeopleIcon,
  AssignmentOutlined as TaskIcon,
  CheckCircleOutline as CompletedIcon,
  PendingOutlined as PendingIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Tema renkleri
const THEME_COLORS = {
  personnel: '#1976D2', // Mavi
  tasks: '#9C27B0',     // Mor
  pending: '#FF9800',   // Turuncu
  completed: '#4CAF50'  // Yeşil
};

// İstatistik kartı için styled component - tıklanabilir kart
const StatsCard = styled(Paper)<{ bgcolor: string }>(({ theme, bgcolor }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  alignItems: 'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
    background: `linear-gradient(to right, white, ${bgcolor}10)`,
  },
}));

const IconBox = styled(Box)<{ bgcolor: string }>(({ theme, bgcolor }) => ({
  width: 40,
  height: 40,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: bgcolor,
  marginRight: theme.spacing(1),
  '& .MuiSvgIcon-root': {
    color: 'white',
    fontSize: 24,
  },
}));

const StatsText = styled(Box)({
  flexGrow: 1,
  '& .MuiTypography-h4': {
    fontSize: '1.5rem',
    fontWeight: 'bold',
  },
  '& .MuiTypography-body2': {
    fontSize: '0.75rem',
  },
});

interface StatsCardsProps {
  stats: {
    totalPersonnel: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
  };
  isManager?: boolean;
  onPersonnelClick?: () => void;
  onTasksClick?: () => void;
  onPendingTasksClick?: () => void;
  onCompletedTasksClick?: () => void;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  isManager = false,
  onPersonnelClick,
  onTasksClick,
  onPendingTasksClick,
  onCompletedTasksClick,
}) => {
  return (
    <Grid container spacing={1} sx={{ mb: 2 }} className="stat-cards-section">
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard 
          bgcolor={THEME_COLORS.personnel} 
          onClick={isManager ? undefined : onPersonnelClick}
          sx={{ cursor: isManager ? 'default' : 'pointer' }}
        >
          <IconBox bgcolor={THEME_COLORS.personnel}>
            <PeopleIcon />
          </IconBox>
          <StatsText>
            <Typography variant="h6" fontWeight="bold">
              {stats.totalPersonnel}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Toplam Personel
            </Typography>
          </StatsText>
        </StatsCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard 
          bgcolor={THEME_COLORS.tasks} 
          onClick={isManager ? undefined : onTasksClick}
          sx={{ cursor: isManager ? 'default' : 'pointer' }}
        >
          <IconBox bgcolor={THEME_COLORS.tasks}>
            <TaskIcon />
          </IconBox>
          <StatsText>
            <Typography variant="h6" fontWeight="bold">
              {stats.totalTasks}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Toplam Görev
            </Typography>
          </StatsText>
        </StatsCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard 
          bgcolor={THEME_COLORS.pending} 
          onClick={onPendingTasksClick}
        >
          <IconBox bgcolor={THEME_COLORS.pending}>
            <PendingIcon />
          </IconBox>
          <StatsText>
            <Typography variant="h6" fontWeight="bold">
              {stats.pendingTasks}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Devam Eden Günlük Görev
            </Typography>
          </StatsText>
        </StatsCard>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard 
          bgcolor={THEME_COLORS.completed}
          onClick={onCompletedTasksClick}
        >
          <IconBox bgcolor={THEME_COLORS.completed}>
            <CompletedIcon />
          </IconBox>
          <StatsText>
            <Typography variant="h6" fontWeight="bold">
              {stats.completedTasks}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Tamamlanan Günlük Görev
            </Typography>
          </StatsText>
        </StatsCard>
      </Grid>
    </Grid>
  );
};

export default StatsCards; 