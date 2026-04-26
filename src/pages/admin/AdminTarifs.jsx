import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { BadgeDollarSign, CalendarRange, PlusCircle, Calculator } from 'lucide-react';

export default function AdminTarifs() {
  const { token } = useAuthStore();
  const [data, setData] = useState({ tarifs: [], saisons: [] });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTarif, setShowTarif] = useState(false);
  const [showSaison, setShowSaison] = useState(false);

  // Forms
  const [tarifForm, setTarifForm] = useState({ nom: '', type_chambre_id: 1, formule: 'LPD', prix_base: 0 });
  const [saisonForm, setSaisonForm] = useState({ nom: '', date_debut: '', date_fin: '', multiplicateur: 1.0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tarifs/actifs', { headers: { 'Authorization': `Bearer ${token}` } });
      setData(await res.json());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  const saveTarif = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tarifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(tarifForm)
      });
      if(res.ok) {
        setShowTarif(false);
        setTarifForm({ nom: '', type_chambre_id: 1, formule: 'LPD', prix_base: 0 });
        fetchData();
      }
    } catch(e) {}
  };

  const saveSaison = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/tarifs/saisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(saisonForm)
      });
      if(res.ok) {
        setShowSaison(false);
        setSaisonForm({ nom: '', date_debut: '', date_fin: '', multiplicateur: 1.0 });
        fetchData();
      }
    } catch(e) {}
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BadgeDollarSign className="w-6 h-6 text-emerald-600" /> Tarification & Yield
        </h1>
        <p className="text-slate-500">Gérez vos prix de base et vos saisons (basse, haute, très haute).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Grille Tarifaire Normale */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <Calculator className="w-5 h-5 text-emerald-600" /> Tarifs de Base
              </h2>
              <Button size="sm" onClick={() => setShowTarif(true)} className="bg-emerald-600 hover:bg-emerald-700">Créer</Button>
           </div>
           <div className="p-0 overflow-y-auto max-h-[500px]">
              {loading && <p className="p-6 text-center text-slate-500">Chargement...</p>}
              {!loading && data.tarifs?.length === 0 && <p className="p-6 text-center text-slate-500">Aucun tarif configuré.</p>}
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-white border-b border-slate-100 text-slate-400 uppercase text-xs sticky top-0">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Nom / Formule</th>
                    <th className="px-6 py-3 font-semibold text-right">Prix (DZD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.tarifs?.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{t.nom}</div>
                        <div className="text-xs text-slate-500 mt-1">Formule: {t.formule}</div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-800">{t.prix_base?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>

        {/* Saisons et Multiplicateurs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
              <h2 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                 <CalendarRange className="w-5 h-5 text-emerald-600" /> Saisons & Périodes Spéciales
              </h2>
              <Button size="sm" onClick={() => setShowSaison(true)} className="bg-emerald-600 hover:bg-emerald-700">Ajouter</Button>
           </div>
           <div className="p-6 overflow-y-auto max-h-[500px]">
              {loading && <p className="text-center text-slate-500">Chargement...</p>}
              {!loading && data.saisons?.length === 0 && <p className="text-center text-slate-500">Aucune saison configurée (Base 1.0 appliquée).</p>}
              
              <div className="space-y-4">
                 {data.saisons?.map(s => (
                    <div key={s.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-emerald-300 transition-colors">
                       <div>
                          <div className="font-bold text-slate-800 text-base">{s.nom}</div>
                          <div className="text-sm text-slate-500 mt-1">
                             Du {new Date(s.date_debut).toLocaleDateString()} au {new Date(s.date_fin).toLocaleDateString()}
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-xs font-medium text-slate-400 uppercase mb-1">Multiplicateur</div>
                          <div className={`text-xl font-black ${s.multiplicateur > 1 ? 'text-red-600' : s.multiplicateur < 1 ? 'text-emerald-600' : 'text-slate-800'}`}>
                             x{s.multiplicateur.toFixed(2)}
                          </div>
                       </div>
                    </div>
                 ))}
                 <div className="border border-dashed border-slate-300 rounded-xl p-4 flex justify-between items-center bg-slate-50">
                    <div className="text-slate-500 font-medium">Période Standard (Hors Saisons Paramétrées)</div>
                    <div className="text-xl font-black text-slate-800">x1.00</div>
                 </div>
              </div>
           </div>
        </div>

      </div>

      {/* Modals */}
      {showTarif && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <h2 className="text-xl font-bold mb-4">Nouveau Tarif Base</h2>
              <form onSubmit={saveTarif} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Nom du tarif (ex: Single Standard)</label>
                   <input required type="text" className="w-full border rounded-md p-2" value={tarifForm.nom} onChange={e=>setTarifForm({...tarifForm, nom: e.target.value})}/>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Formule de base</label>
                   <select className="w-full border rounded-md p-2" value={tarifForm.formule} onChange={e=>setTarifForm({...tarifForm, formule: e.target.value})}>
                      <option value="LPD">LPD (Logement Petit Déj)</option>
                      <option value="DP">DP (Demi-Pension)</option>
                      <option value="PC">PC (Pension Complète)</option>
                      <option value="ALL_INC">All Inclusive</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Prix de Base (DZD) *</label>
                   <input required type="number" min="0" className="w-full border rounded-md p-2" value={tarifForm.prix_base} onChange={e=>setTarifForm({...tarifForm, prix_base: parseFloat(e.target.value)})}/>
                 </div>
                 <div className="pt-4 flex justify-end gap-3 mt-4">
                   <Button variant="outline" type="button" onClick={() => setShowTarif(false)}>Annuler</Button>
                   <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Enregistrer</Button>
                 </div>
              </form>
           </div>
         </div>
      )}

      {showSaison && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <h2 className="text-xl font-bold mb-4">Nouvelle Saison / Période</h2>
              <form onSubmit={saveSaison} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Nom de la saison (ex: Haute Saison Été)</label>
                   <input required type="text" className="w-full border rounded-md p-2" value={saisonForm.nom} onChange={e=>setSaisonForm({...saisonForm, nom: e.target.value})}/>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium mb-1">Date début</label>
                     <input required type="date" className="w-full border rounded-md p-2 text-sm" value={saisonForm.date_debut} onChange={e=>setSaisonForm({...saisonForm, date_debut: e.target.value})}/>
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-1">Date fin</label>
                     <input required type="date" className="w-full border rounded-md p-2 text-sm" value={saisonForm.date_fin} onChange={e=>setSaisonForm({...saisonForm, date_fin: e.target.value})}/>
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Multiplicateur (ex: 1.5 pour +50%)</label>
                   <input required type="number" min="0.1" step="0.05" className="w-full border rounded-md p-2 font-bold" value={saisonForm.multiplicateur} onChange={e=>setSaisonForm({...saisonForm, multiplicateur: parseFloat(e.target.value)})}/>
                 </div>
                 <div className="pt-4 flex justify-end gap-3 mt-4">
                   <Button variant="outline" type="button" onClick={() => setShowSaison(false)}>Annuler</Button>
                   <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Enregistrer</Button>
                 </div>
              </form>
           </div>
         </div>
      )}
    </div>
  );
}
