import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function AdminHebergement() {
  const { token } = useAuthStore();
  const [chambres, setChambres] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ numero: '', bloc_nom: '', etage: '', type: 'single', capacite_max: 1 });
  
  const fetchChambres = () => {
    fetch('/api/chambres', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(setChambres)
      .catch(console.error);
  };

  useEffect(() => {
    fetchChambres();
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/chambres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if(res.ok) {
        setShowModal(false);
        fetchChambres();
        setFormData({ numero: '', bloc_nom: '', etage: '', type: 'single', capacite_max: 1 });
      }
    } catch(e) { console.error(e); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chambres & Blocs</h1>
          <p className="text-slate-500">Gestion du parc immobilier.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>Nouvelle Chambre</Button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Ajouter une Chambre</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Numéro</label>
                  <input required type="text" className="w-full border-slate-300 rounded-md" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bloc / Bâtiment</label>
                  <input required type="text" className="w-full border-slate-300 rounded-md" value={formData.bloc_nom} onChange={e => setFormData({...formData, bloc_nom: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Étage</label>
                  <input required type="number" className="w-full border-slate-300 rounded-md" value={formData.etage} onChange={e => setFormData({...formData, etage: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select className="w-full border-slate-300 rounded-md" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="suite">Suite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Capacité</label>
                  <input required type="number" className="w-full border-slate-300 rounded-md" value={formData.capacite_max} onChange={e => setFormData({...formData, capacite_max: parseInt(e.target.value)})} />
                </div>
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
              <th className="px-6 py-4 font-semibold">Chambre</th>
              <th className="px-6 py-4 font-semibold">Bloc / Bâtiment</th>
              <th className="px-6 py-4 font-semibold">Étage</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Capacité</th>
              <th className="px-6 py-4 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(Array.isArray(chambres) ? chambres : []).map(c => (
              <tr key={c.id}>
                <td className="px-6 py-4 font-bold text-slate-800">{c.numero}</td>
                <td className="px-6 py-4">{c.bloc_nom}</td>
                <td className="px-6 py-4">{c.etage}</td>
                <td className="px-6 py-4 uppercase font-bold text-xs">{c.type}</td>
                <td className="px-6 py-4">{c.capacite_max} lits</td>
                <td className="px-6 py-4">{c.statut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
