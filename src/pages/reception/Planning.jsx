import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function Planning() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [planningData, setPlanningData] = useState([]);

  useEffect(() => {
    // In a real app, you'd fetch reservations with start/end dates
    // and map them on a timeline. Here is a simplified placeholder structure.
    setLoading(false);
  }, [token]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Planning (Vue Calendrier)</h1>
        <p className="text-slate-500">Aperçu visuel des réservations actuelles et futures.</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl h-96 flex items-center justify-center text-slate-400">
        <p>Le module de planning dynamique (Timeline) sera intégré ici.</p>
      </div>
    </div>
  );
}
