import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Package, PlusCircle, AlertTriangle, CheckCircle, PackageSearch } from 'lucide-react';

export default function HousekeepingDemandes() {
  const { token } = useAuthStore();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNouvelle, setShowNouvelle] = useState(false);
  const [form, setForm] = useState({ designation: '', quantite: 1, urgence: 'normale', notes: '' });

  const fetchDemandes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/housekeeping/demandes-internes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDemandes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDemandes();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/housekeeping/demandes-internes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowNouvelle(false);
        setForm({ designation: '', quantite: 1, urgence: 'normale', notes: '' });
        fetchDemandes();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-600" />
            Demandes Économat
          </h2>
          <p className="text-slate-500">Demandes de matériel et de produits d'entretien.</p>
        </div>
        <Button onClick={() => setShowNouvelle(true)} className="bg-purple-600 hover:bg-purple-700">
          <PlusCircle className="w-4 h-4 mr-2" /> Nouvelle Demande
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Article demandé</th>
              <th className="px-4 py-3 text-center">Quantité</th>
              <th className="px-4 py-3">Urgence</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan="5" className="text-center py-6">Chargement...</td></tr>}
            {!loading && demandes.length === 0 && <tr><td colSpan="5" className="text-center py-6">Aucune demande</td></tr>}
            {demandes.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-xs text-slate-500 font-medium whitespace-nowrap">
                  {new Date(d.created_at).toLocaleDateString('fr-FR')} {new Date(d.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-800">{d.designation}</div>
                  {d.notes && <div className="text-xs text-slate-500">{d.notes}</div>}
                </td>
                <td className="px-4 py-3 text-center font-bold text-slate-800">
                  {d.quantite}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                     d.urgence === 'immediate' ? 'bg-red-100 text-red-700' :
                     d.urgence === 'differee' ? 'bg-slate-100 text-slate-600' :
                     'bg-amber-100 text-amber-700'
                  }`}>
                    {d.urgence}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex w-max px-2 py-1 text-[10px] font-bold uppercase rounded items-center gap-1 ${
                       d.statut === 'en_attente' ? 'bg-amber-100 text-amber-700' :
                       d.statut === 'commande' ? 'bg-indigo-100 text-indigo-700' :
                       d.statut === 'mis_a_disposition' ? 'bg-emerald-100 text-emerald-700' :
                       d.statut === 'refuse' ? 'bg-red-100 text-red-700' :
                       'bg-slate-100 text-slate-600'
                    }`}>
                      {d.statut === 'en_attente' && <AlertTriangle className="w-3 h-3" />}
                      {d.statut === 'mis_a_disposition' && <CheckCircle className="w-3 h-3" />}
                      {d.statut === 'commande' && <PackageSearch className="w-3 h-3" />}
                      {d.statut ? d.statut.replace('_', ' ') : 'Inconnu'}
                    </span>
                    {d.statut === 'mis_a_disposition' && (
                       <span className="text-[10px] text-emerald-600 font-medium">À récupérer à l'économat</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNouvelle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nouvelle demande d'approvisionnement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Désignation du produit *</label>
                <input required type="text" className="w-full border rounded-md p-2 focus:ring-purple-500 focus:border-purple-500" value={form.designation} onChange={e=>setForm({...form, designation: e.target.value})} placeholder="ex: Nettoyant vitres, Gants..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Quantité *</label>
                   <input required type="number" min="1" className="w-full border rounded-md p-2 focus:ring-purple-500 focus:border-purple-500" value={form.quantite} onChange={e=>setForm({...form, quantite: parseInt(e.target.value)})} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Urgence</label>
                   <select className="w-full border rounded-md p-2 focus:ring-purple-500 focus:border-purple-500" value={form.urgence} onChange={e=>setForm({...form, urgence: e.target.value})}>
                     <option value="normale">Normale</option>
                     <option value="immediate">Urgente</option>
                     <option value="differee">Différée</option>
                   </select>
                 </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optionnel)</label>
                <textarea className="w-full border rounded-md p-2 focus:ring-purple-500 focus:border-purple-500" rows="2" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} placeholder="Précisions..." />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setShowNouvelle(false)}>Annuler</Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Envoyer demande</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
