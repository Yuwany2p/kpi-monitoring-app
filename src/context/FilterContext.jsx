import React, { createContext, useContext, useState } from 'react';
import { PERIODS, TEAMS } from '../lib/constants';

const FilterContext = createContext(null);

export const FilterProvider = ({ children }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(PERIODS[0].name);
  const [selectedTeam, setSelectedTeam] = useState(TEAMS[0].name);

  return (
    <FilterContext.Provider
      value={{
        selectedPeriod,
        setSelectedPeriod,
        selectedTeam,
        setSelectedTeam,
        periods: PERIODS,
        teams: TEAMS,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};
