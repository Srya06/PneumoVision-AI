import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import PatientRegistration from './pages/PatientRegistration';
import PatientHistory from './pages/PatientHistory';
import Prediction from './pages/Prediction';
import ReportViewer from './pages/ReportViewer';
import Settings from './pages/Settings';
import AdminDoctors from './pages/AdminDoctors';
import NotFound from './pages/NotFound';
import Login from './pages/Login';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Routes>
      {/* Root & login routes */}
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Doctor Routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="predict" element={<Prediction />} />
        <Route path="patient/new" element={<PatientRegistration />} />
        <Route path="patients" element={<PatientHistory />} />
        <Route path="reports" element={<ReportViewer />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route path="doctors" element={<AdminDoctors />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0F172A',
                color: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #334155',
                fontSize: '13px',
                fontWeight: '600',
              },
            }}
          />
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
