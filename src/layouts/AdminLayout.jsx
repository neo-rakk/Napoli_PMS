import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LayoutDashboard, Users, UserCog, Building, DollarSign, Settings, LogOut, PackageSearch, TrendingUp, BadgeDollarSign, Coffee, ShieldCheck, Home, Wrench, Menu, Bell, Camera } from 'lucide-react';

export default function AdminLayout() {
  const { user, logout, token } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stockNotifCount, setStockNotifCount] = useState(0);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/stocks/notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStockNotifCount(data.count);
        }
      } catch (e) {
        console.error("Error fetching notifications", e);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [token]);

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
    { name: 'Gestion POS', path: '/admin/pos', icon: Coffee },
    { name: 'Rapports & Analytics', path: '/admin/rapports', icon: TrendingUp },
    { name: 'Preuves & Photos', path: '/admin/preuves', icon: Camera },
    { name: 'Paramètres', path: '/admin/parametres', icon: Settings },
  ];

  const agentModules = [
    { name: 'Réception', path: '/reception', icon: LayoutDashboard, color: 'text-indigo-400' },
    { name: 'Caisse (POS)', path: '/pos', icon: Coffee, color: 'text-emerald-400' },
    { name: 'Housekeeping', path: '/housekeeping', icon: Home, color: 'text-purple-400' },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, color: 'text-orange-400' },
    { name: 'Sécurité', path: '/securite', icon: ShieldCheck, color: 'text-red-400' },
  ];

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Spacer for collapsed sidebar */}
      <div className="w-20 shrink-0 hidden sm:block"></div>

      {/* Overlay to close sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar admin */}
      <aside 
        className={`fixed top-0 left-0 h-screen bg-slate-900 text-slate-300 flex flex-col z-50 transition-all duration-300 shadow-2xl overflow-hidden ${isSidebarOpen ? 'w-64' : 'w-0 sm:w-20'}`}
      >
        <div className={`p-4 border-b border-slate-800 shrink-0 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className={`flex items-center gap-2 overflow-hidden whitespace-nowrap transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
            <span className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-sm font-black text-white shrink-0">VO</span>
            <span className="text-xl font-bold text-white tracking-tight">
              Administration
            </span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5 shrink-0" />
          </button>
        </div>

        {isSidebarOpen && (
          <div className="px-6 py-2 border-b border-slate-800 bg-slate-950/30">
            <p className="text-xs opacity-60 truncate">
              {user?.prenom} {user?.nom} - {user?.role}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className={`px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2 whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>
            Gestion
          </div>
          <nav className="py-2 flex flex-col gap-1 px-2">
            {menuItems.map((item) => {
              const isActiveRoute = location.pathname.startsWith(item.path) && (item.exact ? location.pathname === item.path : true);
              const showBadge = item.path === '/admin/stocks' && stockNotifCount > 0;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.exact}
                  title={item.name}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) =>
                    `relative flex items-center rounded-lg transition-colors overflow-hidden whitespace-nowrap ${
                      isSidebarOpen ? 'px-4 py-2 text-sm font-medium' : 'p-3 justify-center text-xs'
                    } ${
                      isActive || isActiveRoute ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                    }`
                  }
                >
                  <div className="relative">
                    <item.icon className={`w-5 h-5 shrink-0 ${isSidebarOpen ? 'mr-3' : ''}`} />
                    {showBadge && (
                      <span className={`absolute ${isSidebarOpen ? '-top-1 -right-1' : '-top-1 -right-1'} flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-slate-900 shadow-sm animate-pulse`}>
                        {stockNotifCount > 99 ? '99+' : stockNotifCount}
                      </span>
                    )}
                  </div>
                  <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100 flex-1' : 'opacity-0 hidden'}`}>
                    {item.name}
                  </span>
                  {showBadge && isSidebarOpen && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto animate-pulse shadow-sm">
                      {stockNotifCount} nvx
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className={`px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 border-t border-slate-800 whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>
            Modules Agents
          </div>
          <nav className="py-2 flex flex-col gap-1 px-2 border-t border-slate-800 sm:border-t-0">
            {agentModules.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                title={item.name}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center rounded-lg transition-colors hover:bg-slate-800 text-slate-300 overflow-hidden whitespace-nowrap ${
                  isSidebarOpen ? 'px-4 py-2 text-sm font-medium' : 'p-3 justify-center text-xs'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${item.color} ${isSidebarOpen ? 'mr-3' : ''}`} />
                <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                  {item.name}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={handleLogout}
            title="Déconnexion"
            className={`flex items-center w-full rounded-md text-sm font-medium hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors overflow-hidden whitespace-nowrap ${
              isSidebarOpen ? 'px-4 py-3 justify-center gap-2' : 'p-3 justify-center'
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Déconnexion
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto w-full min-w-0">
        {/* Mobile Header when sidebar is hidden */}
        <div className="sm:hidden mb-4 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
          <span className="font-bold tracking-tight">Administration</span>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
