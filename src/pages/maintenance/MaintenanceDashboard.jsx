import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Camera, MapPin, AlertTriangle, CheckCircle, PackageSearch, PenTool } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function MaintenanceDashboard() {
  const { user, token } = useAuthStore();
  const [taches, setTaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // States for interaction
  const [achatsForm, setAchatsForm] = useState(false);
  const [newAchat, setNewAchat] = useState({ designation: '', quantite: 1, urgence: 'normale' });
  const [rapportText, setRapportText] = useState('');
  // We simulate photo taking via an input
  const [photoRap, setPhotoRap] = useState('');

  const fetchTaches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      // Only show tasks assigned to this tech, or unassigned (signale)
      const myTasks = data.filter(t => t.assigne_a === user.id || t.statut === 'signale');
      setTaches(myTasks);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchTaches();
    const interval = setInterval(fetchTaches, 30000);
    return () => clearInterval(interval);
  }, [token, user?.id]);

  const handleStartTask = async (task) => {
    try {
      // First assign to me if not already assigned
      if(task.assigne_a !== user.id) {
         await fetch(`/api/maintenance/${task.id}/assigner`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify({ assigne_a: user.id })
         });
      }
      
      const res = await fetch(`/api/maintenance/${task.id}/statut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ statut: 'en_cours' })
      });
      if(res.ok) fetchTaches();
    } catch(e) { console.error(e); }
  };

  const handleResolveTask = async () => {
    try {
      const res = await fetch(`/api/maintenance/${selectedTask.id}/statut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
           statut: 'resolu',
           rapport: rapportText,
           photo_reparation: photoRap || 'photo_url_simulee.jpg'
        })
      });
      if(res.ok) {
        setSelectedTask(null);
        setRapportText('');
        fetchTaches();
      }
    } catch(e) { console.error(e); }
  };

  const handleDemandeAchat = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/maintenance/${selectedTask.id}/achats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newAchat)
      });
      if(res.ok) {
         setAchatsForm(false);
         setNewAchat({ designation: '', quantite: 1, urgence: 'normale' });
         alert("Demande d'achat envoyée à la réception/direction.");
      }
    } catch(e) { console.error(e); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
         <h2 className="text-xl font-bold text-neutral-800">Mes Interventions</h2>
         <p className="text-neutral-500 text-sm">Signalements et tâches assignées en attente de réparation.</p>
      </div>

      {loading && taches.length === 0 ? <p className="text-center p-8 text-neutral-500 font-medium">Chargement des données...</p> : null}

      {!loading && taches.filter(t => t.statut !== 'resolu').length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-neutral-200 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
               <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-neutral-800 tracking-tight">Aucune Panne</h3>
            <p className="text-neutral-500 mt-2 text-lg">Bravo, le village olympique est opérationnel.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {taches.filter(t => t.statut !== 'resolu').map(t => (
            <div key={t.id} className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col">
               <div className="p-5 border-b border-neutral-100 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className={`px-2 py-1 text-xs font-black uppercase tracking-widest rounded ${t.priorite === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-600'}`}>
                         {t.priorite}
                       </span>
                       <span className="px-2 py-1 text-xs font-black uppercase tracking-widest rounded bg-orange-100 text-orange-700">
                         {t.type_panne || 'Technique'}
                       </span>
                    </div>
                    <h3 className="font-bold text-lg text-neutral-800 leading-tight mb-1">
                      {t.chambre_numero ? `Chambre ${t.chambre_numero} - Bloc ${t.chambre_bloc}` : t.localisation}
                    </h3>
                    <p className="text-sm font-medium text-neutral-500 flex items-center gap-1">
                       <MapPin className="w-3 h-3" />
                       {t.chambre_numero ? `Chambre ${t.chambre_numero}` : t.localisation}
                    </p>
                  </div>
                  {t.statut === 'en_cours' && t.assigne_a === user.id && (
                     <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
                  )}
               </div>
               <div className="p-5 flex-1 text-sm text-neutral-700 bg-neutral-50">
                  <p className="line-clamp-3">{t.description}</p>
                  <p className="text-xs text-neutral-400 mt-3 font-medium uppercase tracking-wider">
                     Signalé par {t.signaleur_prenom} {t.signaleur_nom}
                  </p>
               </div>
               <div className="p-4 bg-white border-t border-neutral-100">
                  {t.statut === 'en_cours' && t.assigne_a === user.id ? (
                     <Button className="w-full bg-orange-600 hover:bg-orange-700 font-bold tracking-wide uppercase shadow-lg shadow-orange-600/20" onClick={() => setSelectedTask(t)}>
                        <PenTool className="w-4 h-4 mr-2" />
                        Gérer / Clôturer
                     </Button>
                  ) : (
                     <Button className="w-full bg-neutral-800 hover:bg-neutral-900 font-bold tracking-wide uppercase" onClick={() => handleStartTask(t)}>
                        Prendre en charge
                     </Button>
                  )}
               </div>
            </div>
          ))}
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
               <h2 className="text-xl font-black text-neutral-800 uppercase tracking-tight">Rapport d'Intervention</h2>
               <button onClick={() => { setSelectedTask(null); setAchatsForm(false); }} className="text-neutral-400 hover:text-neutral-600">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8 flex-1">
               
               <div>
                 <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3">Détails de la panne</h3>
                 <p className="text-neutral-800 font-medium">{selectedTask.description}</p>
                 <div className="mt-4 flex gap-3">
                   <Button variant="outline" className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => setAchatsForm(!achatsForm)}>
                     <PackageSearch className="w-4 h-4 mr-2" /> Demander Outils/Pièces
                   </Button>
                 </div>
               </div>

               {achatsForm && (
                 <form onSubmit={handleDemandeAchat} className="bg-orange-50 p-5 rounded-2xl border border-orange-100 space-y-4">
                    <h4 className="font-bold text-orange-800">Bon de demande d'achat</h4>
                    <input autoFocus required type="text" placeholder="Désignation (ex: Ampoule LED 10W, Joint torique...)" className="w-full rounded-xl border-orange-200 bg-white" value={newAchat.designation} onChange={e => setNewAchat({...newAchat, designation: e.target.value})} />
                    <div className="flex gap-4">
                      <input required type="number" min="1" placeholder="Qté" className="w-24 rounded-xl border-orange-200 bg-white" value={newAchat.quantite} onChange={e => setNewAchat({...newAchat, quantite: e.target.value})} />
                      <select className="flex-1 rounded-xl border-orange-200 bg-white" value={newAchat.urgence} onChange={e => setNewAchat({...newAchat, urgence: e.target.value})}>
                        <option value="normale">Priorité Normale</option>
                        <option value="immediate">Priorité Immédiate</option>
                      </select>
                    </div>
                    <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">Envoyer la demande</Button>
                 </form>
               )}

               <div className="pt-4 border-t border-neutral-100">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3">Clôture (Obligatoire)</h3>
                  <textarea 
                     rows={3} 
                     className="w-full rounded-xl border-neutral-200 bg-neutral-50 mb-4 text-sm" 
                     placeholder="Détaillez votre réparation..."
                     value={rapportText}
                     onChange={(e) => setRapportText(e.target.value)}
                  ></textarea>

                  <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Camera className="w-8 h-8 mb-3 text-neutral-400" />
                              <p className="mb-2 text-sm text-neutral-500 font-bold"><span className="text-neutral-700">Cliquez</span> pour prendre la photo de validation</p>
                          </div>
                      </label>
                  </div>
               </div>
            </div>

            <div className="p-6 bg-neutral-50 border-t border-neutral-100">
               <Button className="w-full bg-green-600 hover:bg-green-700 h-14 text-lg font-black tracking-widest uppercase shadow-xl shadow-green-600/20" 
                       onClick={handleResolveTask} 
                       disabled={!rapportText}>
                 Terminer l'intervention
               </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
