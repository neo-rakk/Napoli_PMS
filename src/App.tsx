/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ReceptionLogin from './pages/ReceptionLogin';
import AdminLogin from './pages/AdminLogin';
import PublicInscription from './pages/PublicInscription';
import { ProtectedRoute } from './components/ProtectedRoute';

import ReceptionLayout from './layouts/ReceptionLayout';
import PreInscriptionsList from './pages/reception/PreInscriptionsList';

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
        <Route path="/" element={<PublicInscription />} />
        
        {/* Auth routes */}
        <Route path="/reception/login" element={<ReceptionLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Reception layout */}
        <Route path="/reception" element={
          <ProtectedRoute>
            <ReceptionLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="accueil/attente" replace />} />
          <Route path="accueil/attente" element={<PreInscriptionsList />} />
          <Route path="accueil/checkin" element={<DashboardPlaceholder title="Check-In" />} />
          <Route path="accueil/checkout" element={<DashboardPlaceholder title="Check-Out" />} />
          <Route path="groupes" element={<DashboardPlaceholder title="Groupes" />} />
          <Route path="reservations" element={<DashboardPlaceholder title="Réservations" />} />
          <Route path="planning" element={<DashboardPlaceholder title="Planning" />} />
          <Route path="chambres" element={<DashboardPlaceholder title="Chambres" />} />
          <Route path="caisse" element={<DashboardPlaceholder title="Caisse" />} />
        </Route>
        
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
