import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function AdminHebergement() {
  const { token } = useAuthStore();
  const [chambres, setChambres] = useState([]);
  
  useEffect(() => {
    fetch('/api/chambres', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(setChambres)
      .catch(console.error);
  }, [token]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Chambres & Blocs</h1>
        <p className="text-slate-500">Gestion du parc immobilier.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Chambre</th>
              <th className="px-6 py-4 font-semibold">Bloc / Bâtiment</th>
              <th className="px-6 py-4 font-semibold">Étage</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Capacité</th>
              <th className="px-6 py-4 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {chambres.map(c => (
              <tr key={c.id}>
                <td className="px-6 py-4 font-bold text-slate-800">{c.numero}</td>
                <td className="px-6 py-4">{c.bloc_nom}</td>
                <td className="px-6 py-4">{c.etage}</td>
                <td className="px-6 py-4 uppercase font-bold text-xs">{c.type}</td>
                <td className="px-6 py-4">{c.capacite_max} lits</td>
                <td className="px-6 py-4">{c.statut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
