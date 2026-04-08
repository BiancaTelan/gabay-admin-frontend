import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('gabay_admin_token') || null);
  const [userRole, setUserRole] = useState(localStorage.getItem('gabay_admin_role') || null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo(payload);
        
        if (payload.role && payload.role !== userRole) {
          setUserRole(payload.role);
          localStorage.setItem('gabay_admin_role', payload.role);
        }
      } catch (error) {
        console.error("Invalid token detected. Logging out.");
        logout(); 
      }
    }
  }, [token]);

  const login = (newToken, role) => {
    setToken(newToken);
    setUserRole(role);
    localStorage.setItem('gabay_admin_token', newToken);
    localStorage.setItem('gabay_admin_role', role);
  };

  const logout = () => {
    setToken(null);
    setUserRole(null);
    setUserInfo(null);
    localStorage.removeItem('gabay_admin_token');
    localStorage.removeItem('gabay_admin_role');
  };

  return (
    <AuthContext.Provider value={{ token, userRole, userInfo, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};