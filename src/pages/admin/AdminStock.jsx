import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { PackageSearch, PlusCircle, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminStock() {
  const { token, user } = useAuthStore();
  const [articles, setArticles] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showMvt, setShowMvt] = useState(false);
  const [showBonAchat, setShowBonAchat] = useState(false);
  const [showReception, setShowReception] = useState(null); // stores the demande object
  const [quantiteRecue, setQuantiteRecue] = useState(1);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Selection for PO
  const [selectedDemandes, setSelectedDemandes] = useState([]);
  const [quantitesCommande, setQuantitesCommande] = useState({});

  // Forms
  const [form, setForm] = useState({ nom: '', categorie: 'economat', seuil_alerte: 5, unite: 'Unités', description: '' });
  const [mvtForm, setMvtForm] = useState({ type_mouvement: 'entree', quantite: 1, reference: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resArticles, resDemandes] = await Promise.all([
        fetch('/api/stocks', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/stocks/demandes-maintenance', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      setArticles(await resArticles.json());
      setDemandes(await resDemandes.json());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if(res.ok) {
        setShowCreate(false);
        setForm({ nom: '', categorie: 'economat', seuil_alerte: 5, unite: 'Unités', description: '' });
        fetchData();
      }
    } catch(e) {}
  };

  const handleMvt = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/stocks/${selectedArticle.id}/mouvements`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify(mvtForm)
      });
      if(res.ok) {
         setShowMvt(false);
         setSelectedArticle(null);
         setMvtForm({ type_mouvement: 'entree', quantite: 1, reference: '' });
         fetchData();
      }
    } catch(e) {}
  };

  const openMvt = (a, type) => {
     setSelectedArticle(a);
     setMvtForm({ ...mvtForm, type_mouvement: type });
     setShowMvt(true);
  };

  const handleUpdateDemandeStatut = async (id, statut) => {
    try {
      const res = await fetch(`/api/stocks/demandes-maintenance/${id}/statut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ statut })
      });
      if(res.ok) fetchData();
    } catch(e) { console.error(e); }
  };

  const handleReception = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/stocks/demandes-maintenance/${showReception.id}/recevoir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ quantite_recue: quantiteRecue })
      });
      if(res.ok) {
         setShowReception(null);
         fetchData();
      }
    } catch(e) { console.error(e); }
  };

  const openBonAchatModal = () => {
    if (selectedDemandes.length === 0) return alert('Sélectionnez au moins un article');
    
    // Initialize quantities for selected items
    const qtes = {};
    selectedDemandes.forEach(id => {
      const dem = demandes.find(d => d.id === id);
      qtes[id] = dem.quantite;
    });
    setQuantitesCommande(qtes);
    setShowBonAchat(true);
  };

  const generateBonAchatAndStore = async () => {
    const items = selectedDemandes.map(id => {
      const dem = demandes.find(d => d.id === id);
      return { ...dem, orderQuantite: quantitesCommande[id] };
    });

    // Generate PDF
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Bon d\'Achat - Maintenance', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 32);
    doc.text(`Édité par: ${user.prenom} ${user.nom}`, 14, 40);

    const tableData = items.map((item, idx) => [
      idx + 1,
      item.designation,
      item.reference || '-',
      item.orderQuantite,
      `Ch: ${item.chambre_numero} / Urgence: ${item.urgence}`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['#', 'Désignation', 'Référence', 'Quantité', 'Informations']],
      body: tableData,
    });

    try {
      // API call to set status to 'commande'
      const res = await fetch('/api/stocks/demandes-maintenance/commander', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({ ids: selectedDemandes, quantites: quantitesCommande })
      });
      
      if(res.ok) {
        doc.save(`Bon_Achat_Maintenance_${Date.now()}.pdf`);
        setShowBonAchat(false);
        setSelectedDemandes([]);
        fetchData();
      }
    } catch(e) { console.error(e); }
  };

  const generateEtatStocksPDF = async () => {
    try {
      const res = await fetch('/api/stocks/etat-complet', { headers: { 'Authorization': `Bearer ${token}` } });
      if(!res.ok) throw new Error("Erreur API");
      const { articles, mouvements } = await res.json();

      const doc = new jsPDF('landscape');
      doc.setFontSize(22);
      doc.text('État Complet des Stocks', 14, 22);
      
      doc.setFontSize(10);
      doc.text(`Date de génération : ${new Date().toLocaleString('fr-FR')}`, 14, 30);
      doc.text(`Édité par : ${user.prenom} ${user.nom}`, 14, 36);

      const tableData = articles.map(a => {
        const mvts = mouvements.filter(m => m.article_id === a.id);
        const sorties = mvts.filter(m => m.type_mouvement === 'sortie');
        const entrees = mvts.filter(m => m.type_mouvement === 'entree');
        
        const lastSortie = sorties[0] ? `${sorties[0].agent_prenom} ${sorties[0].agent_nom} (${new Date(sorties[0].created_at).toLocaleDateString()})` : '-';
        const lastEntree = entrees[0] ? `${entrees[0].agent_prenom} ${entrees[0].agent_nom} (${new Date(entrees[0].created_at).toLocaleDateString()})` : '-';
        
        return [
          a.categorie.toUpperCase(),
          a.nom,
          `${a.quantite_actuelle} ${a.unite}`,
          a.seuil_alerte,
          sorties.length.toString(),
          lastSortie,
          lastEntree
        ];
      });

      autoTable(doc, {
        startY: 45,
        head: [['Catégorie', 'Article', 'En Stock', 'Seuil', 'Fréq. Sorties', 'Dernière Sortie (Par)', 'Dernière Entrée (Par)']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 118, 110] } // emerald-700
      });

      try {
        doc.save(`Etat_Complet_Stocks_${Date.now()}.pdf`);
      } catch(e) {}
      
      setPdfPreviewUrl(doc.output('bloburl'));
    } catch(e) {
      alert("Erreur lors de la génération de l'état des stocks.");
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-emerald-600" /> Économat & Stocks
          </h1>
          <p className="text-slate-500">Gérez l'inventaire des produits (Housekeeping, Maintenance, POS).</p>
        </div>
        <div className="flex gap-3">
           <Button onClick={generateEtatStocksPDF} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
              <FileText className="w-4 h-4 mr-2" /> État des Stocks PDF
           </Button>
           <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <PlusCircle className="w-4 h-4 mr-2" /> Nouvel Article
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading && <div className="col-span-full text-center py-8 text-slate-500">Chargement...</div>}
        {!loading && articles.length === 0 && <div className="col-span-full text-center py-8 text-slate-500">Aucun article en stock.</div>}
        
        {Array.isArray(articles) && articles.map(a => (
           <div key={a.id} className={`bg-white rounded-2xl shadow-sm border p-5 flex flex-col ${a.quantite_actuelle <= a.seuil_alerte ? 'border-red-300' : 'border-slate-200'}`}>
              <div className="flex justify-between items-start mb-2">
                 <span className="px-2 py-1 text-xs font-bold uppercase rounded bg-slate-100 text-slate-600">{a.categorie}</span>
                 {a.quantite_actuelle <= a.seuil_alerte && <AlertTriangle className="w-5 h-5 text-red-500" title="Stock d'alerte atteint" />}
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">{a.nom}</h3>
              <p className="text-xs text-slate-500 mb-4 h-8 overflow-hidden">{a.description || 'Aucune description'}</p>
              
              <div className="mt-auto pt-4 border-t border-slate-100">
                 <div className="flex justify-between items-end mb-4">
                    <div>
                      <div className="text-xs text-slate-400 font-medium uppercase">En stock</div>
                      <div className={`text-3xl font-black ${a.quantite_actuelle <= a.seuil_alerte ? 'text-red-600' : 'text-slate-800'}`}>
                         {a.quantite_actuelle} <span className="text-sm font-medium text-slate-500">{a.unite}</span>
                      </div>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="w-full text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openMvt(a, 'entree')}>
                       <ArrowDownToLine className="w-4 h-4 mr-1" /> Entrée
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs font-bold border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => openMvt(a, 'sortie')}>
                       <ArrowUpFromLine className="w-4 h-4 mr-1" /> Sortie
                    </Button>
                 </div>
              </div>
           </div>
        ))}
      </div>

      <div className="mt-12 mb-6 flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <FileText className="w-6 h-6 text-indigo-600" /> Achats Maintenance
           </h2>
           <p className="text-sm text-slate-500">Gérez les demandes de pièces depuis les tickets de maintenance</p>
        </div>
        <Button onClick={openBonAchatModal} className="bg-indigo-600 hover:bg-indigo-700">
           <FileText className="w-4 h-4 mr-2" /> Créer Bon d'Achat
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto mb-12">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 w-12">
                 <input 
                    type="checkbox" 
                    onChange={e => setSelectedDemandes(e.target.checked ? demandes.map(d => d.id) : [])}
                    checked={selectedDemandes.length > 0 && selectedDemandes.length === demandes.length}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                 />
              </th>
              <th className="px-6 py-4">Article</th>
              <th className="px-6 py-4">Chambre & Urgence</th>
              <th className="px-6 py-4">Technicien</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {demandes.length === 0 && (
              <tr><td colSpan="6" className="text-center py-6 text-slate-500">Aucune demande en attente</td></tr>
            )}
            {demandes.map(d => (
              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                   <input 
                      type="checkbox" 
                      onChange={e => {
                        if (e.target.checked) setSelectedDemandes([...selectedDemandes, d.id]);
                        else setSelectedDemandes(selectedDemandes.filter(id => id !== d.id));
                      }}
                      checked={selectedDemandes.includes(d.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                   />
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">
                    {d.designation} <span className="text-slate-400 font-normal">x{d.quantite}</span>
                    {d.quantite_commandee && <span className="ml-2 text-indigo-500 font-normal text-xs">(Cmd: x{d.quantite_commandee})</span>}
                  </div>
                  <div className="text-xs text-slate-500">{d.reference ? `Réf: ${d.reference}` : 'Sans référence'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800">Chambre {d.chambre_numero}</div>
                  <div className={`text-xs uppercase font-bold mt-1 ${d.urgence === 'immediate' ? 'text-red-500' : 'text-amber-500'}`}>
                    Urgence {d.urgence}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium">{d.agent_prenom} {d.agent_nom}</div>
                  <div className="text-xs text-slate-500">{new Date(d.created_at).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${
                     d.statut === 'en_attente' ? 'bg-amber-100 text-amber-700' :
                     d.statut === 'commande' ? 'bg-indigo-100 text-indigo-700' :
                     d.statut === 'mis_a_disposition' ? 'bg-emerald-100 text-emerald-700' :
                     'bg-slate-100 text-slate-700'
                  }`}>
                    {d.statut}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {d.statut === 'commande' && (
                    <Button size="sm" variant="outline" className="text-xs py-1 h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50" 
                       onClick={() => { setShowReception(d); setQuantiteRecue(d.quantite_commandee || d.quantite); }}>
                       <CheckCircle className="w-3 h-3 mr-1" /> Recevoir
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showReception && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-emerald-700">
                 <ArrowDownToLine className="w-5 h-5" /> Réception de Pièce
              </h2>
              <p className="text-slate-500 text-sm mb-4 font-medium">Article : {showReception.designation}</p>
              
              <form onSubmit={handleReception} className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold mb-1 text-slate-700">Quantité totale reçue</label>
                   <input required type="number" min="1" className="w-full border rounded-md p-3 text-lg font-bold" value={quantiteRecue} onChange={e=>setQuantiteRecue(parseInt(e.target.value))} />
                   <p className="text-xs text-slate-400 mt-2">
                     Demandé pour le ticket : <strong className="text-slate-600">{showReception.quantite}</strong><br/>
                     Tout surplus sera automatiquement ajouté dans <em>Économat & Stocks</em> sous la section Maintenance.
                   </p>
                 </div>
                 <div className="pt-4 flex justify-end gap-3 mt-4 border-t border-slate-100">
                   <Button variant="outline" type="button" onClick={() => setShowReception(null)}>Annuler</Button>
                   <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold">Confirmer Réception</Button>
                 </div>
              </form>
           </div>
         </div>
      )}

      {showBonAchat && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                 <FileText className="w-5 h-5 text-indigo-600" /> Générer un Bon d'Achat
              </h2>
              <p className="text-slate-500 text-sm mb-6 font-medium">Validation des articles et quantités avant commande :</p>
              
              <div className="space-y-4 mb-6">
                 {selectedDemandes.map(id => {
                    const dem = demandes.find(d => d.id === id);
                    return (
                       <div key={id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                          <div>
                             <div className="font-bold text-sm text-slate-800">{dem.designation}</div>
                             <div className="text-xs text-slate-500">Ch: {dem.chambre_numero} - Tech: {dem.agent_nom}</div>
                          </div>
                          <div className="flex items-center gap-2">
                             <label className="text-xs font-bold text-slate-500">Qté :</label>
                             <input 
                                type="number" 
                                min="1" 
                                className="w-20 border rounded p-1 text-center font-bold" 
                                value={quantitesCommande[id] || ''} 
                                onChange={e => setQuantitesCommande({...quantitesCommande, [id]: parseInt(e.target.value) || 1})}
                             />
                          </div>
                       </div>
                    );
                 })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" onClick={() => setShowBonAchat(false)}>Annuler</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={generateBonAchatAndStore}>
                   Générer & Télécharger PDF
                </Button>
              </div>
           </div>
         </div>
      )}

      {showCreate && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Nouvel Article</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Désignation *</label>
                   <input required type="text" className="w-full border rounded-md p-2" value={form.nom} onChange={e=>setForm({...form, nom: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Catégorie</label>
                      <select className="w-full border rounded-md p-2" value={form.categorie} onChange={e=>setForm({...form, categorie: e.target.value})}>
                          <option value="economat">Économat Général</option>
                          <option value="housekeeping">Produits Housekeeping</option>
                          <option value="maintenance">Pièces Maintenance</option>
                          <option value="pos">Articles POS (Boissons...)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Unité</label>
                      <input type="text" className="w-full border rounded-md p-2" value={form.unite} onChange={e=>setForm({...form, unite: e.target.value})} placeholder="Ex: Litres, Cartons" />
                    </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Seuil d'alerte (Quantité minimum)</label>
                   <input required type="number" min="0" className="w-full border rounded-md p-2" value={form.seuil_alerte} onChange={e=>setForm({...form, seuil_alerte: parseFloat(e.target.value)})} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Description</label>
                   <textarea rows="2" className="w-full border rounded-md p-2" value={form.description} onChange={e=>setForm({...form, description: e.target.value})}></textarea>
                 </div>
                 <div className="pt-4 flex justify-end gap-3 mt-4">
                   <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Annuler</Button>
                   <Button type="submit">Créer</Button>
                 </div>
              </form>
           </div>
         </div>
      )}

      {showMvt && selectedArticle && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className={`text-xl font-bold mb-1 flex items-center gap-2 ${mvtForm.type_mouvement === 'entree' ? 'text-emerald-700' : 'text-amber-700'}`}>
                 {mvtForm.type_mouvement === 'entree' ? <><ArrowDownToLine className="w-5 h-5"/> Entrée de Stock</> : <><ArrowUpFromLine className="w-5 h-5"/> Sortie de Stock</>}
              </h2>
              <p className="text-slate-500 text-sm mb-6 font-medium">Article : {selectedArticle.nom}</p>
              
              <form onSubmit={handleMvt} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Quantité à {mvtForm.type_mouvement === 'entree' ? 'ajouter' : 'déduire'} ({selectedArticle.unite}) *</label>
                   <input required type="number" min="0.01" step="0.01" className="w-full border rounded-md p-3 text-lg font-bold" value={mvtForm.quantite} onChange={e=>setMvtForm({...mvtForm, quantite: e.target.value})} />
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Référence / Motif (Optionnel)</label>
                   <input type="text" className="w-full border rounded-md p-2" value={mvtForm.reference} onChange={e=>setMvtForm({...mvtForm, reference: e.target.value})} placeholder={mvtForm.type_mouvement === 'entree' ? "Ex: BC N°1234, Livreur X" : "Ex: Assigné Chambre 101, Ticket Maint."} />
                 </div>
                 <div className="pt-4 flex justify-end gap-3 mt-4">
                   <Button variant="outline" type="button" onClick={() => setShowMvt(false)}>Annuler</Button>
                   <Button type="submit" className={mvtForm.type_mouvement === 'entree' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}>Confirmer</Button>
                 </div>
              </form>
           </div>
         </div>
      )}

      {pdfPreviewUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4">
           <div className="bg-white rounded-t-xl w-full max-w-4xl p-4 flex justify-between items-center">
              <h2 className="font-bold text-lg">Aperçu du document PDF</h2>
              <div className="flex gap-2">
                 <Button variant="outline" onClick={() => window.open(pdfPreviewUrl)}>Ouvrir Nouvel Onglet</Button>
                 <Button className="bg-slate-800" onClick={() => setPdfPreviewUrl(null)}>Fermer</Button>
              </div>
           </div>
           <iframe src={pdfPreviewUrl} className="w-full max-w-4xl h-[80vh] bg-slate-100 rounded-b-xl border-none"></iframe>
        </div>
      )}

    </div>
  );
}
