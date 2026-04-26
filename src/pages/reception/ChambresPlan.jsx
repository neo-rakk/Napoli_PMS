import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Filter, X, Zap } from 'lucide-react';

export default function ChambresPlan() {
  const { token } = useAuthStore();
  const [chambres, setChambres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('tous');
  const [selectedChambre, setSelectedChambre] = useState(null);

  const fetchChambres = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chambres', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setChambres(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchChambres();
  }, [token]);

  const filteredChambres = chambres.filter(c => filterStatut === 'tous' || c.statut === filterStatut);

  const getStatusColor = (statut) => {
    switch(statut) {
      case 'libre': return 'bg-emerald-500';
      case 'partielle': return 'bg-amber-400';
      case 'occupee': return 'bg-red-500';
      case 'travaux': return 'bg-orange-500';
      case 'bloquee': return 'bg-slate-700';
      case 'stock_etage': return 'bg-slate-300';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const legende = [
    { statut: 'libre',       color: 'bg-emerald-500', label: 'lib' },
    { statut: 'partielle',   color: 'bg-amber-400',   label: 'par' },
    { statut: 'occupee',     color: 'bg-red-500',     label: 'occ' },
    { statut: 'travaux',     color: 'bg-orange-500',  label: 'trv' },
    { statut: 'bloquee',     color: 'bg-slate-700',   label: 'blq' },
    { statut: 'stock_etage', color: 'bg-slate-300',   label: 'stk' },
  ];

  // Group by bloc then by etage
  const grouped = filteredChambres.reduce((acc, c) => {
    if(!acc[c.bloc_nom]) acc[c.bloc_nom] = {};
    if(!acc[c.bloc_nom][c.etage]) acc[c.bloc_nom][c.etage] = [];
    acc[c.bloc_nom][c.etage].push(c);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-slate-50 relative p-4 gap-4">
      {/* Header filtres */}
      <div className="flex justify-between items-center bg-white p-2 md:p-4 rounded-xl shadow-sm border border-slate-100 shrink-0">
        <h1 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-900 flex items-center gap-2">
          <Filter size={14} className="text-emerald-500" />
          Plan des Chambres
        </h1>
        <div className="flex gap-2 flex-wrap">
           <select 
             className="text-xs font-bold border border-slate-200 rounded-md px-2 py-1 outline-none focus:border-emerald-500"
             value={filterStatut}
             onChange={e => setFilterStatut(e.target.value)}
           >
             <option value="tous">Tous les statuts</option>
             {legende.map(l => <option key={l.statut} value={l.statut}>{l.statut}</option>)}
           </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500">Chargement...</div>
      ) : (
        <div className="flex h-full gap-4 overflow-hidden relative">
          
          <div className="flex-1 overflow-y-auto no-scrollbar pb-20 space-y-8">
            {Object.keys(grouped).sort().map(bloc => (
              <div key={bloc} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xs font-black text-emerald-800 uppercase mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Bloc {bloc}
                </h2>
                <div className="space-y-2">
                  {Object.keys(grouped[bloc]).sort((a,b)=>Number(b)-Number(a)).map(etage => (
                    <div key={etage} className="flex gap-2">
                      <div className="w-8 shrink-0 flex items-center justify-center font-bold text-slate-300 uppercase text-[7px] border-r border-slate-50">
                        ETG {etage}
                      </div>
                      <div className="flex flex-wrap gap-1 py-1">
                        {grouped[bloc][etage].sort((a,b)=>a.numero.localeCompare(b.numero)).map(c => {
                          const isSelected = selectedChambre && selectedChambre.id === c.id;
                          return (
                            <button 
                              key={c.id}
                              onClick={() => setSelectedChambre(c)}
                              className={`w-8 h-8 rounded-md flex items-center justify-center transition-all hover:scale-125 border border-white/10 ${getStatusColor(c.statut)} ${isSelected ? 'ring-2 ring-emerald-400 scale-125 z-10 shadow-lg' : ''}`}
                            >
                              <span className="text-[9px] font-black text-white">{c.numero}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Panneau latéral */}
          {selectedChambre && (
            <div className="w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 shrink-0 h-full">
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div>
                   <h3 className="text-lg font-black tracking-tighter text-emerald-400">CHAMBRE {selectedChambre.numero}</h3>
                   <span className="text-[8px] uppercase font-bold text-slate-400 block mt-1">Bloc {selectedChambre.bloc_nom} - Étage {selectedChambre.etage}</span>
                </div>
                <button onClick={() => setSelectedChambre(null)} className="text-slate-400 hover:text-white p-1 bg-white/10 rounded-lg">
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto">
                <div className="flex items-center gap-2 mb-6">
                  <span className={`w-3 h-3 rounded-full ${getStatusColor(selectedChambre.statut)}`} />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700">{selectedChambre.statut.replace('_', ' ')}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl mb-6 border border-slate-100">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Type</p>
                    <p className="text-xs font-bold text-slate-800">{selectedChambre.type}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Capacité</p>
                    <p className="text-xs font-bold text-slate-800">{selectedChambre.nb_occupants_actuels}/{selectedChambre.capacite_max} lits</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b pb-1">Actions Rapides</h4>
                  <div className="grid gap-2">
                    {/* Placeholder actions pour affichage */}
                    <Button variant="secondary" className="w-full text-[10px] h-9 font-black" onClick={() => alert('À venir')}>
                      <Zap size={12} className="mr-2 text-emerald-500" /> Historique (Bientôt)
                    </Button>
                    <Button variant="danger" className="w-full text-[10px] h-9 font-black" onClick={() => alert('Signaler en maintenance')}>
                      Signaler Maintenance
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Légende compacte fixe */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white p-2 px-4 rounded-xl border border-slate-200 shadow-xl flex gap-6 z-10">
        {legende.map(l => (
          <div key={l.statut} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full shadow-inner ${l.color}`}></span>
            <span className="text-[9px] font-black uppercase text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
