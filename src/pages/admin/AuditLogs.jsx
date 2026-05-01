import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function AuditLogs() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats/audit', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          console.error("Erreur serveur:", data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Logs d'Activité</h1>
        <p className="text-slate-500">Traçabilité complète des actions des utilisateurs sur le système.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Date & Heure</th>
              <th className="px-6 py-4 font-semibold">Agent</th>
              <th className="px-6 py-4 font-semibold">Action</th>
              <th className="px-6 py-4 font-semibold">Entité Affectée</th>
              <th className="px-6 py-4 font-semibold">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan="5" className="p-6 text-center">Chargement...</td></tr>}
            {!loading && Array.isArray(logs) && logs.map(l => (
              <tr key={l.id}>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                <td className="px-6 py-4 font-medium">{l.agent_nom} {l.agent_prenom}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold">{l.action}</span>
                </td>
                <td className="px-6 py-4 font-mono text-xs">
                  {l.table_cible} {l.enregistrement_id ? `(#${l.enregistrement_id})` : ''}
                </td>
                <td className="px-6 py-4 text-xs font-mono">{l.details ? JSON.stringify(l.details) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
