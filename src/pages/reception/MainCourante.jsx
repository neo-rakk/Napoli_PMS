import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function MainCourante() {
  const { token } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats/summary', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(res => {
         // Also fetch today's actual caisse transactions
         fetch('/api/encaissements/journal', { headers: { 'Authorization': `Bearer ${token}` } })
           .then(r2 => r2.json())
           .then(data => {
             const journal = Array.isArray(data) ? data : [];
             const cash = journal.filter(j => j.methode === 'cash').reduce((a, b) => a + parseFloat(b.montant), 0);
             const tpe = journal.filter(j => j.methode === 'tpe').reduce((a, b) => a + parseFloat(b.montant), 0);
             setData({ ...res, revenue_cash: cash, revenue_tpe: tpe, transactions: journal.length });
             setLoading(false);
           });
      })
      .catch(console.error);
  }, [token]);

  if(loading || !data) return <div className="p-8">Chargement de la Main Courante...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Main Courante & Clôture</h1>
          <p className="text-slate-500">Bilan de l'activité journalière (Revenus, Mouvements, Occupation).</p>
        </div>
        <Button variant="primary">Valider la Clôture du Jour</Button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
         <div className="mb-8 border-b pb-4">
           <h2 className="text-lg font-bold uppercase tracking-wider text-slate-700 mb-2">Bilan Financier du {new Date().toLocaleDateString('fr-FR')}</h2>
           <div className="grid grid-cols-3 gap-6 mt-4">
             <div>
                <div className="text-slate-500 text-sm mb-1">Caisse Espèces</div>
                <div className="text-2xl font-black text-emerald-700">{data.revenue_cash.toLocaleString()} DZD</div>
             </div>
             <div>
                <div className="text-slate-500 text-sm mb-1">TPE / Virement</div>
                <div className="text-2xl font-black text-emerald-700">{data.revenue_tpe.toLocaleString()} DZD</div>
             </div>
             <div>
                <div className="text-slate-500 text-sm mb-1">Recette Totale</div>
                <div className="text-2xl font-black text-slate-800">{(data.revenue_cash + data.revenue_tpe).toLocaleString()} DZD</div>
             </div>
           </div>
         </div>

         <div className="mb-8 border-b pb-4">
           <h2 className="text-lg font-bold uppercase tracking-wider text-slate-700 mb-2">Mouvements Journaliers</h2>
           <div className="grid grid-cols-4 gap-6 mt-4 text-center">
             <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-slate-500 text-xs uppercase font-bold mb-1">Arrivées (Check-In)</div>
                <div className="text-xl font-bold">{data.checkins_today}</div>
             </div>
             <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-slate-500 text-xs uppercase font-bold mb-1">Départs (Check-Out)</div>
                <div className="text-xl font-bold">{data.checkouts_today}</div>
             </div>
             <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-slate-500 text-xs uppercase font-bold mb-1">Nb. Transactions</div>
                <div className="text-xl font-bold">{data.transactions}</div>
             </div>
             <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-slate-500 text-xs uppercase font-bold mb-1">In-House Actuel</div>
                <div className="text-xl font-bold">{data.clients_inhouse} pax</div>
             </div>
           </div>
         </div>

         <div>
           <h2 className="text-lg font-bold uppercase tracking-wider text-slate-700 mb-2">Occupation (Situation des Chambres)</h2>
           <div className="flex bg-slate-100 rounded-full h-8 overflow-hidden mt-4">
              <div 
                className="bg-emerald-600 flex items-center justify-center text-xs text-white font-bold" 
                style={{width: `${(data.chambres_occupees / Math.max(1, data.total_chambres)) * 100}%`}}>
                {Math.round((data.chambres_occupees / Math.max(1, data.total_chambres)) * 100)}%
              </div>
           </div>
           <div className="mt-2 text-sm text-slate-600 flex justify-between">
              <span>{data.chambres_occupees} Chambres occupées</span>
              <span>{data.total_chambres - data.chambres_occupees} Chambres libres/autres</span>
           </div>
         </div>
      </div>
    </div>
  );
}
