import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Users, PlusCircle, Globe, Flag, Calendar } from 'lucide-react';

export default function GroupesList() {
  const { token } = useAuthStore();
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '', code: '', sport: '', pays: '', responsable_nom: '',
    responsable_contact: '', nb_membres_prevus: 0, formule_groupe: 'PC',
    date_arrivee: '', date_depart: '', notes: ''
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/groupes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if(res.ok) {
        setShowModal(false);
        setFormData({ nom: '', code: '', sport: '', pays: '', responsable_nom: '', responsable_contact: '', nb_membres_prevus: 0, formule_groupe: 'PC', date_arrivee: '', date_depart: '', notes: '' });
        fetchGroupes();
      } else {
        const err = await res.json();
        alert('Erreur: ' + (err.error || 'Erreur inconnue'));
      }
    } catch(e) {
      alert('Erreur de connexion');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" /> Gestion des Délégations / Groupes
          </h1>
          <p className="text-slate-500">Planifiez et gérez les délégations attendues au village.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <PlusCircle className="w-4 h-4 mr-2" /> Nouvelle Délégation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && <div className="col-span-full text-center py-8 text-slate-500">Chargement...</div>}
        {!loading && groupes.length === 0 && <div className="col-span-full text-center py-8 text-slate-500">Aucun groupe enregistré.</div>}
        {!loading && Array.isArray(groupes) && groupes.map(g => (
          <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <div className="text-xs font-bold text-emerald-600 mb-1">{g.code}</div>
                  <h3 className="text-xl font-bold text-slate-800 leading-tight">{g.nom}</h3>
               </div>
               <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full ${g.statut === 'en_attente' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                 {g.statut.replace('_', ' ')}
               </span>
            </div>
            
            <div className="space-y-3 text-sm text-slate-600 mb-6">
               <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /> Pays/Région: <span className="font-bold text-slate-800">{g.pays}</span></div>
               <div className="flex items-center gap-2"><Flag className="w-4 h-4 text-slate-400" /> Sport: <span className="font-medium">{g.sport || 'N/A'}</span></div>
               <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> Membres: <span className="font-medium">{g.nb_membres_prevus} Pax ({g.formule_groupe})</span></div>
               <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> Séjour: <span className="font-medium">{new Date(g.date_arrivee).toLocaleDateString()} au {new Date(g.date_depart).toLocaleDateString()}</span></div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 uppercase mb-1">Chef de Délégation</div>
              <div className="font-bold text-slate-800">{g.responsable_nom}</div>
              <div className="text-sm text-slate-500">{g.responsable_contact}</div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6">Enregistrer une Délégation</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Nom de la délégation *</label>
                   <input required type="text" className="w-full border rounded-md p-2" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} placeholder="Ex: Équipe France Judo" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Code (Réf. Interne) *</label>
                   <input required type="text" className="w-full border rounded-md p-2" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Ex: FRA-JUDO" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Pays / CNO *</label>
                   <input required type="text" className="w-full border rounded-md p-2" value={formData.pays} onChange={e => setFormData({...formData, pays: e.target.value})} placeholder="Ex: France" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Discipline / Sport</label>
                   <input type="text" className="w-full border rounded-md p-2" value={formData.sport} onChange={e => setFormData({...formData, sport: e.target.value})} placeholder="Ex: Judo" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-4 border rounded-xl">
                   <h3 className="font-bold text-sm mb-3 text-slate-700">Responsable</h3>
                   <div className="space-y-3">
                     <div>
                       <label className="block text-xs font-medium mb-1">Nom du responsable *</label>
                       <input required type="text" className="w-full border rounded-md p-2 text-sm" value={formData.responsable_nom} onChange={e => setFormData({...formData, responsable_nom: e.target.value})} />
                     </div>
                     <div>
                       <label className="block text-xs font-medium mb-1">Contact (Tél/Email) *</label>
                       <input required type="text" className="w-full border rounded-md p-2 text-sm" value={formData.responsable_contact} onChange={e => setFormData({...formData, responsable_contact: e.target.value})} />
                     </div>
                   </div>
                 </div>

                 <div className="bg-slate-50 p-4 border rounded-xl">
                   <h3 className="font-bold text-sm mb-3 text-slate-700">Prévisions</h3>
                   <div className="space-y-3">
                     <div>
                       <label className="block text-xs font-medium mb-1">Taille estimée (Pax)</label>
                       <input required type="number" min="1" className="w-full border rounded-md p-2 text-sm" value={formData.nb_membres_prevus} onChange={e => setFormData({...formData, nb_membres_prevus: parseInt(e.target.value)})} />
                     </div>
                     <div>
                       <label className="block text-xs font-medium mb-1">Formule de séjour</label>
                       <select className="w-full border rounded-md p-2 text-sm" value={formData.formule_groupe} onChange={e => setFormData({...formData, formule_groupe: e.target.value})}>
                          <option value="PC">PC (Pension Complète)</option>
                          <option value="DP">DP (Demi-Pension)</option>
                          <option value="PD">PD (Petit Déjeuner)</option>
                       </select>
                     </div>
                   </div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Date d'arrivée *</label>
                   <input required type="date" className="w-full border rounded-md p-2" value={formData.date_arrivee} onChange={e => setFormData({...formData, date_arrivee: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Date de départ *</label>
                   <input required type="date" className="w-full border rounded-md p-2" value={formData.date_depart} onChange={e => setFormData({...formData, date_depart: e.target.value})} />
                 </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
