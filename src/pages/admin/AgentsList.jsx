import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function AgentsList() {
  const { token } = useAuthStore();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setAgents(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAgents();
  }, [token]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Agents</h1>
          <p className="text-slate-500">Gérez le personnel et les accès au système.</p>
        </div>
        <Button>Nouvel Agent</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Nom & Prénom</th>
              <th className="px-6 py-4 font-semibold">Matricule</th>
              <th className="px-6 py-4 font-semibold">Rôle</th>
              <th className="px-6 py-4 font-semibold">Téléphone</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan="6" className="p-6 text-center">Chargement...</td></tr>}
            {!loading && agents.length === 0 && <tr><td colSpan="6" className="p-6 text-center">Aucun agent trouvé.</td></tr>}
            {agents.map(a => (
               <tr key={a.id} className="hover:bg-slate-50">
                 <td className="px-6 py-4 font-bold text-slate-800">{a.nom} {a.prenom}</td>
                 <td className="px-6 py-4 font-mono">{a.matricule}</td>
                 <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded font-bold uppercase text-xs">
                      {a.role?.replace('_', ' ')}
                    </span>
                 </td>
                 <td className="px-6 py-4">{a.telephone || '-'}</td>
                 <td className="px-6 py-4">{a.email || '-'}</td>
                 <td className="px-6 py-4 text-right">
                    <Button variant="secondary" size="sm">Modifier</Button>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
