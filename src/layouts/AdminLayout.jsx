import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Users, UserCog, Building, DollarSign, Settings, LogOut, PackageSearch, TrendingUp, BadgeDollarSign } from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/reception/login');
  };

  const menuItems = [
    { name: 'Tableau de bord', path: '/admin', icon: LayoutDashboard, exact: true },
    { name: 'Agents', path: '/admin/agents', icon: UserCog },
    { name: 'Clients & Groupes', path: '/admin/clients', icon: Users },
    { name: 'Hébergement', path: '/admin/hebergement', icon: Building },
    { name: 'Tarifs & Yield', path: '/admin/tarifs', icon: BadgeDollarSign },
    { name: 'Facturation & B2B', path: '/admin/facturation', icon: DollarSign },
    { name: 'Économat & Stocks', path: '/admin/stocks', icon: PackageSearch },
    { name: 'Rapports & Analytics', path: '/admin/rapports', icon: TrendingUp },
    { name: 'Paramètres', path: '/admin/parametres', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-sm">VO</span>
            Admin Center
          </h1>
          <p className="text-slate-500 text-xs mt-1">Village Olympique</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 bg-slate-950 mt-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
              {user?.prenom?.[0]}{user?.nom?.[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.prenom} {user?.nom}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full justify-center px-3 py-2 rounded-md text-sm font-medium bg-red-950 text-red-400 hover:bg-red-900 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}
