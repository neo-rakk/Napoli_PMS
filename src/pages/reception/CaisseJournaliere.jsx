import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function CaisseJournaliere() {
  const { token, user } = useAuthStore();
  const [encaissements, setEncaissements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const fetchEncaissements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/encaissements/journal', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setEncaissements(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchSessionStatus = async () => {
    setLoadingSession(true);
    try {
      const res = await fetch('/api/sessions-caisse/statut', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setSession(data.session);
    } catch(e) { console.error(e); }
    finally { setLoadingSession(false); }
  };

  useEffect(() => {
    fetchEncaissements();
    fetchSessionStatus();
  }, [token]);

  const handleOuvrirCaisse = async () => {
    const montant = prompt("Montant d'ouverture en caisse (DZD) :", "0");
    if (montant === null) return;
    try {
      const res = await fetch('/api/sessions-caisse/ouvrir', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ montant_ouverture: parseFloat(montant) || 0 })
      });
      const data = await res.json();
      if (res.ok) {
        fetchSessionStatus();
      } else {
        alert("Erreur: " + data.error);
      }
    } catch (e) {
      alert("Erreur réseau");
    }
  };

  const handleCloturerCaisse = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir clôturer cette session de caisse ?")) return;
    try {
      const res = await fetch('/api/sessions-caisse/cloturer', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({}) // API computes totals automatically
      });
      const data = await res.json();
      if (res.ok) {
        alert("Session clôturée avec succès.");
        fetchSessionStatus();
      } else {
        alert("Erreur: " + data.error);
      }
    } catch (e) {
      alert("Erreur réseau");
    }
  };


  const stats = (Array.isArray(encaissements) ? encaissements : []).reduce((acc, curr) => {
     acc.total += parseFloat(curr.montant);
     acc[curr.type_paiement] = (acc[curr.type_paiement] || 0) + parseFloat(curr.montant);
     return acc;
  }, { total: 0, especes: 0, carte: 0, cheque: 0 });

  return (
    <div className="p-8 max-w-6xl mx-auto">
       <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Caisse Journalière</h1>
            <p className="text-slate-500">Supervision des encaissements du jour de l'agent courant.</p>
          </div>
          <div>
            {loadingSession ? (
              <span className="text-slate-500">Chargement session...</span>
            ) : session ? (
              <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end">
                   <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Session Ouverte
                   </span>
                   <span className="text-xs text-slate-500 mt-1">
                     Montant initial: {(session.montant_ouverture || 0).toLocaleString()} DZD
                   </span>
                 </div>
                 <Button onClick={handleCloturerCaisse} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300">
                   Clôturer Session
                 </Button>
              </div>
            ) : (
              <div className="flex gap-4 items-center">
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-slate-400"></span> Session Fermée
                </span>
                <Button onClick={handleOuvrirCaisse} className="bg-emerald-600 hover:bg-emerald-700">
                  Ouvrir Session Caisse
                </Button>
              </div>
            )}
          </div>
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
                    <td className="px-6 py-4">
                      {e.montant < 0 ? (
                        <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-bold mr-2">REMBOURSEMENT</span>
                      ) : null}
                      <span className="text-slate-500">{e.description || 'Paiement standard'}</span>
                    </td>
                    <td className="px-6 py-4">{e.agent_prenom} {e.agent_nom}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${e.type_paiement === 'especes' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                         {e.type_paiement}
                       </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${parseFloat(e.montant) < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      {parseFloat(e.montant) > 0 ? "+" : ""}{parseFloat(e.montant).toLocaleString()} DZD
                    </td>
                 </tr>
              ))}
            </tbody>
          </table>
       </div>
    </div>
  );
}
