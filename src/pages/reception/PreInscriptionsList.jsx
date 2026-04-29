import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';

import { useNavigate } from 'react-router-dom';

export default function PreInscriptionsList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();
  const navigate = useNavigate();

  const fetchPreInscriptions = async () => {
    setLoading(true);
    try {
      // Need to create this specific endpoint logic: GET /api/clients/attente or GET /api/clients?statut=en_attente
      const res = await fetch('/api/clients?statut=en_attente', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if(res.ok) setClients(data);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreInscriptions();
    const interval = setInterval(fetchPreInscriptions, 60000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div className="p-8">
      <div className="flex justify-between flex-wrap gap-4 items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pré-inscriptions en attente</h1>
          <p className="text-slate-500">Dossiers soumis depuis le portail public.</p>
        </div>
        <Button>Nouveau Client</Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">N° Dossier</th>
              <th className="px-6 py-4 font-semibold">Nom / Prénom</th>
              <th className="px-6 py-4 font-semibold">Identité</th>
              <th className="px-6 py-4 font-semibold">Formule</th>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && clients.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Chargement...</td>
              </tr>
            )}
            {!loading && clients.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Aucune pré-inscription en attente.</td>
              </tr>
            )}
            {Array.isArray(clients) && clients.map(client => (
              <tr key={client.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-mono font-medium text-emerald-700">
                  NAPOLI-2026-{String(client.id).padStart(5, '0')}
                </td>
                <td className="px-6 py-4 font-semibold text-slate-800 uppercase">
                  {client.nom} <span className="capitalize font-normal text-slate-600">{client.prenom}</span>
                  {client.est_mineur === 1 && <span className="ml-2 inline-block px-2 text-[10px] uppercase font-bold bg-amber-100 text-amber-800 rounded">Mineur</span>}
                </td>
                <td className="px-6 py-4">{client.est_etranger ? client.num_piece : client.nin}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-bold">{client.formule}</span></td>
                <td className="px-6 py-4">{new Date(client.created_at).toLocaleString('fr-FR')}</td>
                <td className="px-6 py-4 flex gap-2 justify-end">
                  <Button variant="ghost" size="sm">Refuser</Button>
                  <Button size="sm" onClick={() => navigate(`/reception/accueil/checkin?clientId=${client.id}`)}>Check-In</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
