import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Building2, Plus, ArrowLeft, Grip, Settings, Edit3, CheckSquare, Square, Save, Hotel } from 'lucide-react';

export default function AdminHebergement() {
  const { token } = useAuthStore();
  const [blocs, setBlocs] = useState([]);
  const [chambres, setChambres] = useState([]);
  const [selectedBloc, setSelectedBloc] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showBlocModal, setShowBlocModal] = useState(false);
  const [blocForm, setBlocForm] = useState({ nom: '', code: '', nb_etages: 1, description: '' });

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({ chambres_par_etage: 10 });

  // Edit Mode
  const [editMode, setEditMode] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [bulkType, setBulkType] = useState('Single');

  const fetchBlocs = async () => {
    try {
      const res = await fetch('/api/blocs', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setBlocs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchChambres = async (blocId) => {
    try {
      const res = await fetch(`/api/chambres?bloc_id=${blocId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setChambres(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) fetchBlocs();
  }, [token]);

  useEffect(() => {
    if (selectedBloc && token) {
      fetchChambres(selectedBloc.id);
      setSelectedRooms([]);
      setEditMode(false);
    }
  }, [selectedBloc, token]);

  const handleCreateBloc = async (e) => {
    e.preventDefault();
    try {
      const autoCode = blocForm.nom.substring(0, 3).toUpperCase() + Math.random().toString(36).substr(2, 2).toUpperCase();
      const payload = { ...blocForm, code: blocForm.code || autoCode };
      
      const res = await fetch('/api/blocs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowBlocModal(false);
        setBlocForm({ nom: '', code: '', nb_etages: 1, description: '' });
        fetchBlocs();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateRooms = async (e) => {
    e.preventDefault();
    if (!selectedBloc) return;
    try {
      const res = await fetch(`/api/blocs/${selectedBloc.id}/chambres/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(generateForm)
      });
      if (res.ok) {
        setShowGenerateModal(false);
        fetchChambres(selectedBloc.id);
        fetchBlocs(); // Update counts
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRoomSelection = (roomId) => {
    if (selectedRooms.includes(roomId)) {
      setSelectedRooms(selectedRooms.filter(id => id !== roomId));
    } else {
      setSelectedRooms([...selectedRooms, roomId]);
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedRooms.length === 0) return;
    try {
      const res = await fetch('/api/chambres/bulk-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roomIds: selectedRooms, updates: { type: bulkType } })
      });
      if (res.ok) {
        setSelectedRooms([]);
        setEditMode(false);
        fetchChambres(selectedBloc.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectAll = () => {
    setSelectedRooms(chambres.map(c => c.id));
  };

  if (!selectedBloc) {
    // BLOCS VIEW
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-600" />
              Parc Immobilier - Blocs
            </h1>
            <p className="text-slate-500">Gérez les bâtiments et secteurs du village olympique.</p>
          </div>
          <Button onClick={() => setShowBlocModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Nouveau Bloc
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blocs.map(bloc => (
            <div 
              key={bloc.id} 
              onClick={() => setSelectedBloc(bloc)}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{bloc.nom}</h3>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{bloc.code}</span>
                </div>
                <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center">
                  <Hotel className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Étages :</span>
                  <span className="font-semibold text-slate-800">{bloc.nb_etages}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chambres totales :</span>
                  <span className="font-semibold text-slate-800">{bloc.nb_chambres || 0}</span>
                </div>
              </div>
            </div>
          ))}
          {blocs.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
              Aucun bloc créé. Commencez par ajouter un bloc.
            </div>
          )}
        </div>

        {/* Modal Create Bloc */}
        {showBlocModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
               <h2 className="text-xl font-bold mb-4">Ajouter un Bloc</h2>
               <form onSubmit={handleCreateBloc} className="space-y-4">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Nom du bloc *</label>
                   <input required type="text" className="w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" value={blocForm.nom} onChange={e => setBlocForm({...blocForm, nom: e.target.value})} placeholder="ex: Bâtiment A" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Code (optionnel)</label>
                     <input type="text" className="w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" value={blocForm.code} onChange={e => setBlocForm({...blocForm, code: e.target.value})} placeholder="ex: BATA" />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Nombre d'étages *</label>
                     <input required type="number" min="1" className="w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" value={blocForm.nb_etages} onChange={e => setBlocForm({...blocForm, nb_etages: parseInt(e.target.value)})} />
                   </div>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                   <textarea className="w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" rows="2" value={blocForm.description} onChange={e => setBlocForm({...blocForm, description: e.target.value})}></textarea>
                 </div>
                 <div className="pt-4 flex justify-end gap-3 border-t">
                   <Button variant="outline" type="button" onClick={() => setShowBlocModal(false)}>Annuler</Button>
                   <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Créer Bloc</Button>
                 </div>
               </form>
             </div>
          </div>
        )}
      </div>
    );
  }

  // CHAMBRES VIEW (INSIDE A BLOC)
  const etages = [...new Set(chambres.map(c => c.etage))].sort((a,b) => b-a); // Sort descending (top floor first)

  return (
    <div className="p-8 max-w-7xl mx-auto pb-32"> {/* pb-32 for floating action bar */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setSelectedBloc(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
           <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Bloc: {selectedBloc.nom}</h1>
          <p className="text-slate-500">{selectedBloc.nb_etages} étages — {chambres.length} chambres totales</p>
        </div>
        
        {chambres.length === 0 ? (
          <Button onClick={() => setShowGenerateModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Settings className="w-4 h-4 mr-2" /> Générer les chambres
          </Button>
        ) : (
          <Button 
             onClick={() => { setEditMode(!editMode); setSelectedRooms([]); }} 
             variant={editMode ? "outline" : "default"}
             className={editMode ? "border-slate-300" : "bg-slate-800 hover:bg-slate-900"}
          >
            {editMode ? "Annuler Édition" : <><Edit3 className="w-4 h-4 mr-2" /> Éditer les chambres</>}
          </Button>
        )}
      </div>

      {chambres.length > 0 && (
        <div className="space-y-8">
          {editMode && (
             <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex justify-between items-center text-sm text-indigo-800">
               <span>Mode édition actif. Cliquez sur les chambres pour les sélectionner.</span>
               <button onClick={selectAll} className="font-bold underline cursor-pointer">Sélectionner tout</button>
             </div>
          )}

          {etages.map(etage => (
             <div key={etage} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 font-bold text-slate-700 text-sm uppercase tracking-wider flex items-center justify-between">
                   <span>Étage {etage}</span>
                   <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded border">{chambres.filter(c => c.etage === etage).length} pièces</span>
                </div>
                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                   {chambres.filter(c => c.etage === etage).map(chambre => {
                      const isSelected = selectedRooms.includes(chambre.id);
                      return (
                        <div 
                           key={chambre.id} 
                           onClick={() => editMode && toggleRoomSelection(chambre.id)}
                           className={`
                             relative border rounded-lg p-3 text-center transition-all
                             ${editMode ? 'cursor-pointer hover:border-indigo-400' : ''}
                             ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-slate-200'}
                             ${!editMode ? 'bg-white' : ''}
                           `}
                        >
                           {editMode && (
                              <div className="absolute top-2 right-2 text-indigo-500">
                                {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300" />}
                              </div>
                           )}
                           <div className="text-lg font-black text-slate-800 mt-2">{chambre.numero}</div>
                           <div className={`text-xs font-bold uppercase mt-1 inline-block px-2 py-0.5 rounded-full
                              ${chambre.type?.toLowerCase() === 'single' ? 'bg-blue-100 text-blue-700' : ''}
                              ${chambre.type?.toLowerCase() === 'twin' ? 'bg-purple-100 text-purple-700' : ''}
                              ${chambre.type?.toLowerCase() === 'office' ? 'bg-amber-100 text-amber-700' : ''}
                              ${chambre.type?.toLowerCase() === 'stock' ? 'bg-neutral-100 text-neutral-600' : ''}
                              ${!['single','twin','office','stock'].includes(chambre.type?.toLowerCase()) ? 'bg-slate-100 text-slate-600' : ''}
                           `}>
                             {chambre.type || 'N/A'}
                           </div>
                        </div>
                      )
                   })}
                </div>
             </div>
          ))}
        </div>
      )}

      {/* Floating Action Bar for Edit Mode */}
      {editMode && selectedRooms.length > 0 && (
         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 px-6 py-4 flex items-center gap-6 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="font-bold text-indigo-600">
               {selectedRooms.length} chambre{selectedRooms.length > 1 ? 's' : ''} sélectionnée{selectedRooms.length > 1 ? 's' : ''}
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex items-center gap-3">
               <span className="text-sm font-medium text-slate-600">Type :</span>
               <select 
                  className="border border-slate-300 rounded-md py-1.5 px-3 text-sm focus:ring-indigo-500 font-medium bg-slate-50"
                  value={bulkType}
                  onChange={e => setBulkType(e.target.value)}
               >
                  <option value="Single">Single</option>
                  <option value="Twin">Twin</option>
                  <option value="Office">Office</option>
                  <option value="Stock">Stock</option>
               </select>
               <Button onClick={handleBulkUpdate} className="bg-indigo-600 hover:bg-indigo-700 ml-2 rounded-full px-6">
                  <Save className="w-4 h-4 mr-2" /> Appliquer
               </Button>
            </div>
         </div>
      )}

      {/* Modal Generate Rooms */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
             <div className="mx-auto w-12 h-12 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full mb-4">
               <Grip className="w-6 h-6" />
             </div>
             <h2 className="text-xl font-bold mb-2">Générer les chambres</h2>
             <p className="text-sm text-slate-500 mb-6">Le bloc <strong>{selectedBloc.nom}</strong> a <strong>{selectedBloc.nb_etages} étages</strong>. Combien de pièces souhaitez-vous par étage ?</p>
             
             <form onSubmit={handleGenerateRooms} className="space-y-4 text-left">
               <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1 text-center">Chambres par étage</label>
                 <input 
                    required 
                    type="number" 
                    min="1" 
                    max="100"
                    className="w-full border-slate-300 rounded-md text-center text-lg font-bold py-3 focus:ring-indigo-500" 
                    value={generateForm.chambres_par_etage} 
                    onChange={e => setGenerateForm({ chambres_par_etage: parseInt(e.target.value) })} 
                 />
                 <p className="text-xs text-center text-slate-400 mt-2">Soit {generateForm.chambres_par_etage * selectedBloc.nb_etages} pièces au total.</p>
               </div>
               <div className="pt-4 flex justify-between gap-3 border-t mt-6">
                 <Button variant="outline" type="button" onClick={() => setShowGenerateModal(false)} className="w-full">Annuler</Button>
                 <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700">Générer</Button>
               </div>
             </form>
           </div>
        </div>
      )}
    </div>
  );
}
