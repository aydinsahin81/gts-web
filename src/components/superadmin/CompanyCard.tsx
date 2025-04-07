import React from 'react';
import { 
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  Button, 
  Box, 
  Grid,
  Avatar
} from '@mui/material';
import { 
  People as PeopleIcon, 
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Poll as PollIcon
} from '@mui/icons-material';
import StatCard from './StatCard';

interface CompanyStats {
  personnelCount: number;
  branchCount: number;
  activeTasks: number;
  completedTasks: number;
  shifts: number;
  surveys: number;
}

interface CompanyCardProps {
  id: string;
  name: string;
  logo?: string;
  admin: {
    name: string;
    email: string;
  };
  stats: CompanyStats;
  onViewDetails: (id: string) => void;
}

const CompanyCard: React.FC<CompanyCardProps> = ({
  id,
  name,
  logo,
  admin,
  stats,
  onViewDetails
}) => {
  return (
    <Card sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 3
      }
    }}>
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.1)'
      }}>
        <Avatar
          src={logo}
          alt={name}
          sx={{ 
            width: 50, 
            height: 50,
            mr: 2,
            bgcolor: '#102648'
          }}
        >
          {name.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="h6" noWrap>
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {admin?.name || 'Admin Bilgisi Yok'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {admin?.email || 'Email Bilgisi Yok'}
          </Typography>
        </Box>
      </Box>
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <StatCard
              title="Personel"
              value={stats.personnelCount}
              icon={<PeopleIcon />}
              color="#2196F3"
            />
          </Grid>
          <Grid item xs={6}>
            <StatCard
              title="Şubeler"
              value={stats.branchCount}
              icon={<BusinessIcon />}
              color="#4CAF50"
            />
          </Grid>
          <Grid item xs={6}>
            <StatCard
              title="Aktif Görevler"
              value={stats.activeTasks}
              icon={<AssignmentIcon />}
              color="#FF9800"
            />
          </Grid>
          <Grid item xs={6}>
            <StatCard
              title="Tamamlanan"
              value={stats.completedTasks}
              icon={<CheckCircleIcon />}
              color="#9C27B0"
            />
          </Grid>
          <Grid item xs={6}>
            <StatCard
              title="Vardiyalar"
              value={stats.shifts}
              icon={<AccessTimeIcon />}
              color="#E91E63"
            />
          </Grid>
          <Grid item xs={6}>
            <StatCard
              title="Anketler"
              value={stats.surveys}
              icon={<PollIcon />}
              color="#00BCD4"
            />
          </Grid>
        </Grid>
      </CardContent>
      
      <Box sx={{ p: 2 }}>
        <Button 
          variant="contained" 
          fullWidth
          onClick={() => onViewDetails(id)}
          sx={{
            bgcolor: '#102648',
            '&:hover': {
              bgcolor: '#0D1F3C'
            }
          }}
        >
          Detayları Gör
        </Button>
      </Box>
    </Card>
  );
};

export default CompanyCard; 