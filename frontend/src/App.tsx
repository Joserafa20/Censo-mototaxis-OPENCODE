import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Periods from './pages/Periods';
import Stations from './pages/Stations';
import CensusRecords from './pages/CensusRecords';
import Reports from './pages/Reports';
import Stickers from './pages/Stickers';
import Verify from './pages/Verify';
import OfflineBadge from './components/OfflineBadge';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/verify/:folio" element={<Verify />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
            <Route path="periods" element={<ProtectedRoute><Periods /></ProtectedRoute>} />
            <Route path="stations" element={<Stations />} />
            <Route path="census" element={<CensusRecords />} />
            <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="stickers" element={<ProtectedRoute><Stickers /></ProtectedRoute>} />
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <OfflineBadge />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
