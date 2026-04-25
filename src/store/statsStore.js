import { create } from 'zustand';

export const useStatsStore = create((set) => ({
  stats: { 
    chambres: { libres: 0, occupees: 0, partielles: 0, tauxOccupation: 0 }, 
    personnel_present: { accueil: 0, securite: 0, housekeeping: 0, maintenance: 0 } 
  },
  loading: false,
  fetchStats: async (token) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/stats/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        set({ stats: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (err) {
      set({ loading: false });
    }
  }
}));
