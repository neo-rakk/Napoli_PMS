import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function CaisseJournaliere() {
  const { token, user } = useAuthStore();
  const [encaissements, setEncaissements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEncaissements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/encaissements/journal', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setEncaissements(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchEncaissements();
  }, [token]);

  const stats = (Array.isArray(encaissements) ? encaissements : []).reduce((acc, curr) => {
     acc.total += parseFloat(curr.montant);
     acc[curr.type_paiement] = (acc[curr.type_paiement] || 0) + parseFloat(curr.montant);
     return acc;
  }, { total: 0, especes: 0, carte: 0, cheque: 0 });

  return (
    <div className="p-8 max-w-6xl mx-auto">
       <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Caisse Journalière</h1>
          <p className="text-slate-500">Supervision des encaissements du jour de l'agent courant.</p>
       </div>

       <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white border rounded-xl shadow-sm p-6 text-center">
             <div className="text-slate-500 font-semibold mb-1 uppercase text-sm tracking-wider">Total Encaissé</div>
             <div className="text-3xl font-black text-slate-800">{stats.total.toLocaleString()} DZD</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm p-6 text-center">
             <div className="text-emerald-700 font-semibold mb-1 uppercase text-sm tracking-wider">Espèces (Cash)</div>
             <div className="text-3xl font-black text-emerald-900">{stats.especes.toLocaleString()} DZD</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm p-6 text-center">
             <div className="text-emerald-700 font-semibold mb-1 uppercase text-sm tracking-wider">Carte (TPE)</div>
             <div className="text-3xl font-black text-emerald-900">{stats.carte.toLocaleString()} DZD</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm p-6 text-center flex flex-col justify-center">
             <div className="text-emerald-700 font-semibold mb-1 uppercase text-sm tracking-wider">Chèque</div>
             <div className="text-3xl font-black text-emerald-900">{stats.cheque.toLocaleString()} DZD</div>
          </div>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Heure</th>
                <th className="px-6 py-4 font-semibold">Client / Chambre</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold">Agent</th>
                <th className="px-6 py-4 font-semibold">Méthode</th>
                <th className="px-6 py-4 font-semibold text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan="6" className="p-6 text-center">Chargement...</td></tr>}
              {!loading && encaissements.length === 0 && <tr><td colSpan="6" className="p-6 text-center">Aucun encaissement.</td></tr>}
              {Array.isArray(encaissements) && encaissements.map(e => (
                 <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono">{new Date(e.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{e.client_nom || '-'} {e.client_prenom || '-'}{e.chambre_numero ? ` (Ch. ${e.chambre_numero})` : ''}</td>
                    <td className="px-6 py-4 text-slate-500">{e.description || 'Paiement standard'}</td>
                    <td className="px-6 py-4">{e.agent_prenom} {e.agent_nom}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${e.type_paiement === 'especes' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                         {e.type_paiement}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">{parseFloat(e.montant).toLocaleString()} DZD</td>
                 </tr>
              ))}
            </tbody>
          </table>
       </div>
    </div>
  );
}
