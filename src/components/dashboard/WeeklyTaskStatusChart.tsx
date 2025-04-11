import React from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardHeader, 
  Divider, 
  IconButton,
  styled,
  useTheme
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { InfoOutlined as InfoIcon } from '@mui/icons-material';

// Tema renkleri
const THEME_COLORS = {
  personnel: '#1976D2', // Mavi
  tasks: '#9C27B0',     // Mor
  pending: '#FF9800',   // Turuncu
  completed: '#4CAF50'  // Yeşil
};

// Grafik için renkler
const COLORS = [THEME_COLORS.completed, '#1976D2', '#2196F3', THEME_COLORS.pending, '#F44336', '#9E9E9E'];

// Chart Container
const ChartContainer = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  borderRadius: 8,
  '& .MuiTypography-h6': {
    fontSize: '1rem',
    fontWeight: 'bold',
  },
}));

interface TaskStatusData {
  name: string;
  value: number;
  color: string;
}

interface WeeklyTaskStatusChartProps {
  weeklyTaskStatusData: TaskStatusData[];
  onInfoClick: () => void;
}

const WeeklyTaskStatusChart: React.FC<WeeklyTaskStatusChartProps> = ({ weeklyTaskStatusData, onInfoClick }) => {
  const theme = useTheme();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 2, boxShadow: 3, borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">{payload[0].name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: payload[0].payload.color, borderRadius: '50%' }} />
            <Typography variant="body2">{payload[0].value} Görev</Typography>
          </Box>
        </Box>
      );
    }
    return null;
  };

  return (
    <ChartContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" fontWeight="bold">
          Haftalık Görev Durumu Dağılımı
        </Typography>
        <IconButton onClick={onInfoClick} size="small">
          <InfoIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 1 }} />
      
      {weeklyTaskStatusData.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <Typography variant="body2" color="textSecondary">Henüz haftalık görev bulunmuyor</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={weeklyTaskStatusData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              labelLine={false}
              label={false}
            >
              {weeklyTaskStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={24} 
              formatter={(value, entry, index) => {
                const total = weeklyTaskStatusData.reduce((sum, item) => sum + item.value, 0);
                const percent = total > 0 ? ((weeklyTaskStatusData[index].value / total) * 100).toFixed(0) : 0;
                return `${value} (%${percent})`;
              }}
              wrapperStyle={{ fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
};

export default WeeklyTaskStatusChart; 