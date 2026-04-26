import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function AgentsList() {
  const { token } = useAuthStore();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ nom: '', prenom: '', matricule: '', role: 'reception', pin: '' });

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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if(res.ok) {
        setShowModal(false);
        setFormData({ nom: '', prenom: '', matricule: '', role: 'reception', pin: '' });
        fetchAgents();
      } else {
        alert('Erreur lors de la création');
      }
    } catch(e) { console.error(e); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Agents</h1>
          <p className="text-slate-500">Gérez le personnel et les accès au système.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>Nouvel Agent</Button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Ajouter un Agent</h2>
            <form onSubmit={handleCreate} className="space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Matricule</label>
                  <input required type="text" className="w-full border-slate-300 rounded-md" value={formData.matricule} onChange={e => setFormData({...formData, matricule: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code PIN</label>
                  <input required type="text" maxLength={4} className="w-full border-slate-300 rounded-md font-mono" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                <select className="w-full border-slate-300 rounded-md" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="reception">Réception</option>
                  <option value="chef_reception">Chef de Réception</option>
                  <option value="admin">Administrateur</option>
                  <option value="housekeeping">Gouvernance</option>
                  <option value="securite">Agents de sécurité</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Annuler</Button>
                <Button type="submit">Créer</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Nom & Prénom</th>
              <th className="px-6 py-4 font-semibold">Matricule</th>
              <th className="px-6 py-4 font-semibold">Rôle</th>
              <th className="px-6 py-4 font-semibold">Téléphone</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan="6" className="p-6 text-center">Chargement...</td></tr>}
            {!loading && agents.length === 0 && <tr><td colSpan="6" className="p-6 text-center">Aucun agent trouvé.</td></tr>}
            {agents.map(a => (
               <tr key={a.id} className="hover:bg-slate-50">
                 <td className="px-6 py-4 font-bold text-slate-800">{a.nom} {a.prenom}</td>
                 <td className="px-6 py-4 font-mono">{a.matricule}</td>
                 <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded font-bold uppercase text-xs">
                      {a.role?.replace('_', ' ')}
                    </span>
                 </td>
                 <td className="px-6 py-4">{a.telephone || '-'}</td>
                 <td className="px-6 py-4">{a.email || '-'}</td>
                 <td className="px-6 py-4 text-right">
                    <Button variant="secondary" size="sm">Modifier</Button>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
