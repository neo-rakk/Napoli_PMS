import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';

export default function CheckOut() {
  const { token } = useAuthStore();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedRes, setSelectedRes] = useState(null);
  const [soldeInfo, setSoldeInfo] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/encaissements/pending', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setReservations(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPending();
  }, [token]);

  const handleSelect = async (resv) => {
    setSelectedRes(resv);
    try {
      const res = await fetch(`/api/reservations/${resv.reservation_id}/solde`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setSoldeInfo(data);
    } catch(e) { console.error(e); }
  };

  const handleCheckout = async () => {
    if(!selectedRes) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reservations/checkout/${selectedRes.reservation_id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) {
        setSelectedRes(null);
        setSoldeInfo(null);
        fetchPending();
      } else {
        const error = await res.json();
        alert(error.error || 'Erreur');
      }
    } catch(e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  const handlePayment = async (methode) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/encaissements/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reservation_id: selectedRes.reservation_id, montant: soldeInfo.solde, methode })
      });
      if(res.ok) {
        handleSelect(selectedRes); // refresh solde info
      }
    } catch(e) { console.error(e); }
    finally { setActionLoading(false); }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto flex gap-8">
      
      <div className="flex-1">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Check-Out & Facturation</h1>
          <p className="text-slate-500">Gérer les départs et les encaissements.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">Chambre</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Départ Prévu</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan="5" className="p-4 text-center">Chargement...</td></tr>}
              {!loading && reservations.length === 0 && <tr><td colSpan="5" className="p-4 text-center">Aucun départ en attente de facturation direct.</td></tr>}
              {Array.isArray(reservations) && reservations.map(r => (
                <tr key={r.reservation_id} className={`hover:bg-slate-50 ${selectedRes?.reservation_id === r.reservation_id ? 'bg-emerald-50' : ''}`}>
                  <td className="px-4 py-3 font-bold text-emerald-700">{r.chambre}</td>
                  <td className="px-4 py-3 font-semibold">{r.nom} {r.prenom}</td>
                  <td className="px-4 py-3">{new Date(r.date_depart || r.date_arrivee).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${r.statut === 'checkin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>{r.statut}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant={selectedRes?.reservation_id === r.reservation_id ? 'primary' : 'secondary'} onClick={() => handleSelect(r)}>Sélectionner</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-[400px]">
        {selectedRes && soldeInfo ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-8">
            <h2 className="text-xl font-bold mb-4">Détails Check-Out</h2>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-6">
               <div className="flex justify-between mb-1"><span className="text-slate-500 text-sm">Chambre</span> <span className="font-bold">{soldeInfo.chambre}</span></div>
               <div className="flex justify-between mb-1"><span className="text-slate-500 text-sm">Client</span> <span className="font-bold">{soldeInfo.client}</span></div>
               <div className="flex justify-between mb-1"><span className="text-slate-500 text-sm">Nuits</span> <span className="font-bold">{soldeInfo.nuits}</span></div>
            </div>

            <div className="space-y-3 mb-6 font-mono text-sm">
               <div className="flex justify-between"><span className="text-slate-500">Total Séjour</span> <span>{soldeInfo.total_theorique.toFixed(2)} DZD</span></div>
               <div className="flex justify-between"><span className="text-slate-500">Déjà Payé</span> <span>{soldeInfo.total_paye.toFixed(2)} DZD</span></div>
               <hr className="border-slate-200" />
               <div className="flex justify-between font-bold text-lg">
                 <span>Solde à rêgler</span> 
                 <span className={soldeInfo.solde > 0 ? "text-red-600" : "text-emerald-600"}>{soldeInfo.solde.toFixed(2)} DZD</span>
               </div>
            </div>

            {soldeInfo.solde > 0 && selectedRes.statut !== 'checkout' ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mb-6 text-sm">
                 <p className="font-bold mb-2">Encaissement Requis</p>
                 <p>Le solde doit être de 0 pour effectuer le Check-Out.</p>
                 <div className="flex gap-2 mt-4 inline-block w-full">
                   <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => handlePayment('cash')} disabled={actionLoading}>Cash</Button>
                   <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handlePayment('tpe')} disabled={actionLoading}>TPE</Button>
                 </div>
              </div>
            ) : (
              selectedRes.statut === 'checkin' ? (
               <Button className="w-full" size="lg" onClick={handleCheckout} disabled={actionLoading}>
                 {actionLoading ? 'En cours...' : 'Valider le Check-Out'}
               </Button>
              ) : (
               <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg text-center text-sm font-bold mt-2">
                 Check-out déjà effectué.
               </div>
              )
            )}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 h-64 flex items-center justify-center text-slate-400 text-sm p-8 text-center sticky top-8">
             Sélectionnez une réservation pour voir les détails de facturation et procéder au check-out.
          </div>
        )}
      </div>

    </div>
  );
}
