import React, { createContext, useState, useEffect } from 'react';

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
  }, [token]);

  // --- GLOBAL NOTIFICATION POLLING EFFECT ---
  useEffect(() => {
    let interval;

    const fetchGlobalNotifications = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        
        const data = await response.json();
        setNotifications(data);

        const count = data.filter(n => new Date(n.raw_date) > new Date(lastReadTimestamp)).length;
        setUnreadCount(count);

      } catch (error) {
        console.error("Global notification fetch error:", error);
      }
    };

    if (token) {
      fetchGlobalNotifications(); 
      interval = setInterval(fetchGlobalNotifications, 10000); 
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, lastReadTimestamp]);

  useEffect(() => {
    if (token && userRole) {
      const apiBase = userRole.toLowerCase() === 'admin' ? '/api/admin' : '/api/staff';
      
      fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/profile/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.profilePhoto) setProfilePhoto(data.profilePhoto);
      })
      .catch(err => console.error("Failed to fetch global profile photo:", err));
    }
  }, [token, userRole]);

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
      const newestDate = notifications[0].raw_date;
      localStorage.setItem('gabay_admin_last_read', newestDate);
      setLastReadTimestamp(newestDate);
      setUnreadCount(0);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      token, userRole, userInfo, login, logout,
      // Pass the notification data globally!
      notifications, unreadCount, markAllAsRead, lastReadTimestamp,
      profilePhoto, setProfilePhoto 
    }}>
      {children}
    </AuthContext.Provider>
  );
};