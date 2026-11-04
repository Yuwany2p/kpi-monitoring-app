import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FilterProvider } from './context/FilterContext';
import { AppRouter } from './routes/AppRouter';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FilterProvider>
          <AppRouter />
        </FilterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
