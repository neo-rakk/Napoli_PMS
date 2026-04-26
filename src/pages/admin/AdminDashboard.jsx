import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function AdminDashboard() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/stats/summary', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, [token]);

  if (!stats) return <div className="p-8">Chargement des statistiques...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord Admin</h1>
        <p className="text-slate-500">Vue d'ensemble de l'activité du Village Olympique.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Chambres Occupées</div>
          <div className="text-3xl font-black text-slate-800">{stats.chambres_occupees} <span className="text-lg font-medium text-slate-500">/ {stats.total_chambres}</span></div>
          <div className="mt-2 text-xs text-indigo-600 font-bold bg-indigo-50 inline-block px-2 py-1 rounded">
             {Math.round((stats.chambres_occupees / Math.max(1, stats.total_chambres)) * 100)}% Occupation
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Clients (In-House)</div>
          <div className="text-3xl font-black text-slate-800">{stats.clients_inhouse}</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Arrivées du Jour</div>
          <div className="text-3xl font-black text-emerald-600">{stats.checkins_today}</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-semibold text-slate-500 mb-1 uppercase tracking-wider">Départs du Jour</div>
          <div className="text-3xl font-black text-amber-600">{stats.checkouts_today}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
           <h2 className="text-lg font-bold mb-4">Activité Récente</h2>
           <div className="text-slate-500 text-sm">Les derniers logs (Check-in, Check-out, Encaissements) apparaîtront ici.</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
           <h2 className="text-lg font-bold mb-4">Disponibilité par Bloc</h2>
           <div className="text-slate-500 text-sm">Graphique des disponibilités à venir.</div>
        </div>
      </div>
    </div>
  );
}
