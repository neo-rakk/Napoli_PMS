import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Calendar, Download, Plus, Save, User as UserIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function HousekeepingPlanning() {
  const { token, user } = useAuthStore();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [chambres, setChambres] = useState([]);
  const [visibleChambreIds, setVisibleChambreIds] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chambreToAdd, setChambreToAdd] = useState('');

  // Local state for assignments: map chambre_id -> { agent_id, type }
  const [assignments, setAssignments] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resChambers, resAgents] = await Promise.all([
        fetch(`/api/housekeeping/planning/today?date=${date}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/housekeeping/agents`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const dataChambres = await resChambers.json();
      const dataAgents = await resAgents.json();
      
      setChambres(dataChambres);
      setAgents(dataAgents);

      const initialAssign = {};
      const initialVisible = [];
      dataChambres.forEach(c => {
        if (c.tache_id) {
           initialAssign[c.id] = { agent_id: c.agent_id || '', type: c.tache_type };
           initialVisible.push(c.id);
        } else {
           // Provide some default suggestions based on status
           let defaultType = '';
           if (c.is_checkout) {
               defaultType = 'depart';
               initialVisible.push(c.id);
           }
           // We intentionally do not show non-checkout occupied rooms by default unless they have a task
           if (defaultType) {
              initialAssign[c.id] = { agent_id: '', type: defaultType, isSuggestion: true };
           }
        }
      });
      setAssignments(initialAssign);
      setVisibleChambreIds(initialVisible);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token, date]);

  const handleAssignmentChange = (chambreId, field, value) => {
     setAssignments(prev => {
        const current = prev[chambreId] || { agent_id: '', type: '' };
        return {
           ...prev,
           [chambreId]: { ...current, [field]: value, isSuggestion: false }
        };
     });
  };

  const saveAssignments = async () => {
     try {
       // We only create tasks for assignments that have at least a type selected
       // Actually, we should probably send all of them and let the backend handle it or create them in a loop
       let count = 0;
       for (const [chambre_id, data] of Object.entries(assignments)) {
          if (data.type) {
             const chId = parseInt(chambre_id);
             const alreadyHasTask = chambres.find(c => c.id === chId)?.tache_id;
             if (!alreadyHasTask && !data.isSuggestion) {
                 // Create new task
                 await fetch('/api/housekeeping', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                       chambre_id: chId,
                       type: data.type,
                       agent_id: data.agent_id || null,
                       date_affectation: date,
                       priorite: 'normale'
                    })
                 });
                 count++;
             } else if (alreadyHasTask && !data.isSuggestion) {
                 // Update existing task
                 await fetch(`/api/housekeeping/${alreadyHasTask}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                       agent_id: data.agent_id || null
                    })
                 });
                 count++;
             }
          }
       }
       alert("Assignations enregistrées avec succès !");
       fetchData();
     } catch (e) {
       console.error(e);
       alert("Erreur lors de l'enregistrement.");
     }
  };

  const generatePDFGlobal = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Planning Général Housekeeping - ${new Date(date).toLocaleDateString('fr-FR')}`, 14, 20);

      const tableData = chambres.filter(c => visibleChambreIds.some(vid => vid.toString() === c.id.toString())).map(c => {
         const assign = assignments[c.id];
         let typ = assign?.type || '';
         let agent = '';
         if (assign?.agent_id) {
            const a = agents.find(ag => ag.id.toString() === assign.agent_id.toString());
            if (a) agent = `${a.prenom} ${a.nom}`;
         }
         return [
            (c.bloc_nom || 'N/A').toString(),
            (c.numero || '').toString(),
            c.is_checkout ? 'OUI' : 'NON',
            (typ || '').toUpperCase(),
            agent,
            '' // Empty space for notes/signature
         ];
      });

      autoTable(doc, {
        startY: 30,
        head: [['Bloc', 'Chambre', 'Check-out Aujourd\'hui', 'Type', 'Gouvernante / Agent', 'Notes / Fait']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [88, 28, 135] }
      });

      doc.save(`planning_hk_${date}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération du PDF: ' + e.message);
    }
  };

  const generatePDFAgent = (agentId) => {
    try {
      const agent = agents.find(a => a.id.toString() === agentId.toString());
      if (!agent) return;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Fiche de nettoyage - ${agent.prenom} ${agent.nom}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Date : ${new Date(date).toLocaleDateString('fr-FR')}`, 14, 28);

      const agentRooms = chambres.filter(c => {
         const assign = assignments[c.id];
         return visibleChambreIds.some(vid => vid.toString() === c.id.toString()) && assign && assign.agent_id && assign.agent_id.toString() === agentId.toString() && assign.type;
      });

      if (agentRooms.length === 0) {
         alert("Cet agent n'a aucune chambre assignée !");
         return;
      }

      const tableData = agentRooms.map(c => {
         const assign = assignments[c.id];
         return [
            (c.bloc_nom || 'N/A').toString(),
            (c.numero || '').toString(),
            c.is_checkout ? 'DÉPART' : (c.is_occupied ? 'RECOUCHE' : 'VIDE'),
            (assign?.type || '').toUpperCase(),
            '', // Status
            ''  // Sign
         ];
      });

      autoTable(doc, {
        startY: 35,
        head: [['Bloc', 'Chambre', 'Statut Chambre', 'Travail Demandé', 'Fait', 'Signature']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [88, 28, 135] }
      });

      doc.save(`fiche_hk_${agent.prenom}_${agent.nom}_${date}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la génération du PDF: ' + e.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-600" />
            Planning et Assignations
          </h2>
          <p className="text-slate-500">Planifiez le nettoyage et créez les tâches pour les femmes de chambre.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="border border-slate-300 rounded p-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <Button onClick={saveAssignments} className="bg-purple-600 hover:bg-purple-700">
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
          <Button variant="outline" onClick={generatePDFGlobal}>
             <Download className="w-4 h-4 mr-2" />
             PDF Global
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Bloc & Chambre</th>
              <th className="px-4 py-3 text-center">Occupation</th>
              <th className="px-4 py-3">Type de Tâche</th>
              <th className="px-4 py-3">Femme de chambre</th>
              <th className="px-4 py-3">Statut (BD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
               <tr><td colSpan="5" className="text-center py-8">Chargement...</td></tr>
            ) : chambres.filter(c => visibleChambreIds.some(vid => vid.toString() === c.id.toString())).map(c => {
               const assign = assignments[c.id] || {};
               return (
                 <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                   <td className="px-4 py-3">
                     <div className="font-bold text-slate-800 text-base">{c.numero}</div>
                     <div className="text-xs text-slate-500 uppercase">{c.bloc_nom} — Étage {c.etage}</div>
                   </td>
                   <td className="px-4 py-3 text-center">
                     {c.is_checkout && <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold uppercase block w-max mx-auto mb-1">Check-out Aujourd'hui</span>}
                     {c.is_occupied && !c.is_checkout && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold uppercase block w-max mx-auto">Occupée</span>}
                     {!c.is_occupied && !c.is_checkout && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase block w-max mx-auto">Vide</span>}
                   </td>
                   <td className="px-4 py-3">
                     <select 
                        value={assign.type || ''} 
                        onChange={e => handleAssignmentChange(c.id, 'type', e.target.value)}
                        className={`border rounded p-1.5 text-sm w-full focus:ring-purple-500 focus:border-purple-500 ${assign.isSuggestion ? 'text-purple-600 outline-purple-200 border-purple-200 bg-purple-50' : 'border-slate-300'}`}
                     >
                       <option value="">-- Non planifiée --</option>
                       <option value="nettoyage">Nettoyage standard</option>
                       <option value="recouche">Recouche</option>
                       <option value="depart">Nettoyage Départ</option>
                       <option value="approfondi">Nettoyage Approfondi</option>
                       <option value="desinfection">Désinfection</option>
                     </select>
                   </td>
                   <td className="px-4 py-3">
                     <select 
                        value={assign.agent_id || ''} 
                        onChange={e => handleAssignmentChange(c.id, 'agent_id', e.target.value)}
                        className="border border-slate-300 rounded p-1.5 text-sm w-full focus:ring-purple-500 focus:border-purple-500"
                     >
                       <option value="">-- Non assignée (manuelle) --</option>
                       {agents.map(a => <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>)}
                     </select>
                   </td>
                   <td className="px-4 py-3 text-xs font-bold uppercase">
                     {c.tache_statut === 'fait' ? <span className="text-emerald-600">FAIT</span> :
                      c.tache_statut === 'en_cours' ? <span className="text-amber-500">EN COURS</span> :
                      c.tache_statut === 'a_faire' ? <span className="text-slate-500">A FAIRE</span> :
                      <span className="text-slate-300">-</span>}
                   </td>
                 </tr>
               );
            })}
          </tbody>
        </table>
        
        {/* Ajouter une chambre manuellement */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-4">
           <span className="text-sm font-medium text-slate-700">Ajouter une chambre à la liste :</span>
           <select 
             className="border border-slate-300 rounded p-2 text-sm max-w-xs focus:ring-purple-500 focus:border-purple-500"
             value={chambreToAdd}
             onChange={e => setChambreToAdd(e.target.value)}
           >
             <option value="">Sélectionner une chambre...</option>
             {chambres.filter(c => !visibleChambreIds.some(vid => vid.toString() === c.id.toString())).map(c => (
                <option key={c.id} value={c.id}>{c.bloc_nom} - Ch. {c.numero} {c.is_occupied ? '(Occupée)' : ''}</option>
             ))}
           </select>
           <Button 
             variant="outline" 
             onClick={() => {
                if (chambreToAdd && !visibleChambreIds.some(vid => vid.toString() === chambreToAdd.toString())) {
                   setVisibleChambreIds([...visibleChambreIds, chambreToAdd]);
                   setChambreToAdd('');
                }
             }}
             disabled={!chambreToAdd}
           >
             <Plus className="w-4 h-4 mr-1" /> Ajouter
           </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-purple-600" /> Options d'impression par Agent
        </h3>
        <p className="text-slate-500 text-sm mb-4">Téléchargez un PDF formaté spécifiquement pour chaque femme de chambre contenant uniquement ses chambres assignées.</p>
        <div className="flex flex-wrap gap-3">
           {agents.map(a => (
              <Button key={a.id} variant="outline" onClick={() => generatePDFAgent(a.id)} className="border-purple-200 hover:bg-purple-50 text-purple-800">
                <Download className="w-4 h-4 mr-2" /> Fiche de {a.prenom} {a.nom}
              </Button>
           ))}
           {agents.length === 0 && <span className="text-slate-400 italic text-sm">Aucune femme de chambre (rôle housekeeping) trouvée.</span>}
        </div>
      </div>
    </div>
  );
}
