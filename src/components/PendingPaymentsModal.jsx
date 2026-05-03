import React, { useState, useEffect } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { Button } from './ui/Button';
import { useAuthStore } from '../store/authStore';

export default function PendingPaymentsModal({ isOpen, onClose }) {
  const { token, user } = useAuthStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/encaissements/pending', { headers: { 'Authorization': `Bearer ${token}` } });
      const list = await res.json();
      
      // Calculate missing solde
      const withSolde = list.map(item => {
         const dIn = new Date(item.date_arrivee); dIn.setHours(0,0,0,0);
         const dOut = new Date(item.date_checkout_prevu); dOut.setHours(0,0,0,0);
         let nuits = Math.ceil((dOut - dIn)/86400000);
         if(nuits < 1) nuits = 1;
         const tot = nuits * ((item.prix_nuit_applique || 0) + (item.prix_repas_applique || 0));
         const solde = tot - parseFloat(item.deja_paye || 0);
         return { ...item, solde, tot, nuits };
      }).filter(item => item.solde > 0);

      setData(withSolde);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, token]);

  const handleAdminCancel = async (id, solde) => {
    if (!window.confirm("Êtes-vous sûr de vouloir forcer le check-out (annuler le paiement restant) et libérer la chambre ? Cette action est réservée à l'administrateur (ex: client ayant quitté l'établissement sans payer).")) return;
    try {
      const res = await fetch(`/api/reservations/${id}/cancel-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ solde_perdu: solde })
      });
      if(res.ok) {
         fetchData();
      } else {
         const body = await res.json();
         alert(body.error || "Erreur lors de l'annulation");
      }
    } catch(e) {
      console.error(e);
      alert("Erreur réseau");
    }
  };

  const handleBloquerBadge = (id) => {
      alert("Demande de blocage du badge envoyée au système (Simulation).");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Montants Restants à Percevoir</h2>
            <p className="text-sm font-bold text-slate-500">Clients en In-House ayant un solde débiteur.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
             <div className="text-center font-bold text-slate-400 p-8">Chargement...</div>
          ) : data.length === 0 ? (
             <div className="text-center p-12 bg-white rounded-xl border border-slate-200">
                <ShieldAlert className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-700">Aucun solde débiteur</h3>
                <p className="text-slate-500">Tous les clients In-House sont à jour dans leurs paiements.</p>
             </div>
          ) : (
             <div className="space-y-4">
                {data.map(item => (
                   <div key={item.reservation_id} className="bg-white p-5 rounded-xl border border-red-200 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 w-2 bg-red-500"></div>
                      <div className="flex-1 pl-4">
                         <div className="flex items-center gap-3 mb-2">
                           <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded border border-slate-200 font-bold uppercase tracking-widest text-[10px]">Chambre {item.chambre}</span>
                           <h3 className="font-black text-lg text-slate-800">{item.nom} {item.prenom}</h3>
                         </div>
                         <div className="text-sm font-bold text-slate-500 flex gap-4">
                           <span>Nuits: {item.nuits}</span>
                           <span>Départ prévu: {new Date(item.date_checkout_prevu).toLocaleDateString('fr-FR')}</span>
                         </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                         <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Reste à payer</div>
                         <div className="text-2xl font-black text-red-600 mb-4">{item.solde.toLocaleString()} DZD</div>
                         
                         <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => handleBloquerBadge(item.reservation_id)}>
                               Bloquer le badge
                            </Button>
                            {user?.role === 'admin' && (
                               <Button variant="danger" size="sm" onClick={() => handleAdminCancel(item.reservation_id, item.solde)}>
                                  Annuler paiement & Libérer la chambre
                               </Button>
                            )}
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
