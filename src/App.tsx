/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ReceptionLogin from './pages/ReceptionLogin';
import AdminLogin from './pages/AdminLogin';
import { ProtectedRoute } from './components/ProtectedRoute';

// Composant placeholder pour les dashboards
const DashboardPlaceholder = ({ title }) => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
    <p className="text-slate-500 mt-2">Ce module est en cours de développement.</p>
  </div>
);

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/reception/login" replace />} />
        
        {/* Auth routes */}
        <Route path="/reception/login" element={<ReceptionLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Reception layout */}
        <Route path="/reception" element={
          <ProtectedRoute>
            <DashboardPlaceholder title="Dashboard Réception" />
          </ProtectedRoute>
        } />
        
        {/* Admin layout */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardPlaceholder title="Dashboard Admin" />
          </ProtectedRoute>
        } />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/reception/login" replace />} />
      </Routes>
    </Router>
  );
}
