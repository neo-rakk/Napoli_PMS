import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function HousekeepingDashboard() {
  const { token, user } = useAuthStore();
  const [taches, setTaches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTaches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/housekeeping?statut=a_faire,en_cours', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTaches(Array.isArray(data) ? data : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if(!token) return;
    fetchTaches();
    const interval = setInterval(fetchTaches, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleStatusChange = async (tacheId, newStatut) => {
    try {
      await fetch(`/api/housekeeping/${tacheId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          statut: newStatut, 
          heure_debut: newStatut === 'en_cours' ? new Date().toTimeString().slice(0,5) : undefined, 
          heure_fin: newStatut === 'fait' ? new Date().toTimeString().slice(0,5) : undefined 
        })
      });
      fetchTaches();
    } catch(e) { console.error(e); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tâches Housekeeping</h2>
          <p className="text-slate-500">{taches.length} tâche(s) en attente ou en cours.</p>
        </div>
        <Button onClick={fetchTaches} variant="outline">Rafraîchir</Button>
      </div>

      {loading && taches.length === 0 ? (
        <div className="text-center p-8 text-slate-500">Chargement...</div>
      ) : taches.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
          <h3 className="text-xl font-bold text-slate-800 mb-2">Toutes les tâches sont terminées !</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {taches.map(t => (
            <div key={t.id} className={`bg-white rounded-xl border-l-4 p-5 shadow-sm flex flex-col ${t.priorite === 'urgente' ? 'border-l-red-500' : t.statut === 'en_cours' ? 'border-l-emerald-500' : 'border-l-purple-500'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-3xl font-black font-mono tracking-tighter text-slate-800">{t.chambre_numero}</div>
                  <div className="text-sm text-slate-500 font-bold uppercase">{t.chambre_bloc} — {t.type} — Étage {t.etage}</div>
                </div>
                <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${t.priorite === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                  {t.priorite}
                </span>
              </div>
              <div className="text-sm text-slate-600 mb-2 font-medium uppercase">{t.type}</div>
              <div className="mt-auto pt-4 border-t border-slate-100">
                {t.statut === 'a_faire' && (
                  <Button onClick={() => handleStatusChange(t.id, 'en_cours')} className="w-full bg-emerald-600 hover:bg-emerald-700">Commencer</Button>
                )}
                {t.statut === 'en_cours' && (
                  <Button onClick={() => handleStatusChange(t.id, 'fait')} className="w-full bg-emerald-600 hover:bg-emerald-700">Marquer Terminé</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
