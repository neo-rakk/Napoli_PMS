import React, { useEffect } from 'react';
import { Outlet, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useStatsStore } from '../store/statsStore';

export default function ReceptionLayout() {
  const { user, token, logout } = useAuthStore();
  const { stats, fetchStats } = useStatsStore();
  const navigate = useNavigate();
  const location = useLocation();

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
    { label: 'Attente (Check-In)', path: '/reception/accueil/attente' },
    { label: 'Check-In Rapide', path: '/reception/accueil/checkin' },
    { label: 'Check-Out', path: '/reception/accueil/checkout' },
    { label: 'Groupes', path: '/reception/groupes' },
    { label: 'Réservations', path: '/reception/reservations' },
    { label: 'Planning', path: '/reception/planning' },
    { label: 'Plan Chambres', path: '/reception/chambres' },
    { label: 'Caisse', path: '/reception/caisse' },
    // Only show HK / Maint if allowed
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-bold uppercase tracking-tight text-emerald-500">Volympic Napoli</h1>
          <p className="text-sm text-slate-400 mt-1">{user?.nom} {user?.prenom}</p>
          <div className="text-xs bg-slate-800 inline-block px-2 py-1 rounded mt-2 uppercase">{user?.role}</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {navItems.map(item => {
              const active = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link 
                    to={item.path} 
                    className={`block px-4 py-2 mx-2 rounded-md transition-colors ${active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-800">
          {user?.role === 'admin' && (
            <Link to="/admin" className="block text-center w-full py-2 mb-2 bg-slate-800 rounded text-sm hover:bg-slate-700">
              Basculer Admin
            </Link>
          )}
          <button 
            onClick={() => { logout(); navigate('/reception/login'); }}
            className="w-full text-center py-2 text-slate-400 hover:text-white text-sm"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header Stats */}
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center px-6 justify-between gap-4 flex-shrink-0">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-medium">Libres : {stats.chambres.libres}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm font-medium">Occupées : {stats.chambres.occupees}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="text-sm font-medium">Partielles : {stats.chambres.partielles}</span>
            </div>
            <div className="text-sm font-bold bg-slate-100 px-3 py-1 rounded">
              Occupation: {stats.chambres.tauxOccupation}%
            </div>
          </div>
          <div className="text-sm text-slate-500">
            Personnel: Acc {stats.personnel_present.accueil} | Sec {stats.personnel_present.securite} | HK {stats.personnel_present.housekeeping} | Mnt {stats.personnel_present.maintenance}
          </div>
        </header>

        {/* Dynamic Outlet */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
