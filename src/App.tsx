import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/Login';
// Register sayfasını yorum satırına alıyoruz çünkü artık kullanmayacağız
// import Register from './components/Register';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import './App.css';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './components/dashboard/Dashboard';
import Tasks from './components/tasks/Tasks';
import Personnel from './components/personnel/Personnel';
import Profile from './components/profile/Profile';
import Reports from './components/reports/Reports';

// Henüz oluşturulmamış diğer sayfalar için geçici bileşenler
// const Reports = () => <div>Raporlar Sayfası</div>;

// Tema oluşturma
const theme = createTheme({
  palette: {
    primary: {
      main: '#0D47A1',
    },
    secondary: {
      main: '#1976D2',
    },
    background: {
      default: '#F5F7FA',
    },
  },
  typography: {
    fontFamily: [
      'Poppins',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Özel PrivateRoute bileşeni
const PrivateRoute = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  // Kullanıcı girişi yoksa Login sayfasına yönlendir
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Kullanıcı girişi varsa alt route'ları render et
  return <Outlet />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Private Routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
              <Route path="/tasks" element={<MainLayout><Tasks /></MainLayout>} />
              <Route path="/personnel" element={<MainLayout><Personnel /></MainLayout>} />
              <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
              <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
            </Route>
            
            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
