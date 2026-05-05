import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Lock, AlertCircle } from 'lucide-react';
import { getRedirectRouteForRole } from '../lib/authUtils';

export default function ChangerPin() {
  const { user, token, login } = useAuthStore();
  const navigate = useNavigate();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Rediriger si on ne devrait pas être là
  React.useEffect(() => {
    if (!user) {
      navigate('/reception/login');
    } else if (!user.doit_changer_pin) {
      navigate(getRedirectRouteForRole(user.role));
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPin.length !== 6) {
      setError('Le code PIN doit comporter 6 chiffres.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Les codes PIN ne correspondent pas.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/agents/change-pin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ newPin })
      });

      if (res.ok) {
        // Mettre à jour l'agent dans le store pour enlever l'obligation de changer
        login({ ...user, doit_changer_pin: 0 }, token);
        navigate(getRedirectRouteForRole(user.role));
      } else {
        const err = await res.json();
        setError(err.error || 'Erreur lors du changement de PIN');
      }
    } catch (e) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8 border border-white">
        <div className="flex justify-center mb-6 text-emerald-600">
          <Lock size={64} />
        </div>
        <h1 className="text-2xl font-black text-center text-slate-800 uppercase tracking-wider mb-2">
          Nouveau Code PIN
        </h1>
        <p className="text-slate-500 text-sm text-center mb-8">
          Pour des raisons de sécurité, vous devez personnaliser votre code d'accès à 6 chiffres.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 text-red-600 rounded-2xl text-sm flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nouveau Code PIN</label>
            <input 
              type="password" 
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-3xl tracking-[1em] h-16 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              placeholder="••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Confirmer le nouveau Code PIN</label>
            <input 
              type="password" 
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-3xl tracking-[1em] h-16 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
              placeholder="••••••"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-emerald-900/10">
            {loading ? 'Enregistrement...' : 'Enregistrer et Accéder'}
          </Button>
        </form>
      </div>
    </div>
  );
}
