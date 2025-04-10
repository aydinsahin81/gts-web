import React, { useEffect } from 'react';
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
import ManagerProfilePage from './pages/ManagerProfile';
import SuperAdmin from './components/superadmin/SuperAdmin';
import TaskCheckerEndpoint from './api/TaskCheckerEndpoint';
import Reservations from './components/reservations/Reservations';

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

// API endpoint'leri yönlendir - useEffect dışında tanımla
const handleApiRequest = async (path: string, req: any, res: any) => {
  const endpoint = TaskCheckerEndpoint.getInstance();
  
  // API anahtarını al (query veya header'dan)
  const apiKey = req.query?.key || req.headers?.['x-api-key'] || '';
  
  if (path === '/api/run-task-checker') {
    const result = await endpoint.runTaskChecker(apiKey);
    res.status(result.success ? 200 : 401).json(result);
    return;
  }
  
  if (path === '/api/health') {
    res.status(200).json(endpoint.getHealth());
    return;
  }
  
  if (path === '/api/logs' && endpoint.validateApiKey(apiKey)) {
    const logs = await endpoint.getLogs();
    res.status(200).json({ logs });
    return;
  }
  
  // Bilinmeyen API endpoint'i
  res.status(404).json({ success: false, message: 'Endpoint bulunamadı' });
};

// Typescript için window nesnesine özel alanlar ekle
declare global {
  interface Window {
    isApiRequest?: boolean;
    apiPath?: string;
    apiQuery?: string;
  }
}

const App: React.FC = () => {
  // API endpoint'lerini yakala
  useEffect(() => {
    // Sayfa yüklendiğinde API isteği olup olmadığını kontrol et
    if (window.isApiRequest) {
      const path = window.apiPath || '';
      const queryParams = new URLSearchParams(window.apiQuery || '');
      
      // İstek ve yanıt nesnelerini taklit et
      const req = {
        query: Object.fromEntries(queryParams),
        headers: {}
      };
      
      const res = {
        status: (code: number) => ({
          json: (data: any) => {
            // API yanıtını JSON olarak göster
            document.body.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            return { status: code, data };
          }
        })
      };
      
      // API isteğini işle
      handleApiRequest(path, req, res);
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/superadmin" element={<SuperAdmin />} />
            
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
                <Route path="/reservations" element={<MainLayout><Reservations /></MainLayout>} />
                <Route path="/branches" element={<MainLayout><BranchesPage /></MainLayout>} />
                <Route path="/customer-screen" element={<MainLayout><CustomerScreenPage /></MainLayout>} />
                <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
              </Route>
              
              {/* Manager Routes */}
              <Route element={<RoleRoute requiredRole="manager" />}>
                <Route path="/manager" element={<ManagerPage />} />
                <Route path="/manager/profile" element={<ManagerProfilePage />} />
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
