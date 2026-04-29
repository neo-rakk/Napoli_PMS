import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { useLocation } from 'react-router-dom';

export default function CheckIn() {
  const { token } = useAuthStore();
  const location = useLocation();
  const [step, setStep] = useState(1);
  
  // States Checkin process
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState(null);
  
  const [chambres, setChambres] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [bonsCommande, setBonsCommande] = useState([]);
  
  const [formData, setFormData] = useState({
    chambre_id: '',
    date_checkout_prevu: '',
    formule: '',
    mode_facturation: 'direct',
    grand_compte_id: '',
    bon_commande_id: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  
  // Pre-fill from PreInscriptionsList query param if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clientId = params.get('clientId');
    if (clientId) {
      // Need a way to fetch client by ID or just use search by ID
      setSearchQuery(`id:${clientId}`);
      fetchClients(`id:${clientId}`);
    }
  }, [location]);

  const fetchClients = async (query) => {
    if(!query) return;
    setSearching(true);
    let url = `/api/clients?statut=en_attente&search=${encodeURIComponent(query)}`;
    
    if (query.startsWith('id:')) {
      const idStr = query.split(':')[1];
      url = `/api/clients?statut=en_attente&id=${idStr}`;
    }
    
    try {
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setSearchResults(data);
      // Auto-select if directed from PreInscriptionsList
      if (query.startsWith('id:') && data.length === 1 && step === 1) {
        selectClient(data[0]);
      }
    } catch(e) { console.error(e); }
    finally { setSearching(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchClients(searchQuery);
  };

  const selectClient = (client) => {
    setSelectedClient(client);
    setFormData(prev => ({ ...prev, formule: client.formule })); // Prefill formule
    setStep(2);
  };

  // Fetch Chambres & Comptes on Step 3
  useEffect(() => {
    if (step === 3) {
      fetch('/api/chambres/disponibles', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setChambres(data))
        .catch(console.error);
        
      fetch('/api/comptes', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setComptes(data))
        .catch(console.error);
    }
  }, [step, token]);

  const handleGCChange = async (gcId) => {
    setFormData(prev => ({ ...prev, grand_compte_id: gcId, bon_commande_id: '' }));
    if(gcId) {
      try {
        const res = await fetch(`/api/comptes/${gcId}/bons-commande/actifs`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        setBonsCommande(data);
      } catch(e) { console.error(e); }
    } else {
      setBonsCommande([]);
    }
  };

  const submitCheckin = async () => {
    setLoading(true); setError('');
    try {
      const payload = { ...formData, client_id: selectedClient.id };
      const res = await fetch('/api/reservations/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Erreur Check-In');
      
      setSuccessData(data);
      setStep(4);
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Check-In Réception</h1>
        <p className="text-slate-500">Validation d'identité et attribution de chambre.</p>
      </div>

      {/* Stepper */}
      <div className="flex gap-2 mb-8">
        {[1,2,3,4].map(s => (
          <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Étape 1 : Recherche Client</h2>
            <form onSubmit={handleSearch} className="flex gap-4 mb-6">
              <input 
                type="text" className="flex-1 border rounded-md px-4 py-2" 
                placeholder="Nom, Prénom, NIN ou N° Pièce..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
              <Button type="submit" disabled={searching}>Chercher</Button>
            </form>
            
            {Array.isArray(searchResults) && searchResults.map(c => (
                  <div key={c.id} className="p-4 border rounded-lg flex justify-between items-center hover:border-emerald-500 cursor-pointer transition-colors" onClick={() => selectClient(c)}>
                    <div>
                      <div className="font-bold text-slate-800">{c.nom} <span className="font-normal capitalize">{c.prenom}</span></div>
                      <div className="text-sm text-slate-500">ID: {c.est_etranger ? c.num_piece : c.nin} — Formule souhaitée: {c.formule}</div>
                    </div>
                    <Button variant="secondary" size="sm">Sélectionner</Button>
                  </div>
                ))}
            {(!Array.isArray(searchResults) || searchResults.length === 0) && searchQuery && !searching && (
              <p className="text-slate-500">Aucun résultat pour cette recherche (statut "en_attente" obligatoire).</p>
            )}
          </div>
        )}

        {step === 2 && selectedClient && (
          <div>
            <h2 className="text-lg font-bold mb-4">Étape 2 : Vérification d'Identité</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-1 bg-slate-100 rounded-xl aspect-[3/4] flex items-center justify-center overflow-hidden border">
                {selectedClient.photo_selfie ? (
                   <img src={selectedClient.photo_selfie} alt="Selfie" className="w-full h-full object-cover" />
                ) : (
                   <span className="text-slate-400">Photo Selfie</span>
                )}
              </div>
              <div className="col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-xs text-slate-500 uppercase">Nom Complet</div>
                    <div className="font-bold">{selectedClient.nom} {selectedClient.prenom}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-xs text-slate-500 uppercase">Identité ({selectedClient.est_etranger ? 'Étranger' : 'NIN'})</div>
                    <div className="font-medium">{selectedClient.est_etranger ? selectedClient.num_piece : selectedClient.nin}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-xs text-slate-500 uppercase">Groupe Sanguin</div>
                    <div className="font-medium">{selectedClient.groupe_sanguin}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-xs text-slate-500 uppercase">Nationalité</div>
                    <div className="font-medium">{selectedClient.nationalite}</div>
                  </div>
                </div>

                {selectedClient.est_mineur === 1 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="font-bold text-red-800 flex items-center gap-2 mb-2">
                       <span className="w-2 h-2 rounded-full bg-red-600"></span>
                       ATTENTION MINEUR
                    </div>
                    <div className="text-sm text-red-700">Tuteur: {selectedClient.tuteur_nom} - Contact: {selectedClient.tuteur_contact}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-8">
               <Button variant="ghost" onClick={() => setStep(1)}>Retour</Button>
               <Button onClick={() => setStep(3)}>L'identité correspond, Continuer</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Étape 3 : Chambre & Facturation</h2>
            
            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded text-sm">{error}</div>}

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-700 border-b pb-2">Hébergement</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Chambre *</label>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={formData.chambre_id} onChange={e => setFormData({...formData, chambre_id: e.target.value})}
                  >
                    <option value="">Sélectionner une chambre disponible</option>
                    {Array.isArray(chambres) && chambres.map(c => (
                      <option key={c.id} value={c.id}>
                        Ch. {c.numero} ({c.type} · Bloc {c.bloc_nom}) — {c.statut} ({c.nb_occupants_actuels}/{c.capacite_max})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Départ prévu le *</label>
                  <input 
                    type="date" className="w-full border rounded-md p-2"
                    value={formData.date_checkout_prevu} onChange={e => setFormData({...formData, date_checkout_prevu: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Formule choisie *</label>
                  <select 
                    className="w-full border rounded-md p-2"
                    value={formData.formule} onChange={e => setFormData({...formData, formule: e.target.value})}
                  >
                    <option value="">Sélectionner</option>
                    <option value="PD">PD (Petit Déjeuner)</option>
                    <option value="DP">DP (Demi-Pension)</option>
                    <option value="PC">PC (Pension Complète)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-700 border-b pb-2">Paiement & Facturation</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Mode de facturation *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                       <input type="radio" name="mode" checked={formData.mode_facturation === 'direct'} onChange={() => setFormData({...formData, mode_facturation: 'direct'})} />
                       Direct (Client)
                    </label>
                    <label className="flex items-center gap-2">
                       <input type="radio" name="mode" checked={formData.mode_facturation === 'grand_compte'} onChange={() => setFormData({...formData, mode_facturation: 'grand_compte'})} />
                       Grand Compte (B2B)
                    </label>
                  </div>
                </div>

                {formData.mode_facturation === 'grand_compte' && (
                  <div className="bg-slate-50 p-4 border rounded-md space-y-3">
                     <div>
                       <label className="block text-sm font-medium mb-1">Grand Compte *</label>
                       <select 
                         className="w-full border rounded-md p-2"
                         value={formData.grand_compte_id} onChange={e => handleGCChange(e.target.value)}
                       >
                         <option value="">Sélectionner un Grand Compte</option>
                         {Array.isArray(comptes) && comptes.map(gc => <option key={gc.id} value={gc.id}>{gc.nom} (NIF: {gc.nif})</option>)}
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-medium mb-1">Bon de Commande actif *</label>
                       <select 
                         className="w-full border rounded-md p-2"
                         value={formData.bon_commande_id} onChange={e => setFormData({...formData, bon_commande_id: e.target.value})}
                       >
                         <option value="">Sélectionner un BDC</option>
                         {Array.isArray(bonsCommande) && bonsCommande.map(bdc => <option key={bdc.id} value={bdc.id}>{bdc.reference_interne} (Plafond: {bdc.montant_plafond})</option>)}
                       </select>
                     </div>
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-emerald-50 text-emerald-800 rounded-md text-sm border border-emerald-200">
                  Le système calculera automatiquement le tarif contractuel ou public à appliquer en fonction des choix ci-dessus.
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
               <Button variant="ghost" onClick={() => setStep(2)}>Retour</Button>
               <Button 
                onClick={submitCheckin} disabled={loading || !formData.chambre_id || !formData.date_checkout_prevu || !formData.formule || (formData.mode_facturation === 'grand_compte' && (!formData.grand_compte_id || !formData.bon_commande_id))}
               >
                 {loading ? 'Check-In...' : 'Valider le Check-In'}
               </Button>
            </div>
          </div>
        )}

        {step === 4 && successData && (
          <div className="text-center py-8">
             <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
             </div>
             <h2 className="text-2xl font-bold text-slate-800 mb-2">Check-in Effectué</h2>
             <p className="text-slate-600 mb-6 font-medium">Le client est maintenant enregistré en chambre.</p>
             <div className="text-3xl font-black bg-slate-100 text-slate-800 py-3 px-8 rounded-full border inline-block mb-8">
                 Chambre {successData.chambreNum}
             </div>
             
             <div className="flex justify-center gap-4">
                <Button onClick={() => window.print()} variant="primary" size="lg">Imprimer le Badge</Button>
                <Button onClick={() => window.location.reload()} variant="secondary" size="lg">Nouveau Check-In</Button>
             </div>
          </div>
        )}
      </div>

      {/* Printable Badge only visible when printing */}
      {step === 4 && successData && selectedClient && (
        <div className="hidden print:block absolute inset-0 bg-white z-50 p-10">
          {/* This represents the physical badge printed */}
          <div className="border-[3px] border-emerald-800 rounded-xl w-[320px] mx-auto overflow-hidden">
             <div className="bg-emerald-800 text-white text-center py-4">
               <div className="text-sm tracking-widest font-bold">VILLAGE OLYMPIQUE</div>
               <div className="text-xs text-emerald-200">NAPOLI 2026</div>
             </div>
             <div className="p-4 bg-white text-center">
               {selectedClient.photo_selfie && (
                 <img src={selectedClient.photo_selfie} alt="Client" className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-slate-100 mb-4" />
               )}
               <h2 className="text-2xl font-black text-slate-900 uppercase leading-tight mb-2">{selectedClient.nom}<br/>{selectedClient.prenom}</h2>
               {selectedClient.est_mineur === 1 && <div className="bg-red-600 text-white font-bold text-xs py-1 px-4 rounded-full inline-block mb-3">MINEUR</div>}
               <hr className="my-4" />
               <div className="text-4xl font-black font-mono tracking-tight">{successData.chambreNum}</div>
               <div className="text-sm text-slate-500 font-bold uppercase mt-1 mb-4">Chambre</div>
               <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 text-left bg-slate-50 p-3 rounded">
                  <div>FORMULE:</div><div className="text-right text-emerald-700">{formData.formule}</div>
                  <div>SANG:</div><div className="text-right text-red-600">{selectedClient.groupe_sanguin}</div>
                  <div>DÉPART:</div><div className="text-right">{new Date(formData.date_checkout_prevu).toLocaleDateString('fr-FR')}</div>
               </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
