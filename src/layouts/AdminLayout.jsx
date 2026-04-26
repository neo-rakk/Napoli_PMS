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
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar admin */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-sm font-black text-white">VO</span>
            Administration
          </h1>
          <p className="text-xs opacity-60 mt-1">
            {user?.prenom} {user?.nom} - {user?.role}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`
              }
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full justify-center px-4 py-3 rounded-md text-sm font-medium hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
