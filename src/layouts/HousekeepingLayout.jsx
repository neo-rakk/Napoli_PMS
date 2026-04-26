import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut, Home, CheckSquare } from 'lucide-react';

export default function HousekeepingLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/reception/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-purple-900 text-white p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-3">
          <Home className="w-6 h-6 text-purple-300" />
          <h1 className="text-xl font-bold">Housekeeping / Gouvernance</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm bg-purple-800 px-3 py-1 rounded flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            {user?.prenom} {user?.nom} ({user?.role})
          </div>
          <button onClick={handleLogout} className="text-purple-300 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
