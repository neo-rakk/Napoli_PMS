import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message === 'Invalid login credentials' ? 'Identifiants incorrects' : signInError.message);
        setLoading(false);
        return;
      }

      if (data.user && data.session) {
        // Get custom backend token so API requests authenticate properly
        const verifyRes = await fetch('/api/agents/auth/supabase-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.user.email })
        });
        
        const contentType = verifyRes.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
           const text = await verifyRes.text();
           throw new Error(`Réponse invalide HTTP ${verifyRes.status}. ${text.substring(0, 100)}`);
        }

        const backendData = await verifyRes.json();
        
        if (verifyRes.ok) {
          login(backendData.agent, backendData.token);
          navigate('/admin');
        } else {
          setError(backendData.error || 'Erreur lors de la synchronisation backend');
          setLoading(false);
        }
      }
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('getaddrinfo')) {
        setError('Configuration base de données invalide (POSTGRES_URL_NON_POOLING)');
      } else {
        setError('Erreur: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-white/20">
        
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-100">
          <ShieldCheck size={40} />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">
            Portail Admin
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Accès Sécurisé</p>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border-2 border-red-100 text-red-600 rounded-2xl text-xs flex items-start gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email administrateur
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full h-12 px-4 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-bold text-slate-800 bg-white transition-all placeholder:font-normal placeholder:text-slate-300"
              placeholder="admin@napoli.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full h-12 px-4 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-black text-slate-800 bg-white transition-all placeholder:font-normal placeholder:text-slate-300 tracking-widest"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-900/10 transition-all mt-4" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-slate-100">
          <Link to="/reception/login" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest transition-colors">
            <ArrowLeft size={14} /> Retour à la réception
          </Link>
        </div>
      </div>
    </div>
  );
}
