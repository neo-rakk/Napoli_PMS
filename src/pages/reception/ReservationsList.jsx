import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function ReservationsList() {
  const { token } = useAuthStore();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('toutes');
  const [search, setSearch] = useState('');

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reservations', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setReservations(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchReservations();
  }, [token]);

  const filteredReservations = reservations.filter(r => {
    if (filter === 'inhouse' && r.statut !== 'checkin') return false;
    if (filter === 'checkout' && r.statut !== 'checkout') return false;
    if (search) {
       const q = search.toLowerCase();
       return r.nom?.toLowerCase().includes(q) || r.prenom?.toLowerCase().includes(q) || r.chambre_numero?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Historique des Réservations</h1>
          <p className="text-slate-500">Consultez toutes les réservations passées et en cours.</p>
        </div>
        <Button onClick={fetchReservations} variant="secondary">Rafraîchir</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex gap-4">
           <input 
             type="text" 
             placeholder="Rechercher nom, prénom, chambre..." 
             className="border rounded-md px-3 py-2 text-sm w-64"
             value={search} onChange={e => setSearch(e.target.value)}
           />
           <select 
             className="border rounded-md px-3 py-2 text-sm"
             value={filter} onChange={e => setFilter(e.target.value)}
           >
             <option value="toutes">Toutes les réservations</option>
             <option value="inhouse">En cours (In-House)</option>
             <option value="checkout">Terminées (Check-out)</option>
           </select>
        </div>

        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Client</th>
              <th className="px-6 py-4 font-semibold">Chambre</th>
              <th className="px-6 py-4 font-semibold">Arrivée</th>
              <th className="px-6 py-4 font-semibold">Départ (Prévu/Réel)</th>
              <th className="px-6 py-4 font-semibold">Formule</th>
              <th className="px-6 py-4 font-semibold">Facturation</th>
              <th className="px-6 py-4 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan="7" className="p-6 text-center">Chargement...</td></tr>}
            {!loading && filteredReservations.length === 0 && <tr><td colSpan="7" className="p-6 text-center">Aucune réservation trouvée.</td></tr>}
            {filteredReservations.map(r => (
               <tr key={r.id} className="hover:bg-slate-50">
                 <td className="px-6 py-4 font-bold text-slate-800">{r.nom} {r.prenom}</td>
                 <td className="px-6 py-4">Ch. <span className="font-bold">{r.chambre_numero}</span> ({r.bloc_nom})</td>
                 <td className="px-6 py-4 text-emerald-700">{new Date(r.date_arrivee).toLocaleDateString('fr-FR')}</td>
                 <td className="px-6 py-4">
                   {r.statut === 'checkout' && r.date_depart ? (
                     <span className="text-red-600 font-bold">{new Date(r.date_depart).toLocaleDateString('fr-FR')}</span>
                   ) : (
                     <span>{new Date(r.date_checkout_prevu).toLocaleDateString('fr-FR')} (Prévu)</span>
                   )}
                 </td>
                 <td className="px-6 py-4 font-medium">{r.formule}</td>
                 <td className="px-6 py-4">
                    <span className="text-xs uppercase bg-slate-100 px-2 py-1 rounded">{r.mode_facturation.replace('_', ' ')}</span>
                 </td>
                 <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${r.statut === 'checkin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'}`}>
                      {r.statut}
                    </span>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
