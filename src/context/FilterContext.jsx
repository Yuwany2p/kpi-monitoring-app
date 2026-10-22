import React, { createContext, useContext, useState } from 'react';

const FilterContext = createContext(null);

export const FilterProvider = ({ children }) => {
  const currentDate = new Date();
  const [selectedTahun, setSelectedTahun] = useState(2026);
  const [selectedBulan, setSelectedBulan] = useState(10); // Bulan Oktober
  const [selectedDepartemen, setSelectedDepartemen] = useState('ALL');
  const [selectedPerspektif, setSelectedPerspektif] = useState('ALL');

  return (
    <FilterContext.Provider
      value={{
        selectedTahun,
        setSelectedTahun,
        selectedBulan,
        setSelectedBulan,
        selectedDepartemen,
        setSelectedDepartemen,
        selectedPerspektif,
        setSelectedPerspektif,
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
