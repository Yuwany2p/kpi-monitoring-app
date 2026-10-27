import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getPeriods, getTeams } from '../services/supabaseService';
import { useAuth } from './AuthContext';
import { ROLES } from '../lib/constants';

const FilterContext = createContext(null);

/**
 * Filter global (periode & tim) yang dipakai semua halaman.
 * Periode & tim diambil dari database. Supervisor & staf terkunci pada
 * timnya sendiri; manajemen bisa memilih tim atau "Semua tim".
 */
export const FilterProvider = ({ children }) => {
  const { isAuthenticated, currentUser, role } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [periodData, teamData] = await Promise.all([getPeriods(), getTeams()]);
        if (cancelled) return;
        setPeriods(periodData || []);
        setTeams(teamData || []);
        // Default: periode open terbaru, kalau tidak ada pakai periode terakhir
        const open = [...(periodData || [])].reverse().find((p) => p.status === 'open');
        const latest = periodData?.[periodData.length - 1];
        setSelectedPeriodId((prev) => prev || open?.id || latest?.id || null);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Supervisor/staf selalu di timnya sendiri; manajemen default "semua tim" (null)
  const effectiveTeamId = role === ROLES.MANAJEMEN ? selectedTeamId : currentUser?.team_id || null;

  const value = useMemo(() => {
    const selectedPeriod = periods.find((p) => p.id === selectedPeriodId) || null;
    const selectedIndex = periods.findIndex((p) => p.id === selectedPeriodId);
    const selectedTeam = teams.find((t) => t.id === effectiveTeamId) || null;
    return {
      periods,
      teams,
      loading,
      error,
      selectedPeriodId,
      setSelectedPeriodId,
      selectedPeriod,
      // 6 periode terakhir sampai periode terpilih (untuk grafik tren)
      trendPeriods: selectedIndex >= 0 ? periods.slice(Math.max(0, selectedIndex - 5), selectedIndex + 1) : [],
      previousPeriod: selectedIndex > 0 ? periods[selectedIndex - 1] : null,
      selectedTeamId: effectiveTeamId,
      setSelectedTeamId,
      selectedTeam,
      teamLabel: selectedTeam?.name || (role === ROLES.MANAJEMEN ? 'Semua tim' : currentUser?.team_name || '-'),
    };
  }, [periods, teams, loading, error, selectedPeriodId, effectiveTeamId, role, currentUser]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilter must be used within a FilterProvider');
  return context;
};
