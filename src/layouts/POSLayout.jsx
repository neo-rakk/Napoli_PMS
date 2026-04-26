import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Coffee } from 'lucide-react';

export default function POSLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/reception/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="bg-emerald-900 text-white p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-800 p-2 rounded-lg">
            <Coffee className="w-6 h-6 text-emerald-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Point de Vente</h1>
            <p className="text-xs text-emerald-300">Cafétéria & Restaurant</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm bg-emerald-800 px-3 py-1.5 rounded-full flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Caisse: {user?.prenom} {user?.nom}
          </div>
          <button onClick={handleLogout} className="text-emerald-300 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
