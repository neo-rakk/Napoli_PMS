import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function SecurityDashboard() {
  const { token } = useAuthStore();
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (e) => {
    e.preventDefault();
    if(!search) return;
    setLoading(true);
    setResult(null);
    try {
      // Endpoint pour vérifier la réservation en cours d'un client
      const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      const inHouse = Array.isArray(data) ? data.filter(c => c.statut === 'enregistre') : [];
      
      if(inHouse.length > 0) {
        setResult({ success: true, client: inHouse[0] });
      } else {
        setResult({ success: false, message: "Accès refusé. Aucun dossier actif trouvé." });
      }
    } catch(e) {
      setResult({ success: false, message: "Erreur système." });
    }
    setLoading(false);
    setSearch('');
  };

  return (
    <div className="max-w-4xl mx-auto align-middle h-full flex flex-col justify-center">
      
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black uppercase tracking-widest text-neutral-300 mb-2">Contrôle d'Accès</h2>
        <p className="text-neutral-500 text-lg">Scannez le badge ou entrez l'ID / NIN du résident</p>
      </div>

      <form onSubmit={handleScan} className="max-w-xl mx-auto w-full mb-12">
        <div className="relative">
          <input 
            type="text" 
            autoFocus
            className="w-full bg-neutral-800 border-2 border-neutral-700 rounded-lg py-4 px-6 text-2xl text-white outline-none focus:border-red-500 transition-colors font-mono tracking-widest text-center"
            placeholder="EN ATTENTE SCANNER..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        </div>
      </form>

      {loading && <div className="text-center text-neutral-500 font-mono text-xl animate-pulse">VÉRIFICATION EN COURS...</div>}

      {result && result.success && (
        <div className="bg-emerald-900/50 border-2 border-emerald-500 p-8 rounded-2xl text-center max-w-2xl mx-auto w-full shadow-[0_0_50px_rgba(16,185,129,0.2)]">
           <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
             <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
             </svg>
           </div>
           <h3 className="text-emerald-400 font-black text-3xl mb-2 tracking-widest uppercase">Accès Autorisé</h3>
           <div className="text-4xl font-black text-white mb-2">{result.client.nom} {result.client.prenom}</div>
           <div className="text-emerald-200 font-mono text-xl mb-4">ID: {result.client.nin || result.client.num_piece}</div>
           <div className="inline-block bg-emerald-950 px-6 py-2 rounded-full border border-emerald-800 text-emerald-300 font-bold uppercase tracking-widest">
             Résident Actif
           </div>
        </div>
      )}

      {result && !result.success && (
        <div className="bg-red-900/50 border-2 border-red-500 p-8 rounded-2xl text-center max-w-2xl mx-auto w-full shadow-[0_0_50px_rgba(239,68,68,0.2)]">
           <div className="w-24 h-24 bg-red-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
             <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
             </svg>
           </div>
           <h3 className="text-red-400 font-black text-3xl mb-4 tracking-widest uppercase">Accès Refusé</h3>
           <p className="text-red-200 text-xl font-mono">{result.message}</p>
        </div>
      )}

    </div>
  );
}
