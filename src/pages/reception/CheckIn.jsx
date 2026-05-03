import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { useLocation } from 'react-router-dom';
import { Edit3, Save, Printer } from 'lucide-react';

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
    bon_commande_id: '',
    montant_encaisse: 0,
    type_paiement: 'especes'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  
  // Step 2 Edit Mode State
  const [editIdentityMode, setEditIdentityMode] = useState(false);
  const [editedClient, setEditedClient] = useState({});
  const [savingClient, setSavingClient] = useState(false);
  
  // Step 3 Simulation State
  const [simulationParams, setSimulationParams] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  
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
    setEditedClient({...client});
    setFormData(prev => ({ ...prev, formule: client.formule })); // Prefill formule
    setStep(2);
  };
  
  const saveClientIdentity = async () => {
    setSavingClient(true);
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedClient)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur lors de la mise à jour");
      }
      setSelectedClient(editedClient);
      setEditIdentityMode(false);
    } catch(err) {
      alert("Erreur: " + err.message);
    } finally {
      setSavingClient(false);
    }
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

  useEffect(() => {
    const simulate = async () => {
      if (formData.chambre_id && formData.date_checkout_prevu && formData.formule && formData.mode_facturation) {
        if (formData.mode_facturation === 'grand_compte' && (!formData.grand_compte_id || !formData.bon_commande_id)) {
          setSimulationResult(null);
          return;
        }
        
        const paramsHash = JSON.stringify({
          chambre_id: formData.chambre_id,
          date_checkout_prevu: formData.date_checkout_prevu,
          formule: formData.formule,
          mode_facturation: formData.mode_facturation,
          grand_compte_id: formData.grand_compte_id
        });
        
        if (paramsHash === simulationParams) return;
        setSimulationParams(paramsHash);
        
        setSimulating(true);
        try {
          const res = await fetch('/api/reservations/simulate', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
             body: JSON.stringify(formData)
          });
          const data = await res.json();
          if (res.ok) {
             setSimulationResult(data);
          } else {
             setSimulationResult(null);
          }
        } catch(e) {
          setSimulationResult(null);
        } finally {
          setSimulating(false);
        }
      } else {
        setSimulationResult(null);
      }
    };
    simulate();
  }, [formData, token, simulationParams]);

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
    <>
      <div className="p-8 max-w-5xl mx-auto print:hidden">
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
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-lg font-bold">Étape 2 : Vérification d'Identité</h2>
               {!editIdentityMode ? (
                 <Button variant="outline" size="sm" onClick={() => setEditIdentityMode(true)}>
                   <Edit3 className="w-4 h-4 mr-2" /> Modifier
                 </Button>
               ) : (
                 <Button size="sm" onClick={saveClientIdentity} disabled={savingClient} className="bg-indigo-600 hover:bg-indigo-700">
                   {savingClient ? "..." : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
                 </Button>
               )}
            </div>
            
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
                    {editIdentityMode ? (
                      <div className="flex gap-2 mt-1">
                        <input className="w-full border rounded p-1 text-sm font-bold" value={editedClient.nom} onChange={e=>setEditedClient({...editedClient, nom: e.target.value.toUpperCase()})} placeholder="Nom" />
                        <input className="w-full border rounded p-1 text-sm font-bold" value={editedClient.prenom} onChange={e=>setEditedClient({...editedClient, prenom: e.target.value})} placeholder="Prénom" />
                      </div>
                    ) : (
                      <div className="font-bold">{selectedClient.nom} {selectedClient.prenom}</div>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-xs text-slate-500 uppercase">Identité ({editedClient.est_etranger ? 'Étranger' : 'NIN'})</div>
                    {editIdentityMode ? (
                      <div className="mt-1 space-y-2">
                        <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={editedClient.est_etranger} onChange={e=>setEditedClient({...editedClient, est_etranger: e.target.checked})} /> Est Étranger</label>
                        {editedClient.est_etranger ? (
                          <input className="w-full border rounded p-1 text-sm font-medium" value={editedClient.num_piece || ''} onChange={e=>setEditedClient({...editedClient, num_piece: e.target.value})} placeholder="Numéro de pièce (Passeport...)" />
                        ) : (
                          <input className="w-full border rounded p-1 text-sm font-medium" value={editedClient.nin || ''} onChange={e=>setEditedClient({...editedClient, nin: e.target.value})} placeholder="NIN (18 chiffres)" />
                        )}
                      </div>
                    ) : (
                      <div className="font-medium">{selectedClient.est_etranger ? selectedClient.num_piece : selectedClient.nin}</div>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-xs text-slate-500 uppercase">Groupe Sanguin</div>
                    {editIdentityMode ? (
                      <select className="w-full border rounded p-1 text-sm font-medium mt-1" value={editedClient.groupe_sanguin || 'ND'} onChange={e=>setEditedClient({...editedClient, groupe_sanguin: e.target.value})}>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-','ND'].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : (
                      <div className="font-medium">{selectedClient.groupe_sanguin}</div>
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <div className="text-xs text-slate-500 uppercase">Nationalité</div>
                    {editIdentityMode ? (
                      <input className="w-full border rounded p-1 text-sm font-medium mt-1" value={editedClient.nationalite || 'DZ'} onChange={e=>setEditedClient({...editedClient, nationalite: e.target.value})} placeholder="Nationalité (ex: DZ)" />
                    ) : (
                      <div className="font-medium">{selectedClient.nationalite}</div>
                    )}
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
               <Button variant="ghost" onClick={() => setStep(1)} disabled={editIdentityMode}>Retour</Button>
               <Button onClick={() => setStep(3)} disabled={editIdentityMode}>L'identité correspond, Continuer</Button>
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
                
                <div className="mt-4">
                  {simulating && <div className="p-4 bg-slate-50 text-slate-500 italic text-sm rounded border">Calcul du tarif en cours...</div>}
                  {!simulating && simulationResult && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden">
                       <div className="bg-emerald-100 text-emerald-800 font-bold px-4 py-2 border-b border-emerald-200 flex justify-between">
                         <span>Récapitulatif Financier</span>
                         {simulationResult.source_tarif && <span className="bg-emerald-200 text-emerald-900 text-xs px-2 py-0.5 rounded-full uppercase tracking-wider">{simulationResult.source_tarif}</span>}
                       </div>
                       <div className="p-4 space-y-3 text-sm">
                         <div className="flex justify-between text-slate-600">
                           <span>Nuitée(s) (X {simulationResult.nuits})</span>
                           <span>{(simulationResult.prix_nuit).toLocaleString()} DZD</span>
                         </div>
                         <div className="flex justify-between text-slate-600">
                           <span>Formule ({formData.formule}) par jour</span>
                           <span>{(simulationResult.prix_repas).toLocaleString()} DZD</span>
                         </div>
                         <div className="border-t border-emerald-200 pt-2 flex justify-between font-black text-lg text-emerald-900">
                           <span>TOTAL À PAYER</span>
                           <span>{(simulationResult.total).toLocaleString()} DZD</span>
                         </div>
                       </div>
                    </div>
                  )}
                  {!simulating && !simulationResult && (
                    <div className="p-4 bg-slate-50 text-slate-500 rounded-md text-sm border border-slate-200">
                      Remplissez tous les champs pour voir la simulation tarifaire.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end mt-8 pt-6 border-t border-slate-200">
               <Button variant="ghost" onClick={() => setStep(2)}>Retour</Button>
               <div className="flex gap-4 items-end">
                 {formData.mode_facturation === 'direct' && (
                   <div className="flex gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <div>
                        <label className="block text-[11px] uppercase font-bold text-emerald-800 mb-1">Paiement (DZD)</label>
                        <input type="number" min="0" className="border-emerald-200 rounded p-2 w-32 font-bold text-emerald-900" placeholder="0" value={formData.montant_encaisse || ''} onChange={e => setFormData({...formData, montant_encaisse: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase font-bold text-emerald-800 mb-1">Moyen de paiement</label>
                        <select className="border-emerald-200 rounded p-2 text-emerald-900" value={formData.type_paiement} onChange={e => setFormData({...formData, type_paiement: e.target.value})}>
                           <option value="especes">Espèces</option>
                           <option value="carte">Carte (TPE)</option>
                           <option value="cheque">Chèque</option>
                        </select>
                      </div>
                   </div>
                 )}
                 <Button 
                   onClick={submitCheckin} 
                   size="lg"
                   className={`${formData.montant_encaisse > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                   disabled={loading || !formData.chambre_id || !formData.date_checkout_prevu || !formData.formule || (formData.mode_facturation === 'grand_compte' && (!formData.grand_compte_id || !formData.bon_commande_id))}
                 >
                   {loading ? 'Check-In...' : (formData.montant_encaisse > 0 ? `Encaisser ${(formData.montant_encaisse).toLocaleString()} DZD & Check-in` : 'Valider Check-In (Sans encaissement)')}
                 </Button>
               </div>
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
                <Button onClick={() => window.print()} variant="primary" size="lg">
                  <Printer className="w-5 h-5 mr-2" /> Imprimer le Badge / Reçu
                </Button>
                <Button onClick={() => window.location.reload()} variant="secondary" size="lg">Nouveau Check-In</Button>
             </div>
          </div>
        )}
      </div>
      </div>

      {/* Printable Badge and Receipt only visible when printing */}
      {step === 4 && successData && selectedClient && (
        <div className="hidden print:flex flex-col gap-10 bg-white p-10 print:p-0">
          {/* Badge */}
          <div className="border-[3px] border-emerald-800 rounded-xl w-[320px] mx-auto overflow-hidden shadow-none print:shadow-none bg-white">
             <div className="bg-emerald-800 text-white text-center py-4 print:bg-emerald-800 print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
               <div className="text-sm tracking-widest font-bold">VILLAGE OLYMPIQUE</div>
               <div className="text-xs text-emerald-200">NAPOLI 2026</div>
             </div>
             <div className="p-4 bg-white text-center">
               {selectedClient.photo_selfie && (
                 <img src={selectedClient.photo_selfie} alt="Client" className="w-32 h-32 object-cover rounded-full mx-auto border-4 border-slate-100 mb-4" />
               )}
               <h2 className="text-2xl font-black text-slate-900 uppercase leading-tight mb-2">{selectedClient.nom}<br/>{selectedClient.prenom}</h2>
               {selectedClient.est_mineur === 1 && <div className="bg-red-600 text-white font-bold text-xs py-1 px-4 rounded-full inline-block mb-3 print:bg-red-600">MINEUR</div>}
               <hr className="my-4 border-slate-200" />
               <div className="text-4xl font-black font-mono tracking-tight text-slate-900">{successData.chambreNum}</div>
               <div className="text-sm text-slate-500 font-bold uppercase mt-1 mb-4">Chambre</div>
               <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 text-left bg-slate-50 print:bg-slate-50 p-3 rounded" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <div>FORMULE:</div><div className="text-right text-emerald-700">{formData.formule}</div>
                  <div>SANG:</div><div className="text-right text-red-600">{selectedClient.groupe_sanguin}</div>
                  <div>DÉPART:</div><div className="text-right">{new Date(formData.date_checkout_prevu).toLocaleDateString('fr-FR')}</div>
               </div>
             </div>
          </div>
          
          {/* Payment Receipt */}
          <div className="border border-slate-300 w-full max-w-2xl mx-auto p-8 rounded-lg bg-white print:border-none print:pt-16">
             <div className="text-center mb-6">
                <h1 className="text-2xl font-black uppercase text-slate-800">Reçu de Paiement</h1>
                <p className="text-slate-500 text-sm">VILLAGE OLYMPIQUE NAPOLI 2026</p>
             </div>
             <div className="flex justify-between text-sm mb-8 border-b pb-4">
                <div>
                   <p className="font-bold">Client : {selectedClient.nom} {selectedClient.prenom}</p>
                   <p className="text-slate-500">ID : {selectedClient.est_etranger ? selectedClient.num_piece : selectedClient.nin}</p>
                </div>
                <div className="text-right">
                   <p className="font-bold">Date : {new Date().toLocaleDateString('fr-FR')}</p>
                   <p className="text-slate-500">Réservation N° : {successData.reservationId}</p>
                </div>
             </div>
             {simulationResult && (
               <table className="w-full text-sm mb-8">
                  <thead>
                     <tr className="border-b text-left text-slate-500">
                        <th className="font-medium pb-2">Description</th>
                        <th className="font-medium pb-2 text-right">Montant</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr className="border-b">
                        <td className="py-3">Hébergement ({simulationResult.nuits} nuit(s) - Chambre {successData.chambreNum})</td>
                        <td className="py-3 text-right">{(simulationResult.total_nuit).toLocaleString()} DZD</td>
                     </tr>
                     <tr className="border-b">
                        <td className="py-3">Restauration (Formule {formData.formule} - {simulationResult.nuits} jour(s))</td>
                        <td className="py-3 text-right">{(simulationResult.total_repas).toLocaleString()} DZD</td>
                     </tr>
                  </tbody>
                  <tfoot>
                     <tr className="text-lg font-bold">
                        <td className="pt-4 text-right pr-4">TOTAL A PAYER</td>
                        <td className="pt-4 text-right">{(simulationResult.total).toLocaleString()} DZD</td>
                     </tr>
                     {formData.montant_encaisse > 0 ? (
                       <>
                         <tr className="text-lg font-bold text-emerald-700">
                            <td className="pt-2 text-right pr-4">MONTANT ENCAISSÉ</td>
                            <td className="pt-2 text-right">{(formData.montant_encaisse).toLocaleString()} DZD</td>
                         </tr>
                         <tr className="text-lg font-bold text-red-600">
                            <td className="pt-2 text-right pr-4">RESTE À PAYER</td>
                            <td className="pt-2 text-right">{(simulationResult.total - formData.montant_encaisse).toLocaleString()} DZD</td>
                         </tr>
                       </>
                     ) : null}
                  </tfoot>
               </table>
             )}
             <div className="text-center text-xs text-slate-400 mt-16 italic">
                Ceci est une attestation officielle délivrée par le Village Olympique Napoli 2026.
             </div>
          </div>
        </div>
      )}

    </>
  );
}
