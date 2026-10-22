import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { FilterProvider } from './context/FilterContext';
import { AppRouter } from './routes/AppRouter';

function App() {
  return (
    <BrowserRouter>
      <FilterProvider>
        <AppRouter />
      </FilterProvider>
    </BrowserRouter>
  );
}

export default App;
