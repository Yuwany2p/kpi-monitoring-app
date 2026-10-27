import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEMO_USERS, ROLES } from '../lib/constants';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('kpi_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEMO_USERS[0];
      }
    }
    return DEMO_USERS[0]; // Default: Hendra Wijaya (Supervisor)
  });

  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    localStorage.setItem('kpi_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const login = (email, password) => {
    const found = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentUser(found);
      setIsAuthenticated(true);
      return { success: true, user: found };
    }
    // Default fallback to supervisor
    setCurrentUser(DEMO_USERS[0]);
    setIsAuthenticated(true);
    return { success: true, user: DEMO_USERS[0] };
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const switchRole = (role) => {
    const found = DEMO_USERS.find((u) => u.role === role);
    if (found) {
      setCurrentUser(found);
      setIsAuthenticated(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAuthenticated,
        login,
        logout,
        switchRole,
        role: currentUser?.role || ROLES.SUPERVISOR,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
