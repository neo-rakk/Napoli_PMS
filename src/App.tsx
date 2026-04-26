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
import CheckIn from './pages/reception/CheckIn';
import CheckOut from './pages/reception/CheckOut';
import ChambresPlan from './pages/reception/ChambresPlan';
import CaisseJournaliere from './pages/reception/CaisseJournaliere';
import ReservationsList from './pages/reception/ReservationsList';
import GroupesList from './pages/reception/GroupesList';
import Planning from './pages/reception/Planning';
import MainCourante from './pages/reception/MainCourante';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AgentsList from './pages/admin/AgentsList';
import ClientsListAdmin from './pages/admin/ClientsList';
import AdminHebergement from './pages/admin/AdminHebergement';
import AdminFacturation from './pages/admin/AdminFacturation';
import AuditLogs from './pages/admin/AuditLogs';
import MaintenanceReception from './pages/reception/MaintenanceReception';

import HousekeepingLayout from './layouts/HousekeepingLayout';
import HousekeepingDashboard from './pages/housekeeping/HousekeepingDashboard';
import SecurityLayout from './layouts/SecurityLayout';
import SecurityDashboard from './pages/security/SecurityDashboard';
import MaintenanceLayout from './layouts/MaintenanceLayout';
import MaintenanceDashboard from './pages/maintenance/MaintenanceDashboard';

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
          <Route path="accueil/checkin" element={<CheckIn />} />
          <Route path="accueil/checkout" element={<CheckOut />} />
          <Route path="groupes" element={<GroupesList />} />
          <Route path="reservations" element={<ReservationsList />} />
          <Route path="planning" element={<Planning />} />
          <Route path="chambres" element={<ChambresPlan />} />
          <Route path="caisse" element={<CaisseJournaliere />} />
          <Route path="cloture" element={<MainCourante />} />
          <Route path="maintenance" element={<MaintenanceReception />} />
        </Route>
        
        {/* Admin layout */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="agents" element={<AgentsList />} />
          <Route path="clients" element={<ClientsListAdmin />} />
          <Route path="hebergement" element={<AdminHebergement />} />
          <Route path="facturation" element={<AdminFacturation />} />
          <Route path="parametres" element={<AuditLogs />} />
        </Route>

        {/* Housekeeping layout */}
        <Route path="/housekeeping" element={
          <ProtectedRoute allowedRoles={['housekeeping', 'admin']}>
            <HousekeepingLayout />
          </ProtectedRoute>
        }>
          <Route index element={<HousekeepingDashboard />} />
        </Route>

        {/* Maintenance layout */}
        <Route path="/maintenance" element={
          <ProtectedRoute allowedRoles={['maintenance', 'admin']}>
            <MaintenanceLayout />
          </ProtectedRoute>
        }>
          <Route index element={<MaintenanceDashboard />} />
        </Route>

        {/* Security layout */}
        <Route path="/securite" element={
          <ProtectedRoute allowedRoles={['securite', 'admin']}>
            <SecurityLayout />
          </ProtectedRoute>
        }>
          <Route index element={<SecurityDashboard />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/reception/login" replace />} />
      </Routes>
    </Router>
  );
}
