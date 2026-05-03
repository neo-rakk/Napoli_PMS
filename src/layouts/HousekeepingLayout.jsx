import React from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Home, CheckSquare, Package, Droplets, Calendar } from 'lucide-react';

export default function HousekeepingLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/reception/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-purple-900 text-white p-4 flex justify-between items-center shadow-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Home className="w-6 h-6 text-purple-300" />
          <h1 className="text-xl font-bold">Housekeeping / Gouvernance</h1>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="hidden sm:flex text-sm bg-amber-500 hover:bg-amber-400 text-amber-900 font-bold px-3 py-1 rounded items-center gap-2">
              Retour Admin
            </button>
          )}
          <div className="text-sm bg-purple-800 px-3 py-1 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            {user?.prenom} {user?.nom} ({user?.role})
          </div>
          <button onClick={handleLogout} className="text-purple-300 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="max-w-5xl mx-auto px-4 flex gap-6 overflow-x-auto">
          <NavLink to="/housekeeping" end className={({isActive}) => `py-3 font-semibold text-sm border-b-2 whitespace-nowrap flex items-center gap-2 ${isActive ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-purple-600'}`}>
            <CheckSquare className="w-4 h-4" /> Tâches du Jour
          </NavLink>
          <NavLink to="/housekeeping/planning" className={({isActive}) => `py-3 font-semibold text-sm border-b-2 whitespace-nowrap flex items-center gap-2 ${isActive ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-purple-600'}`}>
            <Calendar className="w-4 h-4" /> Planning & Assignation
          </NavLink>
          <NavLink to="/housekeeping/demandes" className={({isActive}) => `py-3 font-semibold text-sm border-b-2 whitespace-nowrap flex items-center gap-2 ${isActive ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-purple-600'}`}>
            <Package className="w-4 h-4" /> Demandes Économat
          </NavLink>
          <NavLink to="/housekeeping/buanderie" className={({isActive}) => `py-3 font-semibold text-sm border-b-2 whitespace-nowrap flex items-center gap-2 ${isActive ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-purple-600'}`}>
            <Droplets className="w-4 h-4" /> Buanderie
          </NavLink>
        </div>
      </div>

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
