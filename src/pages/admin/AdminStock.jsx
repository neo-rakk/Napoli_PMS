import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { PackageSearch, PlusCircle, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from 'lucide-react';

export default function AdminStock() {
  const { token, user } = useAuthStore();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showMvt, setShowMvt] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Forms
  const [form, setForm] = useState({ nom: '', categorie: 'economat', seuil_alerte: 5, unite: 'Unités', description: '' });
  const [mvtForm, setMvtForm] = useState({ type_mouvement: 'entree', quantite: 1, reference: '' });

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stocks', { headers: { 'Authorization': `Bearer ${token}` } });
      setArticles(await res.json());
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchArticles(); }, [token]);

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
        fetchArticles();
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
         fetchArticles();
      }
    } catch(e) {}
  };

  const openMvt = (a, type) => {
     setSelectedArticle(a);
     setMvtForm({ ...mvtForm, type_mouvement: type });
     setShowMvt(true);
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
        <Button onClick={() => setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-700">
           <PlusCircle className="w-4 h-4 mr-2" /> Nouvel Article
        </Button>
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

    </div>
  );
}
