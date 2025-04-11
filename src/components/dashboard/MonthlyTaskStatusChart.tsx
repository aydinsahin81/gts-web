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

interface MonthlyTaskStatusChartProps {
  monthlyTaskStatusData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  onInfoClick: () => void;
}

const MonthlyTaskStatusChart: React.FC<MonthlyTaskStatusChartProps> = ({ 
  monthlyTaskStatusData, 
  onInfoClick 
}) => {
  const theme = useTheme();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 2, boxShadow: 3, borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">{payload[0].name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: payload[0].color, borderRadius: '50%' }} />
            <Typography variant="body2">{`${payload[0].value} görev (${(payload[0].percent * 100).toFixed(1)}%)`}</Typography>
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
          Aylık Görev Durumu Dağılımı
        </Typography>
        <IconButton onClick={onInfoClick} size="small">
          <InfoIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 1 }} />
      
      {monthlyTaskStatusData.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
          <Typography variant="body2" color="textSecondary">Henüz aylık görev verisi bulunmuyor</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={monthlyTaskStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {monthlyTaskStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={24} 
              formatter={(value, entry, index) => {
                const total = monthlyTaskStatusData.reduce((sum, item) => sum + item.value, 0);
                const percent = total > 0 ? ((monthlyTaskStatusData[index].value / total) * 100).toFixed(0) : 0;
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

export default MonthlyTaskStatusChart; 