import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Droplets, ArrowRightLeft, PlusCircle } from 'lucide-react';

export default function HousekeepingBuanderie() {
  const { token } = useAuthStore();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMvt, setShowMvt] = useState(false);
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [mvtType, setMvtType] = useState('envoi_externe');
  const [lignesMvt, setLignesMvt] = useState([{ article_id: '', quantite: 1 }]);
  const [mvtRef, setMvtRef] = useState('');

  const [newArticle, setNewArticle] = useState({ nom: '', categorie: 'Linge de lit' });

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/housekeeping/buanderie/articles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchArticles();
  }, [token]);

  const handleMvtSubmit = async (e) => {
    e.preventDefault();
    const validLignes = lignesMvt.filter(l => l.article_id && l.quantite > 0);
    if (validLignes.length === 0) return alert('Sélectionnez au moins un article');
    
    try {
      const res = await fetch('/api/housekeeping/buanderie/mouvement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type: mvtType, reference: mvtRef, lignes: validLignes })
      });
      if (res.ok) {
        setShowMvt(false);
        setLignesMvt([{ article_id: '', quantite: 1 }]);
        setMvtRef('');
        fetchArticles();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleArticleSubmit = async (e) => {
     e.preventDefault();
     try {
       const res = await fetch('/api/housekeeping/buanderie/articles', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify(newArticle)
       });
       if (res.ok) {
         setShowAddArticle(false);
         setNewArticle({ nom: '', categorie: 'Linge de lit' });
         fetchArticles();
       }
     } catch (e) {
       console.error(e);
     }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Droplets className="w-6 h-6 text-purple-600" />
            Gestion Buanderie
          </h2>
          <p className="text-slate-500">Suivi du linge propre, sale et en lavage externe.</p>
        </div>
        <div className="flex gap-2">
           <Button onClick={() => setShowAddArticle(true)} variant="outline">
             + Article
           </Button>
           <Button onClick={() => { setMvtType('envoi_externe'); setShowMvt(true); }} className="bg-purple-600 hover:bg-purple-700">
             <ArrowRightLeft className="w-4 h-4 mr-2" /> Mouvement Linge
           </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Article</th>
              <th className="px-4 py-3 text-center text-emerald-600 bg-emerald-50">Stock Propre</th>
              <th className="px-4 py-3 text-center text-red-600 bg-red-50">Stock Sale (Attente)</th>
              <th className="px-4 py-3 text-center text-indigo-600 bg-indigo-50">Chez le Pressing</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan="4" className="text-center py-6">Chargement...</td></tr>}
            {!loading && articles.length === 0 && <tr><td colSpan="4" className="text-center py-6">Aucun article de buanderie configuré</td></tr>}
            {articles.map(a => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-800">{a.nom}</div>
                  <div className="text-xs text-slate-500 uppercase">{a.categorie}</div>
                </td>
                <td className="px-4 py-3 text-center font-bold text-emerald-700 bg-emerald-50/30">
                  {a.quantite_propre}
                </td>
                <td className="px-4 py-3 text-center font-bold text-red-700 bg-red-50/30">
                  {a.quantite_sale}
                </td>
                <td className="px-4 py-3 text-center font-bold text-indigo-700 bg-indigo-50/30">
                  {a.quantite_externe}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showMvt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Nouveau mouvement de linge</h2>
            <form onSubmit={handleMvtSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium mb-1">Type d'opération *</label>
                   <select className="w-full border rounded-md p-2 focus:ring-purple-500" value={mvtType} onChange={e=>setMvtType(e.target.value)}>
                     <option value="envoi_externe">Envoi au Pressing (Stock Sale -&gt; Externe)</option>
                     <option value="reception_externe">Réception du Pressing (Externe -&gt; Propre)</option>
                     <option value="ajout_stock">Achat / Ajout Stock Propre</option>
                     <option value="retrait_perte">Perte / Mise au rebut (Propre)</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium mb-1">Référence (optionnel)</label>
                   <input type="text" className="w-full border rounded-md p-2" value={mvtRef} onChange={e=>setMvtRef(e.target.value)} placeholder="Bon N°..." />
                 </div>
              </div>
              
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                 <h3 className="font-bold text-sm mb-3 text-slate-700">Articles concernés</h3>
                 {lignesMvt.map((ligne, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center">
                       <select required className="flex-1 border rounded-md p-2 text-sm" value={ligne.article_id} onChange={e=>{
                          const newL = [...lignesMvt];
                          newL[idx].article_id = e.target.value;
                          setLignesMvt(newL);
                       }}>
                         <option value="">Sélectionner...</option>
                         {articles.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.categorie})</option>)}
                       </select>
                       <input required type="number" min="1" className="w-24 border rounded-md p-2 text-sm" value={ligne.quantite} onChange={e=>{
                          const newL = [...lignesMvt];
                          newL[idx].quantite = parseInt(e.target.value);
                          setLignesMvt(newL);
                       }} />
                       <button type="button" onClick={() => setLignesMvt(lignesMvt.filter((_, i) => i !== idx))} className="text-red-500 font-bold px-2 hover:bg-red-50 rounded">X</button>
                    </div>
                 ))}
                 <Button type="button" variant="ghost" size="sm" onClick={() => setLignesMvt([...lignesMvt, { article_id: '', quantite: 1 }])} className="text-purple-600 mt-2 text-xs">
                    + Ajouter une ligne
                 </Button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setShowMvt(false)}>Annuler</Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Valider l'opération</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddArticle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nouvel article de buanderie</h2>
            <form onSubmit={handleArticleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom *</label>
                <input required type="text" className="w-full border rounded-md p-2" value={newArticle.nom} onChange={e=>setNewArticle({...newArticle, nom: e.target.value})} placeholder="ex: Drap Plat 2 places" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catégorie *</label>
                <select className="w-full border rounded-md p-2" value={newArticle.categorie} onChange={e=>setNewArticle({...newArticle, categorie: e.target.value})}>
                  <option value="Linge de lit">Linge de lit</option>
                  <option value="Linge de bain">Linge de bain</option>
                  <option value="Restauration">Restauration (Nappes, Serviettes)</option>
                  <option value="Uniforme">Uniformes du personnel</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => setShowAddArticle(false)}>Annuler</Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Enregistrer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
