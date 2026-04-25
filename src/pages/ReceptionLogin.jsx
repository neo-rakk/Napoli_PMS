import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PinPad } from '../components/PinPad';
import { useAuthStore } from '../store/authStore';

export default function ReceptionLogin() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch agents
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAgents(data);
          if (data.length > 0) setSelectedAgent(data[0].id.toString());
        }
      })
      .catch(err => {
        console.error('Erreur chargement agents:', err);
        setError('Impossible de charger la liste des agents');
      });
  }, []);

  const handlePinComplete = async (completedPin) => {
    if (!selectedAgent) {
      setError('Veuillez sélectionner un identifiant');
      setPin('');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/agents/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: parseInt(selectedAgent, 10), pin: completedPin })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        login(data.agent, data.token);
        if (data.agent.doit_changer_pin) {
          navigate('/changer-pin');
        } else {
          // If admin goes here, it still goes to reception mostly
          navigate(data.agent.role === 'admin' ? '/admin' : '/reception');
        }
      } else {
        setError(data.error || 'PIN incorrect');
        setPin('');
      }
    } catch (err) {
      setError('Erreur de connexion serveur');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black uppercase tracking-tight text-emerald-800">
            Village Olympique Napoli
          </h1>
          <p className="text-slate-500 mt-2">Authentification Agent</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Identifiant
          </label>
          <div className="relative">
            <select
              value={selectedAgent}
              onChange={(e) => {
                setSelectedAgent(e.target.value);
                setPin('');
                setError('');
              }}
              disabled={loading || agents.length === 0}
              className="w-full border border-gray-300 rounded-md px-4 py-3 appearance-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-medium"
            >
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.code}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <PinPad pin={pin} setPin={setPin} onComplete={handlePinComplete} disabled={loading || agents.length === 0} />
      </div>
    </div>
  );
}
