import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, ShieldCheck, Search } from 'lucide-react';

export default function SecurityLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/reception/login');
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col">
      <header className="bg-neutral-950 p-4 flex justify-between items-center border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-red-500" />
          <h1 className="text-xl font-bold tracking-widest uppercase">Poste de Contrôle</h1>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="hidden sm:flex text-sm bg-amber-500 hover:bg-amber-400 text-amber-900 font-bold px-3 py-1 rounded items-center gap-2">
              Retour Admin
            </button>
          )}
          <div className="text-sm bg-neutral-800 px-3 py-1 rounded border border-neutral-700">
            {user?.nom} ({user?.role})
          </div>
          <button onClick={handleLogout} className="text-neutral-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {user?.role === 'admin' && (
        <div className="bg-red-600 text-white px-6 py-2 text-xs font-bold flex items-center justify-center gap-2 shrink-0 animate-pulse">
          MODE ADMINISTRATEUR ACTIF : VOUS AVEZ TOUS LES PRIVILÈGES SUR CE MODULE.
        </div>
      )}

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
