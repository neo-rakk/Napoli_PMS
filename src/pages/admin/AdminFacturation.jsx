import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Building2, FileText, FileSignature, Wallet, ChevronRight, PlusCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function AdminFacturation() {
  const { token } = useAuthStore();
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompte, setSelectedCompte] = useState(null);
  
  // Views inside selected compte
  const [activeTab, setActiveTab] = useState('contrats'); // contrats, bdc, factures
  const [contrats, setContrats] = useState([]);
  const [bdc, setBdc] = useState([]);

  // Modals
  const [showCompteModal, setShowCompteModal] = useState(false);
  const [showContratModal, setShowContratModal] = useState(false);
  const [showBdcModal, setShowBdcModal] = useState(false);

  // Forms
  const [compteForm, setCompteForm] = useState({ nom: '', nif: '', rc: '', adresse: '', telephone: '', email: '', contact_nom: '', contact_telephone: '' });
  const [contratForm, setContratForm] = useState({ reference: '', date_debut: '', date_fin: '', remise_percent: 0 });
  const [bdcForm, setBdcForm] = useState({ reference_interne: '', montant_plafond: 0, statut: 'actif' });

  const fetchComptes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/comptes', { headers: { 'Authorization': `Bearer ${token}` } });
      setComptes(await res.json());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchComptes(); }, [token]);

  const loadCompteDetails = async (id) => {
    try {
       const [resContrats, resBdc] = await Promise.all([
          fetch(`/api/comptes/${id}/contrats`, { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch(`/api/comptes/${id}/bons-commande`, { headers: { 'Authorization': `Bearer ${token}` } })
       ]);
       setContrats(await resContrats.json());
       setBdc(await resBdc.json());
    } catch(e) { console.error(e); }
  };

  const handleSelectCompte = (c) => {
    setSelectedCompte(c);
    loadCompteDetails(c.id);
  };

  const createCompte = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/comptes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(compteForm)
      });
      if(res.ok) {
         setShowCompteModal(false);
         setCompteForm({ nom: '', nif: '', rc: '', adresse: '', telephone: '', email: '', contact_nom: '', contact_telephone: '' });
         fetchComptes();
      }
    } catch(e) {}
  };

  const createContrat = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/comptes/${selectedCompte.id}/contrats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(contratForm)
      });
      if(res.ok) {
         setShowContratModal(false);
         setContratForm({ reference: '', date_debut: '', date_fin: '', remise_percent: 0 });
         loadCompteDetails(selectedCompte.id);
      }
    } catch(e) {}
  };

  const createBdc = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/comptes/${selectedCompte.id}/bons-commande`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(bdcForm)
      });
      if(res.ok) {
         setShowBdcModal(false);
         setBdcForm({ reference_interne: '', montant_plafond: 0, statut: 'actif' });
         loadCompteDetails(selectedCompte.id);
      }
    } catch(e) {}
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex gap-8">
      {/* Left side: List of Grands Comptes */}
      <div className={`flex flex-col ${selectedCompte ? 'w-1/3' : 'w-full'} transition-all duration-300`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-600" /> Grands Comptes
            </h1>
            <p className="text-slate-500 text-sm mt-1">Gestion B2B et Facturation Centrale.</p>
          </div>
          {!selectedCompte && (
            <Button onClick={() => setShowCompteModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
               <PlusCircle className="w-4 h-4 mr-2" /> Nouveau Compte
            </Button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto flex-1 overflow-y-auto">
          {loading && <div className="p-8 text-center text-slate-500">Chargement...</div>}
          {!loading && comptes.length === 0 && <div className="p-8 text-center text-slate-500">Aucun grand compte enregistré.</div>}
          
          <div className="divide-y divide-slate-100">
            {Array.isArray(comptes) && comptes.map(c => (
              <div 
                key={c.id} 
                className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${selectedCompte?.id === c.id ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''}`}
                onClick={() => handleSelectCompte(c)}
              >
                <div>
                   <div className="font-bold text-slate-800">{c.nom}</div>
                   <div className="text-xs text-slate-500 mt-1">NIF: {c.nif || 'N/A'}</div>
                </div>
                <ChevronRight className={`w-5 h-5 ${selectedCompte?.id === c.id ? 'text-emerald-600' : 'text-slate-300'}`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Selected Compte Details */}
      {selectedCompte && (
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-6">
             <div>
               <h2 className="text-3xl font-black text-slate-800">{selectedCompte.nom}</h2>
               <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-4">
                  <span><span className="text-slate-400">NIF:</span> {selectedCompte.nif || '-'}</span>
                  <span><span className="text-slate-400">RC:</span> {selectedCompte.rc || '-'}</span>
                  <span><span className="text-slate-400">Contact:</span> {selectedCompte.contact_telephone}</span>
               </div>
             </div>
             <div className="flex gap-2">
               <Button variant="outline" onClick={() => setSelectedCompte(null)}>Fermer</Button>
             </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => setActiveTab('contrats')} 
              className={`px-4 py-2 font-bold rounded-full text-sm transition-colors ${activeTab === 'contrats' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >Contrats</button>
            <button 
              onClick={() => setActiveTab('bdc')} 
              className={`px-4 py-2 font-bold rounded-full text-sm transition-colors ${activeTab === 'bdc' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >Bons de Commande</button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex-1 overflow-y-auto">
             {activeTab === 'contrats' && (
               <div>
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileSignature className="w-5 h-5 text-emerald-500" /> Accords & Contrats</h3>
                     <Button size="sm" onClick={() => setShowContratModal(true)}>Ajouter un Contrat</Button>
                  </div>
                  {!contrats || contrats.length === 0 ? <p className="text-slate-500 text-center py-8">Aucun contrat défini pour ce compte.</p> : (
                    <div className="grid gap-4 sm:grid-cols-2">
                       {Array.isArray(contrats) && contrats.map(ct => (
                          <div key={ct.id} className="border border-slate-200 p-4 rounded-xl shadow-sm hover:border-emerald-300">
                             <div className="flex justify-between items-start mb-2">
                               <div className="font-bold text-emerald-900">{ct.reference}</div>
                               <span className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${ct.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                 {ct.actif ? 'Actif' : 'Inactif'}
                               </span>
                             </div>
                             <div className="text-sm text-slate-600 mb-2">Du {new Date(ct.date_debut).toLocaleDateString()} au {new Date(ct.date_fin).toLocaleDateString()}</div>
                             {ct.remise_percent > 0 && <div className="text-xs font-bold bg-amber-100 text-amber-800 inline-block px-2 py-1 rounded">Remise: {ct.remise_percent}%</div>}
                          </div>
                       ))}
                    </div>
                  )}
               </div>
             )}

             {activeTab === 'bdc' && (
               <div>
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-500" /> Bons de Commande</h3>
                     <Button size="sm" onClick={() => setShowBdcModal(true)}>Nouveau BDC</Button>
                  </div>
                  {!bdc || bdc.length === 0 ? <p className="text-slate-500 text-center py-8">Aucun BDC enregistré.</p> : (
                    <table className="w-full text-left text-sm text-slate-600">
                       <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
                          <tr>
                             <th className="px-4 py-3 font-semibold">Référence</th>
                             <th className="px-4 py-3 font-semibold text-right">Plafond Autorisé</th>
                             <th className="px-4 py-3 font-semibold text-right">Consommé</th>
                             <th className="px-4 py-3 font-semibold text-center">Statut</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                          {Array.isArray(bdc) && bdc.map(b => (
                             <tr key={b.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-800">{b.reference_interne}</td>
                                <td className="px-4 py-3 text-right font-medium">{b.montant_plafond.toLocaleString()} DZD</td>
                                <td className="px-4 py-3 text-right font-medium text-amber-600">{b.montant_consomme.toLocaleString()} DZD</td>
                                <td className="px-4 py-3 text-center">
                                   <span className={`px-2 py-1 text-xs font-bold uppercase rounded-full ${b.statut === 'actif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>{b.statut}</span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  )}
               </div>
             )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCompteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold mb-4">Nouveau Grand Compte</h2>
              <form onSubmit={createCompte} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Nom de l'entreprise *</label>
                   <input required type="text" className="w-full border rounded-md p-2" value={compteForm.nom} onChange={e => setCompteForm({...compteForm, nom: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium mb-1">NIF</label>
                     <input type="text" className="w-full border rounded-md p-2" value={compteForm.nif} onChange={e => setCompteForm({...compteForm, nif: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-1">RC</label>
                     <input type="text" className="w-full border rounded-md p-2" value={compteForm.rc} onChange={e => setCompteForm({...compteForm, rc: e.target.value})} />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium mb-1">Contact Nom</label>
                     <input type="text" className="w-full border rounded-md p-2" value={compteForm.contact_nom} onChange={e => setCompteForm({...compteForm, contact_nom: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-1">Contact Tél</label>
                     <input type="text" className="w-full border rounded-md p-2" value={compteForm.contact_telephone} onChange={e => setCompteForm({...compteForm, contact_telephone: e.target.value})} />
                   </div>
                 </div>
                 <div className="pt-4 flex justify-end gap-3 mt-4">
                   <Button variant="outline" type="button" onClick={() => setShowCompteModal(false)}>Annuler</Button>
                   <Button type="submit">Créer le compte</Button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {showContratModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold mb-4">Nouveau Contrat</h2>
              <form onSubmit={createContrat} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Référence du contrat *</label>
                   <input required type="text" className="w-full border rounded-md p-2" value={contratForm.reference} onChange={e => setContratForm({...contratForm, reference: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium mb-1">Date de début *</label>
                     <input required type="date" className="w-full border rounded-md p-2" value={contratForm.date_debut} onChange={e => setContratForm({...contratForm, date_debut: e.target.value})} />
                   </div>
                   <div>
                     <label className="block text-sm font-medium mb-1">Date de fin *</label>
                     <input required type="date" className="w-full border rounded-md p-2" value={contratForm.date_fin} onChange={e => setContratForm({...contratForm, date_fin: e.target.value})} />
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Remise globale (%)</label>
                   <input type="number" min="0" max="100" className="w-full border rounded-md p-2" value={contratForm.remise_percent} onChange={e => setContratForm({...contratForm, remise_percent: parseFloat(e.target.value)})} />
                 </div>
                 <div className="pt-4 flex justify-end gap-3 mt-4">
                   <Button variant="outline" type="button" onClick={() => setShowContratModal(false)}>Annuler</Button>
                   <Button type="submit">Enregistrer</Button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {showBdcModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-xl font-bold mb-4">Nouveau Bon de Commande</h2>
              <form onSubmit={createBdc} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Référence / Numéro BDC *</label>
                   <input required type="text" className="w-full border rounded-md p-2" value={bdcForm.reference_interne} onChange={e => setBdcForm({...bdcForm, reference_interne: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Plafond Autorisé (DZD) *</label>
                   <input required type="number" min="0" className="w-full border rounded-md p-2" value={bdcForm.montant_plafond} onChange={e => setBdcForm({...bdcForm, montant_plafond: parseFloat(e.target.value)})} />
                 </div>
                 <div className="pt-4 flex justify-end gap-3 mt-4">
                   <Button variant="outline" type="button" onClick={() => setShowBdcModal(false)}>Annuler</Button>
                   <Button type="submit">Valider le BDC</Button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}
