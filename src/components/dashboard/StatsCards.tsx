import React from 'react';
import { Grid, Typography, Paper, Box } from '@mui/material';
import {
  PeopleOutline as PeopleIcon,
  AssignmentOutlined as TaskIcon,
  CheckCircleOutline as CompletedIcon,
  PendingOutlined as PendingIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Tema renkleri
const THEME_COLORS = {
  personnel: '#1976D2', // Mavi
  tasks: '#9C27B0',     // Mor
  pending: '#FF9800',   // Turuncu
  completed: '#4CAF50',  // Yeşil
  weeklyPending: '#FF5722', // Koyu Turuncu
  weeklyCompleted: '#009688', // Turkuaz
  monthlyPending: '#673AB7', // Mor
  monthlyCompleted: '#795548' // Kahverengi
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
    weeklyPendingTasks?: number;
    weeklyCompletedTasks?: number;
    monthlyPendingTasks?: number;
    monthlyCompletedTasks?: number;
  };
  isManager?: boolean;
  showDailyStats?: boolean;
  showWeeklyMonthly?: boolean;
  onPersonnelClick?: () => void;
  onTasksClick?: () => void;
  onPendingTasksClick?: () => void;
  onCompletedTasksClick?: () => void;
  onWeeklyPendingTasksClick?: () => void;
  onWeeklyCompletedTasksClick?: () => void;
  onMonthlyPendingTasksClick?: () => void;
  onMonthlyCompletedTasksClick?: () => void;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  isManager = false,
  showDailyStats = true,
  showWeeklyMonthly = true,
  onPersonnelClick,
  onTasksClick,
  onPendingTasksClick,
  onCompletedTasksClick,
  onWeeklyPendingTasksClick,
  onWeeklyCompletedTasksClick,
  onMonthlyPendingTasksClick,
  onMonthlyCompletedTasksClick,
}) => {
  return (
    <Grid container spacing={1} sx={{ mb: 2 }} className="stat-cards-section">
      {showDailyStats && (
        <>
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
        </>
      )}

      {showWeeklyMonthly && (
        <>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard 
              bgcolor={THEME_COLORS.weeklyPending} 
              onClick={onWeeklyPendingTasksClick}
            >
              <IconBox bgcolor={THEME_COLORS.weeklyPending}>
                <CalendarIcon />
              </IconBox>
              <StatsText>
                <Typography variant="h6" fontWeight="bold">
                  {stats.weeklyPendingTasks || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Toplam Haftalık Görev
                </Typography>
              </StatsText>
            </StatsCard>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard 
              bgcolor={THEME_COLORS.weeklyCompleted}
              onClick={onWeeklyCompletedTasksClick}
            >
              <IconBox bgcolor={THEME_COLORS.weeklyCompleted}>
                <CalendarIcon />
              </IconBox>
              <StatsText>
                <Typography variant="h6" fontWeight="bold">
                  {stats.weeklyCompletedTasks || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Tamamlanan Haftalık Görev
                </Typography>
              </StatsText>
            </StatsCard>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard 
              bgcolor={THEME_COLORS.monthlyPending} 
              onClick={onMonthlyPendingTasksClick}
            >
              <IconBox bgcolor={THEME_COLORS.monthlyPending}>
                <CalendarIcon />
              </IconBox>
              <StatsText>
                <Typography variant="h6" fontWeight="bold">
                  {stats.monthlyPendingTasks || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Toplam Aylık Görev
                </Typography>
              </StatsText>
            </StatsCard>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard 
              bgcolor={THEME_COLORS.monthlyCompleted}
              onClick={onMonthlyCompletedTasksClick}
            >
              <IconBox bgcolor={THEME_COLORS.monthlyCompleted}>
                <CalendarIcon />
              </IconBox>
              <StatsText>
                <Typography variant="h6" fontWeight="bold">
                  {stats.monthlyCompletedTasks || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Tamamlanan Aylık Görev
                </Typography>
              </StatsText>
            </StatsCard>
          </Grid>
        </>
      )}
    </Grid>
  );
};

export default StatsCards; 