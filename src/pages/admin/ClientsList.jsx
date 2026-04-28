import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function ClientsListAdmin() {
  const { token } = useAuthStore();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/clients', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setClients(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Gestion des Clients</h1>
        <p className="text-slate-500">Base de données complète de tous les clients.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Nom</th>
              <th className="px-6 py-4 font-semibold">Prenom</th>
              <th className="px-6 py-4 font-semibold">Nationalité</th>
              <th className="px-6 py-4 font-semibold">Identité</th>
              <th className="px-6 py-4 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan="5" className="p-6 text-center">Chargement...</td></tr> : 
             (Array.isArray(clients) ? clients : []).map(c => (
               <tr key={c.id}>
                 <td className="px-6 py-4 font-bold text-slate-800">{c.nom}</td>
                 <td className="px-6 py-4">{c.prenom}</td>
                 <td className="px-6 py-4">{c.nationalite}</td>
                 <td className="px-6 py-4">{c.est_etranger ? c.num_piece : c.nin}</td>
                 <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-bold uppercase bg-slate-100">{c.statut}</span>
                 </td>
               </tr>
             ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
