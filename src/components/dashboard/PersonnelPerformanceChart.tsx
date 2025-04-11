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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  LabelList
} from 'recharts';
import { InfoOutlined as InfoIcon } from '@mui/icons-material';

// Tema renkleri
const THEME_COLORS = {
  personnel: '#1976D2', // Mavi
  tasks: '#9C27B0',     // Mor
  pending: '#FF9800',   // Turuncu
  completed: '#4CAF50'  // Yeşil
};

// Personel performans grafiği için renkler
const PERFORMANCE_COLORS = {
  completed: THEME_COLORS.completed, // Tamamlanan görevler için yeşil
  pending: '#1976D2',                // Devam eden görevler için mavi
  missed: '#F44336'                  // Kaçırılan görevler için kırmızı
};

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

interface PerformanceData {
  name: string;
  completed: number;
  pending: number;
  missed: number;
}

interface PersonnelPerformanceChartProps {
  personnelPerformanceData: PerformanceData[];
  onInfoClick: () => void;
}

const PersonnelPerformanceChart: React.FC<PersonnelPerformanceChartProps> = ({ 
  personnelPerformanceData, 
  onInfoClick 
}) => {
  const theme = useTheme();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'background.paper', p: 2, boxShadow: 3, borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">{payload[0]?.payload.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: PERFORMANCE_COLORS.completed, borderRadius: '50%' }} />
            <Typography variant="body2">Tamamlanan: {payload[0]?.value}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: PERFORMANCE_COLORS.pending, borderRadius: '50%' }} />
            <Typography variant="body2">Devam Eden: {payload[1]?.value}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: PERFORMANCE_COLORS.missed, borderRadius: '50%' }} />
            <Typography variant="body2">Kaçırılan: {payload[2]?.value}</Typography>
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
          Personel Performansı
        </Typography>
        <IconButton onClick={onInfoClick} size="small">
          <InfoIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider sx={{ mb: 1 }} />
      
      {personnelPerformanceData.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}>
          <Typography variant="body2" color="textSecondary">Henüz personel performans verisi bulunmuyor</Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={personnelPerformanceData.slice(0, 5)}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" />
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={{ fontSize: 12 }}
              width={150}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={24} />
            <Bar 
              dataKey="completed" 
              stackId="a" 
              fill={PERFORMANCE_COLORS.completed} 
              name="Tamamlanan" 
              barSize={20}
            >
              <LabelList dataKey="completed" position="right" style={{ fill: theme.palette.text.primary }} />
            </Bar>
            <Bar 
              dataKey="pending" 
              stackId="a" 
              fill={PERFORMANCE_COLORS.pending} 
              name="Devam Eden"
              barSize={20}
            >
              <LabelList dataKey="pending" position="right" style={{ fill: theme.palette.text.primary }} />
            </Bar>
            <Bar 
              dataKey="missed" 
              stackId="a" 
              fill={PERFORMANCE_COLORS.missed} 
              name="Kaçırılan"
              barSize={20}
            >
              <LabelList dataKey="missed" position="right" style={{ fill: theme.palette.text.primary }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
};

export default PersonnelPerformanceChart; 