import React, { createContext, useState, useEffect } from 'react';
import useSSE from './hooks/useSSE'; 
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // --- AUTH STATES ---
  const [token, setToken] = useState(localStorage.getItem('gabay_admin_token') || null);
  const [userRole, setUserRole] = useState(localStorage.getItem('gabay_admin_role') || null);
  const [userInfo, setUserInfo] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);

  // --- GLOBAL NOTIFICATION STATES ---
  const [notifications, setNotifications] = useState([]); 
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(
    localStorage.getItem('gabay_admin_last_read') || '2000-01-01T00:00:00.000Z'
  );

  const safeRole = userRole ? userRole.toUpperCase() : null;

  // --- REAL-TIME SSE CONNECTION ---
  const sseEndpoint = safeRole === 'ADMIN' 
    ? '/api/admin/notifications/stream' 
    : (safeRole === 'STAFF' ? '/api/staff/notifications/stream' : null);

    const liveEvent = useSSE(sseEndpoint, token);

  useEffect(() => {
    if (liveEvent) {
      setNotifications(prev => [liveEvent, ...prev]); 
      setUnreadCount(prev => prev + 1);              
    }
  }, [liveEvent]);

  // --- AUTH TOKEN EFFECT ---
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
  }, [token, userRole]);

  // --- PROFILE PHOTO SYNC ---
  useEffect(() => {
    if (token && userRole) {
      const apiBase = safeRole === 'ADMIN' ? '/api/admin' : '/api/staff';
      fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/profile/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.profilePhoto) setProfilePhoto(data.profilePhoto);
      })
      .catch(err => console.error("Failed to fetch global profile photo:", err));
    }
  }, [token, safeRole]);

  // --- ACTIONS ---
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
    setNotifications([]);
    setUnreadCount(0);
    setProfilePhoto(null);
    localStorage.removeItem('gabay_admin_token');
    localStorage.removeItem('gabay_admin_role');
    localStorage.removeItem('gabay_admin_last_read');
  };

  const markAllAsRead = () => {
    if (notifications.length > 0) {
      const newestDate = notifications[0]?.raw_date || new Date().toISOString();
      localStorage.setItem('gabay_admin_last_read', newestDate);
      setLastReadTimestamp(newestDate);
      setUnreadCount(0);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      token, 
      userRole, 
      userInfo, 
      profilePhoto,
      setProfilePhoto,
      login, 
      logout,
      notifications,
      setNotifications,
      unreadCount,
      setUnreadCount,
      markAllAsRead,
      lastReadTimestamp
    }}>
      {children}
    </AuthContext.Provider>
  );
};