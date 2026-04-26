import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function GroupesList() {
  const { token } = useAuthStore();
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGroupes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/groupes', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setGroupes(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchGroupes();
  }, [token]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Groupes / Délégations</h1>
          <p className="text-slate-500">Consultez et gérez les groupes prévus.</p>
        </div>
        <Button>Nouveau Groupe</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Nom du Groupe</th>
              <th className="px-6 py-4 font-semibold">Référence</th>
              <th className="px-6 py-4 font-semibold">Pays</th>
              <th className="px-6 py-4 font-semibold">Chef de Délégation</th>
              <th className="px-6 py-4 font-semibold text-right">Membres (Prévu)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan="5" className="p-6 text-center">Chargement...</td></tr>}
            {!loading && groupes.length === 0 && <tr><td colSpan="5" className="p-6 text-center">Aucun groupe trouvé.</td></tr>}
            {groupes.map(g => (
               <tr key={g.id} className="hover:bg-slate-50">
                 <td className="px-6 py-4 font-bold text-slate-800">{g.nom}</td>
                 <td className="px-6 py-4 font-mono">{g.reference}</td>
                 <td className="px-6 py-4">{g.pays}</td>
                 <td className="px-6 py-4">{g.chef_delegation}</td>
                 <td className="px-6 py-4 text-right font-bold">{g.nombre_membres_prevu}</td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
