import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { PenTool, AlertCircle, ShoppingCart } from 'lucide-react';

export default function MaintenanceReception() {
  const { token, user } = useAuthStore();
  const [taches, setTaches] = useState([]);
  const [agents, setAgents] = useState([]);
  const [achats, setAchats] = useState([]);
  const [loading, setLoading] = useState(true);

  // New task form state
  const [showModal, setShowModal] = useState(false);
  const [newForm, setNewForm] = useState({ chambre_id: '', localisation: '', type_panne: 'plomberie', description: '', priorite: 'normale' });
  const [chambres, setChambres] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTaches, resAgents, resChambres] = await Promise.all([
        fetch('/api/maintenance', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/agents/all', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/chambres', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const dataTaches = await resTaches.json();
      setTaches(dataTaches);
      setAgents((await resAgents.json()).filter(a => a.role === 'maintenance'));
      setChambres(await resChambres.json());

      // Collect all achats from tasks to show them (inefficient for large scales, but okay here)
      // Or we can create an endpoint. For now, since we don't have a global endpoint for achats, we'll map over tasks IF there's a need.
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleAssign = async (e, id) => {
    try {
       await fetch(`/api/maintenance/${id}/assigner`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify({ assigne_a: e.target.value })
       });
       fetchData();
    } catch(e) {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...newForm };
      if(!payload.chambre_id) delete payload.chambre_id;

      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if(res.ok) {
         setShowModal(false);
         setNewForm({ chambre_id: '', localisation: '', type_panne: 'plomberie', description: '', priorite: 'normale' });
         fetchData();
      }
    } catch(e) { console.error(e); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PenTool className="w-6 h-6 text-orange-500" />
            Gestion de la Maintenance
          </h1>
          <p className="text-slate-500">Signalez les pannes et assignez les techniciens.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>Déclarer une panne</Button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Nouvel Ordre de Travail</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Localisation (Lieu exact ou Chambre)</label>
                 <select className="w-full border-slate-300 rounded-md mb-2" value={newForm.chambre_id || ''} onChange={e => setNewForm({...newForm, chambre_id: e.target.value, localisation: e.target.value ? '' : newForm.localisation})}>
                   <option value="">-- Autre (Lobby, Couloir, etc.) --</option>
                   {chambres.map(c => <option key={c.id} value={c.id}>Chambre {c.numero} (Bloc {c.bloc_nom})</option>)}
                 </select>
                 {!newForm.chambre_id && (
                   <input required type="text" placeholder="Ex: Réception Principale, Ascenseur Bloc A" className="w-full border-slate-300 rounded-md" value={newForm.localisation} onChange={e => setNewForm({...newForm, localisation: e.target.value})} />
                 )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type de panne</label>
                  <select className="w-full border-slate-300 rounded-md" value={newForm.type_panne} onChange={e => setNewForm({...newForm, type_panne: e.target.value})}>
                    <option value="plomberie">Plomberie</option>
                    <option value="electricite">Électricité</option>
                    <option value="cvc">Chauffage / Clim</option>
                    <option value="menuiserie">Menuiserie</option>
                    <option value="reseau">Réseau / TV</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priorité</label>
                  <select className="w-full border-slate-300 rounded-md bg-white" value={newForm.priorite} onChange={e => setNewForm({...newForm, priorite: e.target.value})}>
                    <option value="normale">Normale</option>
                    <option value="urgente">⚠️ Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description détaillée</label>
                <textarea required rows={3} className="w-full border-slate-300 rounded-md" value={newForm.description} onChange={e => setNewForm({...newForm, description: e.target.value})} />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit">Signaler</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Priorité & Type</th>
              <th className="px-6 py-4 font-semibold">Localisation</th>
              <th className="px-6 py-4 font-semibold">Description</th>
              <th className="px-6 py-4 font-semibold">Statut</th>
              <th className="px-6 py-4 font-semibold">Technicien Assigné</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan="5" className="p-6 text-center">Chargement...</td></tr>}
            {!loading && taches.length === 0 && <tr><td colSpan="5" className="p-6 text-center">Aucune panne signalée.</td></tr>}
            {taches.map(t => (
               <tr key={t.id} className="hover:bg-slate-50">
                 <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold uppercase rounded block w-max mb-1 ${t.priorite === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{t.priorite}</span>
                    <span className="font-medium text-orange-600 uppercase text-xs">{t.type_panne}</span>
                 </td>
                 <td className="px-6 py-4 font-medium text-slate-800">
                    {t.chambre_numero ? `CH. ${t.chambre_numero} (Bl.${t.chambre_bloc})` : t.localisation}
                 </td>
                 <td className="px-6 py-4">
                    <p className="line-clamp-2" title={t.description}>{t.description}</p>
                    <p className="text-xs text-slate-400 mt-1">Signalé par: {t.signaleur_prenom} {t.signaleur_nom}</p>
                 </td>
                 <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${
                       t.statut === 'signale' ? 'bg-amber-100 text-amber-800' :
                       t.statut === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                       t.statut === 'resolu' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {t.statut.replace('_', ' ')}
                    </span>
                 </td>
                 <td className="px-6 py-4">
                    {t.statut === 'resolu' ? (
                       <span className="text-emerald-700 font-bold">{t.agent_prenom} {t.agent_nom} (Clôturé)</span>
                    ) : (
                       <select 
                         className="border-slate-300 rounded text-sm py-1 pl-2 pr-8"
                         value={t.assigne_a || ''}
                         onChange={(e) => handleAssign(e, t.id)}
                       >
                         <option value="">-- Non Assigné --</option>
                         {agents.map(a => <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>)}
                       </select>
                    )}
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
