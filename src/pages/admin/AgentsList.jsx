import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function AgentsList() {
  const { token, user } = useAuthStore();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [formData, setFormData] = useState({ nom: '', prenom: '', role: 'accueil', telephone: '', email: '' });

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents/all', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setAgents(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAgents();
  }, [token]);

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (isEditing) {
        res = await fetch(`/api/agents/${currentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
            setShowModal(false);
            fetchAgents();
        } else {
            const errorData = await res.json();
            alert('Erreur lors de la modification : ' + (errorData.error || 'Inconnue'));
        }
      } else {
        const autoMatricule = 'AGT-' + Math.floor(1000 + Math.random() * 9000);
        const autoPin = Math.floor(100000 + Math.random() * 900000).toString();
        
        const payload = {
          ...formData,
          matricule: autoMatricule,
          pin: autoPin
        };

        res = await fetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if(res.ok) {
          alert(`Agent créé !\n\nMatricule: ${autoMatricule}\nPIN Temporaire: ${autoPin}\n\nVeuillez noter ces informations.`);
          setShowModal(false);
          fetchAgents();
        } else {
          const errorData = await res.json();
          alert('Erreur lors de la création : ' + (errorData.error || 'Inconnue'));
        }
      }
    } catch(e) { console.error(e); }
  };

  const handleEdit = (agent) => {
      setFormData({
          nom: agent.nom,
          prenom: agent.prenom,
          role: agent.role,
          telephone: agent.telephone || '',
          email: agent.email || ''
      });
      setCurrentId(agent.id);
      setIsEditing(true);
      setShowModal(true);
  };

  const handleNew = () => {
      setFormData({ nom: '', prenom: '', role: 'accueil', telephone: '', email: '' });
      setCurrentId(null);
      setIsEditing(false);
      setShowModal(true);
  };

  const handleToggleActif = async (agent) => {
      if (agent.id == user.id) {
          alert("Vous ne pouvez pas désactiver votre propre compte.");
          return;
      }
      const newStatus = agent.actif === 1 ? 0 : 1;
      const confirmMsg = newStatus === 1 ? "Voulez-vous réactiver cet agent ?" : "Voulez-vous désactiver cet agent ? Il ne pourra plus se connecter.";
      if (!window.confirm(confirmMsg)) return;

      try {
          const res = await fetch(`/api/agents/${agent.id}/toggle-actif`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ actif: newStatus })
          });
          if (res.ok) {
              fetchAgents();
          } else {
              const err = await res.json();
              alert("Erreur: " + err.error);
          }
      } catch (err) {
          console.error(err);
      }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Agents</h1>
          <p className="text-slate-500">Gérez le personnel et les accès au système.</p>
        </div>
        <Button onClick={handleNew}>Nouvel Agent</Button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{isEditing ? 'Modifier Agent' : 'Ajouter un Agent'}</h2>
            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                  <input required type="text" className="w-full border-slate-300 rounded-md" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                  <input required type="text" className="w-full border-slate-300 rounded-md" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                </div>
              </div>
              
              {!isEditing && (
                <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-600 mb-4 border border-slate-200">
                  Le matricule et le code PIN à 6 chiffres seront générés automatiquement.
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                <select className="w-full border-slate-300 rounded-md" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="accueil">Réception / Accueil</option>
                  <option value="admin">Administrateur</option>
                  <option value="housekeeping">Gouvernance</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="securite">Agents de sécurité</option>
                  <option value="caisse">Agent Caisse (POS)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone (optionnel)</label>
                <input type="text" className="w-full border-slate-300 rounded-md" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (optionnel)</label>
                <input type="email" className="w-full border-slate-300 rounded-md" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit">{isEditing ? 'Enregistrer' : 'Créer'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Nom & Prénom</th>
              <th className="px-6 py-4 font-semibold">Matricule</th>
              <th className="px-6 py-4 font-semibold">Rôle</th>
              <th className="px-6 py-4 font-semibold">Statut</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan="5" className="p-6 text-center">Chargement...</td></tr>}
            {!loading && agents.length === 0 && <tr><td colSpan="5" className="p-6 text-center">Aucun agent trouvé.</td></tr>}
            {Array.isArray(agents) && agents.map(a => (
               <tr key={a.id} className={`hover:bg-slate-50 ${a.actif === 0 ? 'opacity-60' : ''}`}>
                 <td className="px-6 py-4 font-bold text-slate-800">{a.nom} {a.prenom}</td>
                 <td className="px-6 py-4 font-mono">{a.matricule}</td>
                 <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded font-bold uppercase text-xs">
                      {a.role?.replace('_', ' ')}
                    </span>
                 </td>
                 <td className="px-6 py-4">
                    {a.actif === 1 ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded font-bold uppercase text-xs">Actif</span>
                    ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded font-bold uppercase text-xs">Inactif</span>
                    )}
                 </td>
                 <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(a)}>Modifier</Button>
                    {a.actif === 1 ? (
                        <Button className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200" variant="outline" size="sm" onClick={() => handleToggleActif(a)}>Désactiver</Button>
                    ) : (
                        <Button className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200" variant="outline" size="sm" onClick={() => handleToggleActif(a)}>Réactiver</Button>
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
