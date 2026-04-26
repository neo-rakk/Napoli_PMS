import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { ShoppingCart, User, CreditCard, Banknote, Trash2, Hotel } from 'lucide-react';

export default function POSDashboard() {
  const { token } = useAuthStore();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Tout');
  const [showPayment, setShowPayment] = useState(false);
  
  // Imputation Chambre state
  const [inHouseClients, setInHouseClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');

  useEffect(() => {
    fetch('/api/pos/products', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(setProducts)
      .catch(console.error);

    fetch('/api/reservations', { headers: { 'Authorization': `Bearer ${token}` } })
       .then(r => r.json())
       .then(data => setInHouseClients(data.filter(c => c.statut === 'checkin')))
       .catch(console.error);
  }, [token]);

  const categories = useMemo(() => ['Tout', ...new Set(products.map(p => p.categorie))], [products]);

  const filteredProducts = activeCategory === 'Tout' ? products : products.filter(p => p.categorie === activeCategory);

  const cartTotal = cart.reduce((sum, item) => sum + (item.prix * item.quantite), 0);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id ? { ...i, quantite: i.quantite + 1 } : i);
      }
      return [...prev, { product_id: product.id, nom: product.nom, prix: product.prix, quantite: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id === id) {
        const newQ = i.quantite + delta;
        return newQ > 0 ? { ...i, quantite: newQ } : i;
      }
      return i;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.product_id !== id));
  };

  const handleCheckout = async (methode) => {
    if (cart.length === 0) return;
    if (methode === 'chambre' && !selectedClient) {
       alert("Veuillez sélectionner un client en chambre (In-House)");
       return;
    }

    let chambre_id = null;
    let reservation_id = null;

    if (methode === 'chambre') {
       const clientData = inHouseClients.find(c => c.id.toString() === selectedClient);
       if (clientData) {
         chambre_id = clientData.chambre_id;
         reservation_id = clientData.id;
       }
    }

    try {
      const res = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          items: cart,
          total: cartTotal,
          methode_paiement: methode,
          chambre_id,
          reservation_id
        })
      });

      if (res.ok) {
        setCart([]);
        setShowPayment(false);
        setSelectedClient('');
        alert('Commande validée !');
      } else {
        alert('Erreur lors de la validation');
      }
    } catch(e) { console.error(e); }
  };

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      
      {/* Left side: Products Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Categories Bar */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex gap-2 overflow-x-auto shrink-0 shadow-sm z-10">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-colors ${
                activeCategory === cat 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                onClick={() => addToCart(p)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center text-center select-none active:scale-95"
              >
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                   <Coffee className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="font-bold text-slate-800 leading-tight mb-2 h-10 flex items-center justify-center">{p.nom}</h3>
                <div className="text-lg font-black text-emerald-600 mt-auto">{p.prix} DZD</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side: Cart / Invoice */}
      <div className="w-[400px] bg-white shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-slate-200 flex flex-col z-20">
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
          <h2 className="font-bold text-emerald-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> 
            Commande en cours
          </h2>
          <span className="bg-emerald-200 text-emerald-800 px-2 py-1 rounded text-xs font-bold">{cart.length} art.</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {cart.length === 0 ? (
             <div className="text-center text-slate-400 mt-10 font-medium flex flex-col items-center">
                <ShoppingCart className="w-12 h-12 mb-3 text-slate-300" />
                Le panier est vide
             </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center shadow-sm">
                <div className="flex-1">
                  <div className="font-bold text-sm text-slate-800">{item.nom}</div>
                  <div className="text-xs text-emerald-600 font-bold">{item.prix} DZD / u</div>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => updateQuantity(item.product_id, -1)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-600">-</button>
                   <span className="w-6 text-center font-bold text-sm">{item.quantite}</span>
                   <button onClick={() => updateQuantity(item.product_id, 1)} className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-600">+</button>
                </div>
                <button onClick={() => removeFromCart(item.product_id)} className="ml-3 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Total & Checkout */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex justify-between items-center mb-4">
             <span className="text-slate-500 font-medium">Net à payer</span>
             <span className="text-3xl font-black text-slate-800">{cartTotal.toLocaleString()} DZD</span>
          </div>
          
          <Button 
             className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700"
             disabled={cart.length === 0}
             onClick={() => setShowPayment(true)}
          >
            Passer à l'encaissement
          </Button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="bg-slate-50 p-6 border-b border-slate-200">
                 <h2 className="text-xl font-black text-slate-800 text-center">Encaissement</h2>
                 <div className="text-center text-3xl font-black text-emerald-600 mt-2">{cartTotal.toLocaleString()} DZD</div>
              </div>
              
              <div className="p-6 space-y-4">
                 <button onClick={() => handleCheckout('cash')} className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 flex items-center gap-4 group transition-all">
                    <div className="bg-emerald-100 p-3 rounded-full group-hover:bg-emerald-200"><Banknote className="w-6 h-6 text-emerald-700" /></div>
                    <div className="text-left"><div className="font-bold text-lg text-slate-800">Espèces (Cash)</div><div className="text-sm text-slate-500">Paiement au comptoir</div></div>
                 </button>
                 
                 <button onClick={() => handleCheckout('tpe')} className="w-full p-4 border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 flex items-center gap-4 group transition-all">
                    <div className="bg-emerald-100 p-3 rounded-full group-hover:bg-emerald-200"><CreditCard className="w-6 h-6 text-emerald-700" /></div>
                    <div className="text-left"><div className="font-bold text-lg text-slate-800">Carte Bancaire / TPE</div><div className="text-sm text-slate-500">Paiement par terminal CIB</div></div>
                 </button>

                 <div className="border-t border-slate-200 pt-4 mt-2">
                   <div className="mb-2 font-bold text-slate-700">📌 Transférer sur la note de Chambre (Room Charge) :</div>
                   <select className="w-full border-slate-300 rounded-lg p-3" value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                      <option value="">-- Sélectonner le Client en chambre --</option>
                      {inHouseClients.map(c => (
                         <option key={c.id} value={c.id}>
                           Chambre {c.chambre_numero} - {c.nom} {c.prenom}
                         </option>
                      ))}
                   </select>
                   <button onClick={() => handleCheckout('chambre')} disabled={!selectedClient} className="w-full mt-3 p-3 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                       <Hotel className="w-5 h-5" /> Imputer à la chambre
                   </button>
                 </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <Button variant="outline" onClick={() => setShowPayment(false)}>Annuler</Button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
