import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Login from './components/Login';
import Register from './components/Register';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import './App.css';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './components/dashboard/Dashboard';
import Tasks from './components/tasks/Tasks';
import Personnel from './components/personnel/Personnel';
import Profile from './components/profile/Profile';
import Reports from './components/reports/Reports';
import Messages from './components/messages/Messages';
import Surveys from './pages/Surveys';
import PublicSurvey from './pages/PublicSurvey';
import ShiftsPage from './pages/Shifts';
import BranchesPage from './pages/Branches';
import CustomerScreenPage from './pages/CustomerScreen';
import ManagerPage from './pages/ManagerDashboard';

// Henüz oluşturulmamış diğer sayfalar için geçici bileşenler
// const Reports = () => <div>Raporlar Sayfası</div>;
// Geçici Messages bileşeni yerine gerçek bileşeni kullanıyoruz

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
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  
  // Auth durumu yüklenirken loading göster
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Giriş yapılmamışsa login sayfasına yönlendir
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Giriş yapılmışsa ilgili route'a erişim sağla
  return <Outlet />;
};

// Rol bazlı Route bileşeni
const RoleRoute = ({ requiredRole }: { requiredRole: string }) => {
  const { userDetails, loading } = useAuth();
  const location = useLocation();
  
  // Auth durumu yüklenirken loading göster
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Rolü kontrol et
  if (userDetails?.role !== requiredRole) {
    // role == 'manager' ise manager sayfasına, role == 'admin' ise dashboard'a yönlendir
    if (userDetails?.role === 'manager') {
      return <Navigate to="/manager" replace />;
    } else if (userDetails?.role === 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    // Employee veya diğer roller için login'e yönlendir
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Rol doğruysa içeriği göster
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
            <Route path="/register" element={<Register />} />
            
            {/* Public Routes */}
            <Route path="/surveys/:taskId" element={<PublicSurvey />} />
            
            {/* Admin Routes */}
            <Route element={<PrivateRoute />}>
              <Route element={<RoleRoute requiredRole="admin" />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
                <Route path="/tasks" element={<MainLayout><Tasks /></MainLayout>} />
                <Route path="/personnel" element={<MainLayout><Personnel /></MainLayout>} />
                <Route path="/shifts" element={<MainLayout><ShiftsPage /></MainLayout>} />
                <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
                <Route path="/messages" element={<MainLayout><Messages /></MainLayout>} />
                <Route path="/surveys" element={<MainLayout><Surveys /></MainLayout>} />
                <Route path="/branches" element={<MainLayout><BranchesPage /></MainLayout>} />
                <Route path="/customer-screen" element={<MainLayout><CustomerScreenPage /></MainLayout>} />
                <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
              </Route>
              
              {/* Manager Routes */}
              <Route element={<RoleRoute requiredRole="manager" />}>
                <Route path="/manager" element={<ManagerPage />} />
              </Route>
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
