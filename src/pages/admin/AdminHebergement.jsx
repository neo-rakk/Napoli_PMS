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
  const [localChambres, setLocalChambres] = useState([]);

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

  const applyTypeToSelected = (typeStr) => {
    if (selectedRooms.length === 0) return;
    setLocalChambres(prev => 
       prev.map(c => selectedRooms.includes(c.id) ? { ...c, type: typeStr } : c)
    );
    setSelectedRooms([]);
  };

  const handleSaveBulk = async () => {
    const changes = localChambres.filter(lc => {
       const orig = chambres.find(c => c.id === lc.id);
       return orig && orig.type !== lc.type;
    });
    
    if (changes.length === 0) {
        setEditMode(false);
        return;
    }

    const byType = {};
    changes.forEach(c => {
       if(!byType[c.type]) byType[c.type] = [];
       byType[c.type].push(c.id);
    });

    try {
        for (const [type, roomIds] of Object.entries(byType)) {
            await fetch('/api/chambres/bulk-update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ roomIds, updates: { type } })
            });
        }
        setEditMode(false);
        fetchChambres(selectedBloc.id);
    } catch(e) { 
        console.error(e); 
        alert("Erreur lors de l'enregistrement");
    }
  };

  const startEditMode = () => {
    setLocalChambres([...chambres]);
    setEditMode(true);
    setSelectedRooms([]);
  };

  const selectAllOnFloor = (etage) => {
    const currentList = editMode ? localChambres : chambres;
    const floorRooms = currentList.filter(c => c.etage === etage).map(c => c.id);
    // If all are selected, unselect them. Otherwise select all.
    const allSelected = floorRooms.every(id => selectedRooms.includes(id));
    if (allSelected) {
      setSelectedRooms(selectedRooms.filter(id => !floorRooms.includes(id)));
    } else {
      const newSelected = new Set([...selectedRooms, ...floorRooms]);
      setSelectedRooms(Array.from(newSelected));
    }
  };

  const getTypeColor = (type, isEdit = false) => {
    const t = type?.toLowerCase() || '';
    if (t === 'single') return isEdit ? 'bg-blue-100 text-blue-800 border-blue-400' : 'bg-blue-50 text-blue-700 border-blue-200';
    if (t === 'twin') return isEdit ? 'bg-purple-100 text-purple-800 border-purple-400' : 'bg-purple-50 text-purple-700 border-purple-200';
    if (t === 'office') return isEdit ? 'bg-amber-100 text-amber-800 border-amber-400' : 'bg-amber-50 text-amber-700 border-amber-200';
    if (t === 'stock') return isEdit ? 'bg-slate-200 text-slate-800 border-slate-400' : 'bg-slate-100 text-slate-600 border-slate-200';
    return isEdit ? 'bg-white text-slate-800 border-slate-300' : 'bg-white text-slate-600 border-slate-200';
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
    <div className={`mx-auto ${editMode ? 'w-full' : 'p-8 max-w-7xl'}`}>
      {!editMode && (
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
               onClick={startEditMode} 
               className="bg-slate-800 hover:bg-slate-900"
            >
              <Edit3 className="w-4 h-4 mr-2" /> Éditer les chambres
            </Button>
          )}
        </div>
      )}

      {/* EDIT MODE COMPLET VIEW */}
      {editMode && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto flex flex-col">
           <div className="sticky top-0 bg-white border-b border-slate-200 p-4 shadow-sm z-10 flex flex-col gap-4">
              <div className="flex justify-between items-center max-w-7xl mx-auto w-full">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-indigo-600" />
                    Édition des chambres - {selectedBloc.nom}
                  </h2>
                  <p className="text-sm text-slate-500">Sélectionnez des chambres en bas, puis cliquez sur un type pour appliquer.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setEditMode(false)}>Annuler</Button>
                  <Button onClick={handleSaveBulk} className="bg-indigo-600 hover:bg-indigo-700">
                    <Save className="w-4 h-4 mr-2" /> Enregistrer les modifications
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-4 max-w-7xl mx-auto w-full pb-2">
                 <div className="text-sm font-semibold text-slate-600 mr-2 flex items-center gap-2 border-r pr-4 border-slate-300">
                   <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs">{selectedRooms.length} sélectionnée(s)</span>
                 </div>
                 <Button onClick={() => applyTypeToSelected('Single')} className="bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300 hover:border-blue-400 shadow-none px-6 rounded-full font-bold">Single</Button>
                 <Button onClick={() => applyTypeToSelected('Twin')} className="bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300 hover:border-purple-400 shadow-none px-6 rounded-full font-bold">Twin</Button>
                 <Button onClick={() => applyTypeToSelected('Office')} className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 hover:border-amber-400 shadow-none px-6 rounded-full font-bold">Office</Button>
                 <Button onClick={() => applyTypeToSelected('Stock')} className="bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-400 hover:border-slate-500 shadow-none px-6 rounded-full font-bold">Stock d'étage</Button>
              </div>
           </div>

           <div className="p-6 max-w-7xl mx-auto flex-1 w-full space-y-8">
              {etages.map(etage => (
                <div key={etage} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                   <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 text-sm flex justify-between items-center">
                     <span className="font-bold uppercase tracking-wider text-slate-700">Étage {etage}</span>
                     <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded border border-indigo-100 hover:border-indigo-300 transition-colors" onClick={() => selectAllOnFloor(etage)}>
                       Sélectionner tout l'étage
                     </button>
                   </div>
                   <div className="p-5 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                     {localChambres.filter(c => c.etage === etage).map(ch => {
                        const isSelected = selectedRooms.includes(ch.id);
                        return (
                            <div 
                              key={ch.id}
                              onClick={() => toggleRoomSelection(ch.id)}
                              className={`
                                cursor-pointer border rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all
                                ${isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105 shadow-md z-10' : 'hover:scale-105'}
                                ${getTypeColor(ch.type, isSelected)}
                              `}
                            >
                               <span className={`text-base font-black ${isSelected ? 'text-indigo-900' : ''}`}>{ch.numero}</span>
                               <span className={`text-[10px] w-full truncate font-bold uppercase ${isSelected ? 'text-indigo-700 opacity-100' : 'opacity-70 mt-1'}`}>{ch.type || 'N/A'}</span>
                            </div>
                        )
                     })}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* NORMAL VIEW */}
      {!editMode && chambres.length > 0 && (
        <div className="space-y-6">
          {etages.map(etage => (
             <div key={etage} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 font-bold text-slate-700 text-sm uppercase tracking-wider flex items-center justify-between">
                   <span>Étage {etage}</span>
                   <span className="text-xs font-medium text-slate-400 bg-white px-2 py-0.5 rounded border">{chambres.filter(c => c.etage === etage).length} pièces</span>
                </div>
                <div className="p-5 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                   {chambres.filter(c => c.etage === etage).map(chambre => (
                      <div 
                         key={chambre.id} 
                         className={`border rounded-lg p-2 flex flex-col items-center justify-center text-center shadow-sm ${getTypeColor(chambre.type, false)}`}
                      >
                         <div className="text-base font-black text-slate-800">{chambre.numero}</div>
                         <div className="text-[10px] font-bold uppercase mt-1 opacity-80 w-full truncate">
                           {chambre.type || 'N/A'}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          ))}
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
