import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Wrench } from 'lucide-react';

export default function MaintenanceLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/reception/login');
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans">
      <header className="bg-orange-600 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
             <h1 className="text-xl font-black tracking-tight leading-none uppercase">Interventions</h1>
             <p className="text-xs text-orange-200 uppercase font-bold tracking-wider">Service Technique</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs sm:text-sm font-bold bg-orange-700 px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="hidden sm:inline">{user?.prenom} {user?.nom}</span>
          </div>
          <button onClick={handleLogout} className="text-orange-200 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
