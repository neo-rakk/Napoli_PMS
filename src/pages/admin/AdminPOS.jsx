import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Plus, Trash2, Coffee, Wrench } from 'lucide-react';

export default function AdminPOS() {
  const { token } = useAuthStore();
  const [tables, setTables] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [products, setProducts] = useState([]);
  const [newTable, setNewTable] = useState({ nom: '', capacite: '' });
  const [newIngredient, setNewIngredient] = useState({ nom: '', stock_qty: '' });
  const [newProduct, setNewProduct] = useState({ nom: '', categorie: '', prix: '' });

  const fetchData = async () => {
    const [resTables, resIngredients, resProducts] = await Promise.all([
      fetch('/api/pos/tables', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/pos/ingredients', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/pos/products', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    if (resTables.ok) setTables(await resTables.json());
    if (resIngredients.ok) setIngredients(await resIngredients.json());
    if (resProducts.ok) setProducts(await resProducts.json());
  };

  useEffect(() => { fetchData(); }, [token]);

  const addTable = async () => {
    await fetch('/api/pos/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newTable)
    });
    setNewTable({ nom: '', capacite: '' });
    fetchData();
  };

  const addIngredient = async () => {
    await fetch('/api/pos/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newIngredient)
    });
    setNewIngredient({ nom: '', stock_qty: '' });
    fetchData();
  };

  const addProduct = async () => {
    await fetch('/api/pos/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newProduct)
    });
    setNewProduct({ nom: '', categorie: '', prix: '' });
    fetchData();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Gestion POS</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Coffee /> Tables</h2>
            <div className="flex gap-2 mb-4">
                <input placeholder="Nom" className="border p-2 rounded w-full" value={newTable.nom} onChange={e => setNewTable({...newTable, nom: e.target.value})} />
                <input placeholder="Cap." className="border p-2 rounded w-20" value={newTable.capacite} onChange={e => setNewTable({...newTable, capacite: e.target.value})} />
                <button className="bg-emerald-600 text-white p-2 rounded" onClick={addTable}><Plus /></button>
            </div>
            {tables.map(t => <div key={t.id} className="border-b py-2 flex justify-between"> {t.nom} ({t.capacite} pers)</div>)}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Wrench /> Ingrédients</h2>
            <div className="flex gap-2 mb-4">
                <input placeholder="Nom" className="border p-2 rounded w-full" value={newIngredient.nom} onChange={e => setNewIngredient({...newIngredient, nom: e.target.value})} />
                <input placeholder="Stock" className="border p-2 rounded w-20" value={newIngredient.stock_qty} onChange={e => setNewIngredient({...newIngredient, stock_qty: e.target.value})} />
                <button className="bg-emerald-600 text-white p-2 rounded" onClick={addIngredient}><Plus /></button>
            </div>
            {ingredients.map(i => <div key={i.id} className="border-b py-2 flex justify-between"> {i.nom} ({i.stock_qty})</div>)}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 md:col-span-2 lg:col-span-1">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Coffee /> Produits/Menus</h2>
            <div className="flex gap-2 mb-4 flex-col">
                <input placeholder="Nom" className="border p-2 rounded w-full" value={newProduct.nom} onChange={e => setNewProduct({...newProduct, nom: e.target.value})} />
                <input placeholder="Catégorie" className="border p-2 rounded w-full" value={newProduct.categorie} onChange={e => setNewProduct({...newProduct, categorie: e.target.value})} />
                <input placeholder="Prix" className="border p-2 rounded w-full" value={newProduct.prix} onChange={e => setNewProduct({...newProduct, prix: e.target.value})} />
                <button className="bg-emerald-600 text-white p-2 rounded w-full" onClick={addProduct}><Plus /> Ajouter Produit</button>
            </div>
            {products.map(p => <div key={p.id} className="border-b py-2 flex justify-between"> {p.nom} ({p.categorie}) - {p.prix} DZD</div>)}
        </div>
      </div>
    </div>
  );
}
