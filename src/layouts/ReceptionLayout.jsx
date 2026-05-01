import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useStatsStore } from '../store/statsStore';
import { Users, UserPlus, CheckCircle, Group, Calendar, Grid, BookOpen, Clock, Settings, LogOut, CheckSquare, Menu } from 'lucide-react';

export default function ReceptionLayout() {
  const { user, token, logout } = useAuthStore();
  const { stats, fetchStats } = useStatsStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let timeout;
    const handleInactivity = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
        navigate('/reception/login');
      }, 15 * 60 * 1000); // 15 mins
    };

    window.addEventListener('mousemove', handleInactivity);
    window.addEventListener('keypress', handleInactivity);
    window.addEventListener('touchstart', handleInactivity);

    handleInactivity();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', handleInactivity);
      window.removeEventListener('keypress', handleInactivity);
      window.removeEventListener('touchstart', handleInactivity);
    };
  }, [logout, navigate]);

  useEffect(() => {
    if (token) {
      fetchStats(token);
      const interval = setInterval(() => fetchStats(token), 30000); // polling 30s
      return () => clearInterval(interval);
    }
  }, [token, fetchStats]);

  if (!user || user.role === 'admin' && location.pathname.startsWith('/admin')) {
      // Allow admin to bypass this layout if needed or fallback
  }

  const navItems = [
    { label: 'Check-In', path: '/reception/accueil/checkin', icon: UserPlus },
    { label: 'Attente', path: '/reception/accueil/attente', icon: Users },
    { label: 'Check-Out', path: '/reception/accueil/checkout', icon: CheckSquare },
    { label: 'Groupes', path: '/reception/groupes', icon: Group },
    { label: 'Réservations', path: '/reception/reservations', icon: Calendar },
    { label: 'Plan Chambres', path: '/reception/chambres', icon: Grid },
    { label: 'Caisse', path: '/reception/caisse', icon: BookOpen },
    { label: 'Maintenance', path: '/reception/maintenance', icon: Settings },
  ];

  const getTauxBadgeClass = (taux) => {
    if (taux > 80) return "bg-red-600 text-white";
    if (taux > 50) return "bg-amber-500 text-white";
    return "bg-emerald-600 text-white";
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      {/* Spacer for collapsed sidebar */}
      <div className="w-20 shrink-0 hidden sm:block"></div>

      {/* Overlay to close sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-screen bg-slate-900 text-slate-100 flex flex-col shadow-2xl z-50 transition-all duration-300 border-r border-white/5 overflow-hidden ${isSidebarOpen ? 'w-60' : 'w-0 sm:w-20'}`}
      >
        <div className={`p-4 border-b border-white/5 bg-slate-950/30 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
          <div className={`flex items-center gap-3 overflow-hidden whitespace-nowrap transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <h1 className="text-lg font-black text-white uppercase tracking-tighter leading-none">
              Napoli Hotel
            </h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {isSidebarOpen && (
          <div className="px-6 py-2 border-b border-white/5 bg-slate-950/30">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 truncate">
              {user?.code} - {user?.role}
            </div>
          </div>
        )}

        <nav className="flex-1 py-4 overflow-y-auto no-scrollbar">
          <ul className="space-y-1 px-2 text-center">
            {navItems.map(item => {
              const active = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    title={item.label}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center rounded-xl transition-all overflow-hidden whitespace-nowrap ${
                      isSidebarOpen ? 'px-4 py-3 text-xs font-black uppercase tracking-widest' : 'p-3 justify-center'
                    } ${
                      active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 translate-x-1 sm:translate-x-0' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${isSidebarOpen ? 'mr-3' : ''} ${active ? 'text-white' : 'text-slate-500'}`} />
                    <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-white/5 bg-slate-950/30 space-y-2 shrink-0">
          {user?.role === 'admin' && (
            <Link 
              to="/admin" 
              title="Basculer Admin"
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center w-full rounded-xl transition-all border border-amber-400/20 text-amber-400 hover:bg-amber-400/10 overflow-hidden whitespace-nowrap ${
                isSidebarOpen ? 'px-4 py-3 text-xs font-black uppercase tracking-widest' : 'p-3 justify-center'
              }`}
            >
              <Settings className={`h-5 w-5 shrink-0 ${isSidebarOpen ? 'mr-3' : ''}`} />
              <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                Basculer Admin
              </span>
            </Link>
          )}
          <button 
            onClick={() => { logout(); navigate('/reception/login'); }}
            title="Déconnexion"
            className={`flex items-center w-full rounded-xl transition-all border border-red-400/20 text-red-400 hover:bg-red-400/10 overflow-hidden whitespace-nowrap ${
              isSidebarOpen ? 'px-4 py-3 text-xs font-black uppercase tracking-widest' : 'p-3 justify-center'
            }`}
          >
            <LogOut className={`h-5 w-5 shrink-0 ${isSidebarOpen ? 'mr-3' : ''}`} />
            <span className={`transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
              Déconnexion
            </span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-[72px] bg-white border-b flex items-center px-4 sm:px-6 justify-between shadow-sm sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-4 w-full">
            <button onClick={() => setIsSidebarOpen(true)} className="sm:hidden p-2 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0">
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            
            <div className="flex space-x-2 sm:space-x-4 text-xs sm:text-sm font-medium overflow-x-auto no-scrollbar items-center py-2 flex-1">
              <div className="flex items-center text-emerald-700 bg-emerald-50 px-2 sm:px-3 py-1 rounded-full border border-emerald-100 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                Libres: {stats?.chambres?.libres || 0}
              </div>
              
              <div className="flex items-center text-red-700 bg-red-50 px-2 sm:px-3 py-1 rounded-full border border-red-100 shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                Occ: {stats?.chambres?.occupees || 0}
              </div>

              <div className="flex items-center text-amber-700 bg-amber-50 px-2 sm:px-3 py-1 rounded-full border border-amber-100 shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                Part: {stats?.chambres?.partielles || 0}
              </div>

              <div className={`flex items-center px-2 sm:px-3 py-1 rounded-full shadow-sm font-black shrink-0 ${getTauxBadgeClass(stats?.chambres?.tauxOccupation || 0)}`}>
                Taux: {stats?.chambres?.tauxOccupation || 0}%
              </div>
            </div>
            
            <div className="hidden xl:flex space-x-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-l pl-6 shrink-0 items-center">
              <span>Acc: {stats?.personnel_present?.accueil || 0}</span>
              <span>Sécu: {stats?.personnel_present?.securite || 0}</span>
              <span>HK: {stats?.personnel_present?.housekeeping || 0}</span>
              <span>Maint: {stats?.personnel_present?.maintenance || 0}</span>
            </div>
          </div>
        </header>

        {user?.role === 'admin' && (
          <div className="bg-red-600 text-white px-6 py-2 text-xs font-bold flex items-center justify-center gap-2 shrink-0 animate-pulse">
            <Settings size={14} className="animate-spin-slow shrink-0" />
            <span className="truncate">MODE ADMINISTRATEUR ACTIF : VOUS AVEZ TOUS LES PRIVILÈGES SUR CE MODULE.</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
