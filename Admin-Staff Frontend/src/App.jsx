import React, { useState, useContext } from 'react'; 
import { Toaster } from 'react-hot-toast';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './authContext';
import Header from './components/header';
import ForgotPassword from './pages/ForgotPassword';
import Footer from './components/footer';

import StaffLayout from './components/StaffLayout';
import StaffDashboard from './pages/Staff/StaffDashboard';
import StaffAppointments from './pages/Staff/StaffAppointments';
import RescheduleAppointment from './pages/Staff/RescheduleAppointment';
import BookSchedule from './pages/Staff/BookScheduleForm';
import DoctorList from './pages/Staff/DoctorsList';
import DoctorScheduleCalendar from './pages/Staff/DoctorScheduleCalendar';
import StaffNoShows from './pages/Staff/AppointmentsNoShow';
import StaffNotifs from './pages/Staff/StaffNotifs';

import AdminLogin from './pages/Admin/AdminLogin';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import Users from './pages/Admin/Users';
import Personnel from './pages/Admin/Personnel';
import Departments from './pages/Admin/Departments';
import Appointments from './pages/Admin/Appointments';
import AuditLogs from './pages/Admin/AuditLogs';
import SystemLogs from './pages/Admin/SystemLogs';
import AdminNotifs from './pages/Admin/AdminNotifs';
import AdminCalendar from './pages/Admin/AdminCalendar';

import PersonnelAccount from './pages/Admin/PersonnelAccount';


const StaffRoute = () => {
  const { token, userRole } = useContext(AuthContext);
  const location = useLocation();
  const isLoggedIn = !!token;

  if (!isLoggedIn || userRole !== 'Staff') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
};

const AdminRoute = () => {
  const { token, userRole } = useContext(AuthContext);
  const location = useLocation();
  const isLoggedIn = !!token;

  if (!isLoggedIn || userRole !== 'Admin') {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
};

function App() { 
  const navigate = useNavigate();
  const location = useLocation();
  const { token, userInfo, logout, updateUnreadCount } = useContext(AuthContext);

  const isAdminPage = location.pathname.startsWith('/admin');
  const isStaffPage = location.pathname.startsWith('/staff');
  const isLoginPage = ['/admin/login'].includes(location.pathname);
  const showHeader = !isLoginPage && !isAdminPage && !isStaffPage;
  const isLoggedIn = !!token;

  const handleLogout = () => {
    logout();
    navigate('/');
  };


  return (
    <div className="min-h-screen bg-white font-sans relative">
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        toastOptions={{
          style: {
            fontFamily: 'Poppins, sans-serif', 
          },
        }}
      />
      {showHeader && !isAdminPage && (
        <Header 
          isLoggedIn={isLoggedIn} 
          currentPage={location.pathname} 
        />
      )}
      
      <main className={showHeader ? "pt-0" : ""}>
        <Routes>
          {/* Public Routes (Strictly Authentication) */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* STAFF ROUTES */}
          <Route element={<StaffRoute />}>
              <Route path="/staff/dashboard" element={<StaffLayout />}>
                <Route index element={<StaffDashboard />} />
                <Route path="dashboard" element={<StaffDashboard />} />
                <Route path="appointments" element={<StaffAppointments />} />
                <Route path="reschedule" element={<RescheduleAppointment />} />
                <Route path="book-schedule" element={<BookSchedule />} />
                <Route path="doctors" element={<DoctorList />} />
                <Route path="doctor-schedule" element={<DoctorScheduleCalendar />} />
                <Route path="no-show-appointments" element={<StaffNoShows />} />
                <Route path="s-account" element={<PersonnelAccount />} />
                <Route path="s-notifs" element={<StaffNotifs />} /> 
              </Route>
            </Route>

          {/* ADMIN ROUTES */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="personnel" element={<Personnel />} />
              <Route path="departments" element={<Departments />} />
              <Route path="appointments" element={<Appointments />} /> 
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="system-logs" element={<SystemLogs />} />
              <Route path="a-account" element={<PersonnelAccount />} />
              <Route path="a-notifs" element={<AdminNotifs />} />
              <Route path="a-calendar" element={<AdminCalendar />} />
            </Route>  
          </Route>
          
          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>

      </main>
      {showHeader && !isAdminPage && !isStaffPage && <Footer />}
    </div>
  );
}

export default App;