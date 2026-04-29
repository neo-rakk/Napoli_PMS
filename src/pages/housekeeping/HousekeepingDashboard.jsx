import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function HousekeepingDashboard() {
  const { token } = useAuthStore();
  const [chambres, setChambres] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChambres = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chambres', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setChambres(Array.isArray(data) ? data.filter(c => ['sale', 'en_nettoyage'].includes(c.statut)) : []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchChambres();
    const interval = setInterval(fetchChambres, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleStatusChange = async (chambreId, newStatut) => {
    try {
      const res = await fetch(`/api/chambres/${chambreId}/statut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ statut: newStatut })
      });
      if(res.ok) fetchChambres();
    } catch(e) { console.error(e); }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tâches de Nettoyage</h2>
          <p className="text-slate-500">Chambres en attente de préparation ou en cours.</p>
        </div>
        <Button onClick={fetchChambres} variant="outline">Rafraîchir</Button>
      </div>

      {loading && chambres.length === 0 ? (
        <div className="text-center p-8 text-slate-500">Chargement...</div>
      ) : chambres.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
           <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
           </div>
           <h3 className="text-xl font-bold text-slate-800 mb-2">Tout est propre !</h3>
           <p className="text-slate-500">Aucune chambre nécessitant un nettoyage actuellement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chambres.map(c => (
            <div key={c.id} className={`bg-white rounded-xl border-l-4 p-5 shadow-sm flex flex-col ${c.statut === 'sale' ? 'border-l-purple-500' : 'border-l-emerald-500'}`}>
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <div className="text-3xl font-black font-mono tracking-tighter text-slate-800">{c.numero}</div>
                   <div className="text-sm text-slate-500 font-bold uppercase">{c.bloc_nom} ({c.type})</div>
                 </div>
                 <div className={`px-2 py-1 text-xs font-bold uppercase rounded ${c.statut === 'sale' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                   {c.statut.replace('_', ' ')}
                 </div>
               </div>
               
               <div className="mt-auto pt-4 border-t border-slate-100 flex justify-end">
                 {c.statut === 'sale' && (
                   <Button onClick={() => handleStatusChange(c.id, 'en_nettoyage')} className="w-full bg-emerald-600 hover:bg-emerald-700">Commencer Nettoyage</Button>
                 )}
                 {c.statut === 'en_nettoyage' && (
                   <Button onClick={() => handleStatusChange(c.id, 'libre')} className="w-full bg-emerald-600 hover:bg-emerald-700">Terminer (Propre)</Button>
                 )}
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
