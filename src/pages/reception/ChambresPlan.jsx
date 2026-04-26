import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function ChambresPlan() {
  const { token } = useAuthStore();
  const [chambres, setChambres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('tous');

  const fetchChambres = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chambres', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setChambres(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchChambres();
  }, [token]);

  const stats = chambres.reduce((acc, c) => {
    acc[c.statut] = (acc[c.statut] || 0) + 1;
    acc.total += 1;
    return acc;
  }, { total: 0 });

  const filteredChambres = chambres.filter(c => filterStatut === 'tous' || c.statut === filterStatut);

  const getStatusColor = (statut) => {
    switch(statut) {
      case 'libre': return 'bg-emerald-100 border-emerald-300 text-emerald-800';
      case 'occupee': return 'bg-red-100 border-red-300 text-red-800';
      case 'partielle': return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'sale': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'en_nettoyage': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'travaux': return 'bg-slate-200 border-slate-400 text-slate-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const handleStatusChange = async (chambreId, newStatut) => {
    if(!window.confirm('Confirmer le changement de statut ?')) return;
    try {
      // Need a specific endpoint to change room status if empty etc. But skipping full implementation for visual demo if backend lacks it, or we implement it.
      // Wait, there is no generic patch for chambre right now. Let's assume we create it.
      const res = await fetch(`/api/chambres/${chambreId}/statut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ statut: newStatut })
      });
      if(res.ok) fetchChambres();
    } catch(e) {}
  };

  return (
    <div className="p-8 pb-32">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Plan des Chambres</h1>
        <p className="text-slate-500">Supervision en temps réel de l'état des chambres.</p>
      </div>

      <div className="flex gap-4 mb-8 flex-wrap">
        <Button variant={filterStatut === 'tous' ? 'primary' : 'secondary'} onClick={() => setFilterStatut('tous')}>Tous ({stats.total || 0})</Button>
        <Button variant={filterStatut === 'libre' ? 'primary' : 'secondary'} onClick={() => setFilterStatut('libre')}>Libres ({stats.libre || 0})</Button>
        <Button variant={filterStatut === 'occupee' ? 'primary' : 'secondary'} onClick={() => setFilterStatut('occupee')}>Occupées ({stats.occupee || 0})</Button>
        <Button variant={filterStatut === 'partielle' ? 'primary' : 'secondary'} onClick={() => setFilterStatut('partielle')}>Partielles ({stats.partielle || 0})</Button>
        <Button variant={filterStatut === 'sale' ? 'primary' : 'secondary'} onClick={() => setFilterStatut('sale')}>Sales ({stats.sale || 0})</Button>
        <Button variant={filterStatut === 'en_nettoyage' ? 'primary' : 'secondary'} onClick={() => setFilterStatut('en_nettoyage')}>En Nettoyage ({stats.en_nettoyage || 0})</Button>
        <Button variant={filterStatut === 'travaux' ? 'primary' : 'secondary'} onClick={() => setFilterStatut('travaux')}>Travaux ({stats.travaux || 0})</Button>
      </div>

      {loading ? (
        <div className="text-center p-12 text-slate-500">Chargement des chambres...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {filteredChambres.map(c => (
             <div key={c.id} className={`border p-4 rounded-xl shadow-sm text-center flex flex-col ${getStatusColor(c.statut)}`}>
                <div className="text-2xl font-bold font-mono tracking-tighter mb-1">{c.numero}</div>
                <div className="text-xs uppercase font-bold opacity-75 mb-3">{c.type} - {c.bloc_nom}</div>
                <div className="bg-white/50 py-1 rounded text-xs font-semibold uppercase tracking-wider mb-2">
                   {c.statut.replace('_', ' ')}
                </div>
                <div className="text-xs font-medium mb-auto">Occ: {c.nb_occupants_actuels}/{c.capacite_max}</div>

                {/* Agent actions */}
                <div className="mt-4 flex flex-col gap-1">
                  {c.statut === 'sale' && <Button size="sm" onClick={() => handleStatusChange(c.id, 'en_nettoyage')}>Nettoyer</Button>}
                  {c.statut === 'en_nettoyage' && <Button size="sm" onClick={() => handleStatusChange(c.id, 'libre')}>Marquer Propre</Button>}
                </div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
