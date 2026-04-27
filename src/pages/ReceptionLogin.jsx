import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PinPad } from '../components/PinPad';
import { useAuthStore } from '../store/authStore';
import { Lock, User } from 'lucide-react';

export default function ReceptionLogin() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  useEffect(() => {
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
          navigate(data.agent.role === 'admin' ? '/admin' : '/reception');
        }
      } else {
        setError(data.error || 'PIN incorrect');
        setPin('');
      }
    } catch (err) {
      console.error(err);
      setError('Erreur API: ' + err.message);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const selectedAgentData = agents.find(a => a.id.toString() === selectedAgent);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-white">
        
        <div className="bg-emerald-900 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Lock size={120} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-widest mb-2 relative z-10">Village Napoli</h1>
          <p className="text-emerald-400 font-bold uppercase tracking-tighter relative z-10">Portail Agents</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <div className="mb-8 relative group">
            <div className="w-full p-5 rounded-2xl border-2 border-slate-50 bg-slate-50/50 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left flex items-center gap-4 relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-colors shadow-sm shrink-0">
                <User size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="block font-black text-slate-800 uppercase tracking-widest text-sm truncate">
                  {selectedAgentData ? selectedAgentData.code : 'Sélectionnez un agent'}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate mt-0.5">
                  {selectedAgentData ? selectedAgentData.prenom + ' ' + selectedAgentData.nom : ''}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-emerald-100 shrink-0 absolute right-4">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              
              <select
                value={selectedAgent}
                onChange={(e) => {
                  setSelectedAgent(e.target.value);
                  setPin('');
                  setError('');
                }}
                disabled={loading || agents.length === 0}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.code} - {agent.prenom} {agent.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <PinPad pin={pin} setPin={setPin} onComplete={handlePinComplete} disabled={loading || agents.length === 0} />
        </div>
      </div>

      <div className="mt-12 text-center">
        <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Village Napoli PMS</span>
      </div>
    </div>
  );
}
