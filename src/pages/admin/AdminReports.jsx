import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Presentation, Calculator, CalendarDays } from 'lucide-react';

const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export default function AdminReports() {
  const { token } = useAuthStore();
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/stats/summary', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/stats/analytics', { headers: { 'Authorization': `Bearer ${token}` } })
    ])
    .then(async ([resSum, resAna]) => {
      setSummary(await resSum.json());
      setAnalytics(await resAna.json());
      setLoading(false);
    })
    .catch(console.error);
  }, [token]);

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Chargement des rapports...</div>;

  const revData = analytics?.revenus_modes?.map(r => ({
    name: r.mode.toUpperCase(),
    value: parseFloat(r.total)
  })) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" /> Rapports & Analytics
        </h1>
        <p className="text-slate-500">Statistiques financières et d'occupation du complexe.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Calculator className="w-6 h-6" /></div>
              <div>
                 <p className="text-sm font-medium text-slate-500">Caisse du Jour</p>
                 <h3 className="text-2xl font-black text-slate-800">{summary?.caisse_du_jour?.toLocaleString() || 0} DZD</h3>
              </div>
           </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Presentation className="w-6 h-6" /></div>
              <div>
                 <p className="text-sm font-medium text-slate-500">Taux Occupation</p>
                 <h3 className="text-2xl font-black text-slate-800">
                   {summary?.total_chambres > 0 ? Math.round((summary?.chambres_occupees / summary?.total_chambres)*100) : 0}%
                 </h3>
              </div>
           </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Users className="w-6 h-6" /></div>
              <div>
                 <p className="text-sm font-medium text-slate-500">In-House</p>
                 <h3 className="text-2xl font-black text-slate-800">{summary?.clients_inhouse || 0} Pax</h3>
              </div>
           </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><CalendarDays className="w-6 h-6" /></div>
              <div>
                 <p className="text-sm font-medium text-slate-500">Actions du jour</p>
                 <h3 className="text-2xl font-black text-slate-800">
                   <span className="text-emerald-600"><span className="text-sm font-bold">IN:</span> {summary?.checkins_today}</span>
                   <span className="text-slate-300 mx-2">|</span>
                   <span className="text-rose-600"><span className="text-sm font-bold">OUT:</span> {summary?.checkouts_today}</span>
                 </h3>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Évolution des Réservations (7 derniers jours)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.reservations_7d || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Réservations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Distribution des Revenus par Mode de Paiement</h3>
          <div className="h-80 flex items-center justify-center">
             {revData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                      {revData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toLocaleString()} DZD`} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
             ) : (
                <div className="text-slate-400">Aucune donnée financière disponible pour l'instant.</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
