import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function AdminFacturation() {
  const { token } = useAuthStore();
  const [comptes, setComptes] = useState([]);
  
  useEffect(() => {
    fetch('/api/comptes', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(setComptes)
      .catch(console.error);
  }, [token]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Grands Comptes & B2B</h1>
        <p className="text-slate-500">Gestion des entreprises, contrats et BDC.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-semibold">Nom de l'entreprise</th>
              <th className="px-6 py-4 font-semibold">NIF</th>
              <th className="px-6 py-4 font-semibold">Contact</th>
              <th className="px-6 py-4 font-semibold">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comptes.map(c => (
              <tr key={c.id}>
                <td className="px-6 py-4 font-bold text-slate-800">{c.nom}</td>
                <td className="px-6 py-4 font-mono">{c.nif}</td>
                <td className="px-6 py-4">{c.contact_principal}</td>
                <td className="px-6 py-4">{c.contact_email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
