import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Search, MapPin, Calendar, User, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function Preuves() {
  const { token } = useAuthStore();
  const [preuves, setPreuves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/maintenance/admin/preuves', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setPreuves(data);
        setLoading(false);
      })
      .catch(console.error);
  }, [token]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white rounded-2xl p-6 shadow-sm border border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Galerie des Preuves</h1>
          <p className="text-slate-500">Historique des interventions et réparations validées avec photos.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-center p-8 text-neutral-500 font-medium">Chargement des données...</p>
      ) : preuves.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-neutral-200 text-center">
            <h3 className="text-xl font-bold text-neutral-800 tracking-tight">Aucune Preuve</h3>
            <p className="text-neutral-500 mt-2">Aucune intervention contenant une photo n'a été recensée.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {preuves.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col">
              <div className="relative w-full h-48 bg-neutral-100 flex-shrink-0">
                {p.photo_reparation && p.photo_reparation.startsWith('data:') ? (
                  <img src={p.photo_reparation} alt="Preuve réparation" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-400">Photo non disponible</div>
                )}
                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm shadow">
                  Intervention #{p.id}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-1 text-sm font-semibold text-neutral-800 mb-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  {p.chambre_numero ? `Chambre ${p.chambre_numero}` : (p.localisation || 'Lieu non spécifié')}
                </div>
                <div className="text-xs text-neutral-500 space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Agent: <span className="font-semibold text-neutral-700">{p.agent_prenom} {p.agent_nom}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Clôturé le: <span className="font-semibold text-neutral-700">{new Date(p.date_resolution || p.photo_preuve_timestamp || p.updated_at).toLocaleString('fr-FR')}</span></span>
                  </div>
                  <div className="flex items-start gap-2 mt-2">
                    <FileText className="w-3.5 h-3.5 text-neutral-400 mt-0.5" />
                    <span className="line-clamp-3"><span className="font-semibold text-neutral-700">Rapport:</span> {p.rapport || "Aucun rapport"}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
