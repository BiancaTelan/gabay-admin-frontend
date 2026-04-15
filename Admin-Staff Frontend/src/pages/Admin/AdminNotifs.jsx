import React, { useState, useContext } from 'react';
import { Bell, CheckCheck, Clock, ShieldAlert, Activity, FileEdit, UserPlus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthContext } from '../../authContext';
import { toast } from 'react-hot-toast';

// --- HELPER: TIME AGO CALCULATOR ---
function timeAgo(dateString) {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export default function AdminNotifs() {
  // Grab all the global states from our new AuthContext
  const { notifications, unreadCount, markAllAsRead, lastReadTimestamp } = useContext(AuthContext);
  
  // Local state just for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- BADGE & PAGINATION CALCULATIONS ---
  // Safety check fallback in case context is still booting up
  const safeNotifications = notifications || [];
  
  const totalPages = Math.max(1, Math.ceil(safeNotifications.length / itemsPerPage));
  const pagedData = safeNotifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const entryStart = safeNotifications.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, safeNotifications.length);

  // --- ICON & COLOR HELPERS ---
  const getIcon = (notif) => {
    if (notif.type === 'alert') return <ShieldAlert className={notif.priority === 'CRITICAL' ? 'text-red-600' : 'text-orange-500'} size={20} />;
    if (notif.action === 'INSERT') return <UserPlus className="text-green-600" size={20} />;
    if (notif.action === 'DELETE') return <Trash2 className="text-red-500" size={20} />;
    if (notif.action === 'UPDATE') return <FileEdit className="text-blue-500" size={20} />;
    return <Activity className="text-gabay-teal" size={20} />;
  };

  const getBgColor = (notif) => {
    if (notif.type === 'alert') return notif.priority === 'CRITICAL' ? 'bg-red-100 border-red-200' : 'bg-orange-50 border-orange-100';
    if (notif.action === 'INSERT') return 'bg-green-50 border-green-100';
    if (notif.action === 'DELETE') return 'bg-red-50 border-red-100';
    return 'bg-blue-50 border-blue-100';
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 font-poppins animate-in fade-in duration-500 pb-20">
      
      {/* HEADER & UNREAD BADGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue flex items-center gap-3">
            System Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse shadow-sm">
                {unreadCount} New
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Live feed of system activity and alerts.</p>
        </div>
        <button 
          onClick={() => {
            markAllAsRead();
            toast.success('All notifications marked as read.');
          }}
          disabled={unreadCount === 0 || safeNotifications.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gabay-blue hover:bg-blue-50 transition shadow-sm w-fit disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCheck size={18} /> Mark all as read
        </button>
      </div>

      {/* NOTIFICATIONS LIST */}
      <div className="space-y-4">
        {safeNotifications.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col items-center">
            <Bell className="mb-3 text-gray-300" size={32} />
            <p>You're all caught up!</p>
          </div>
        ) : (
          pagedData.map((n) => {
            const isUnread = new Date(n.raw_date) > new Date(lastReadTimestamp);

            return (
              <div 
                key={n.id} 
                className={`relative flex items-start gap-4 p-5 bg-white border rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  isUnread ? 'border-gabay-blue ring-1 ring-gabay-blue/20' : 'border-gray-100 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Unread Indicator Dot */}
                {isUnread && <div className="absolute -left-1.5 -top-1.5 w-4 h-4 bg-gabay-blue rounded-full border-2 border-white shadow-sm" />}

                {/* Icon Box */}
                <div className={`p-3 rounded-lg border ${getBgColor(n)}`}>
                  {getIcon(n)}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex justify-between items-start md:items-center mb-1 flex-col md:flex-row gap-1 md:gap-0">
                    <h3 className={`text-sm md:text-base text-gray-900 ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                      {n.title}
                    </h3>
                    <span className={`text-xs flex items-center gap-1.5 whitespace-nowrap ${isUnread ? 'text-gabay-blue font-semibold' : 'text-gray-400'}`}>
                      <Clock size={12}/> {timeAgo(n.raw_date)}
                    </span>
                  </div>
                  <p className={`text-sm ${isUnread ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                    {n.desc}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PAGINATION */}
      {safeNotifications.length > 0 && (
        <div className="px-6 py-4 bg-white border border-gray-100 rounded-xl shadow-sm mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)} 
              className="p-1.5 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={20}/>
            </button>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentPage(i + 1)} 
                  className={`w-8 h-8 rounded-lg text-xs font-poppins font-bold transition-all ${
                    currentPage === i + 1 ? 'bg-gabay-blue text-white shadow-md' : 'hover:bg-gray-50 border border-transparent hover:border-gray-200 text-gray-500'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              disabled={currentPage === totalPages || totalPages === 0} 
              onClick={() => setCurrentPage(p => p + 1)} 
              className="p-1.5 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={20}/>
            </button>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 font-poppins font-medium">
            Showing {entryStart} - {entryEnd} of {safeNotifications.length} entries
          </p>
        </div>
      )}
    </div>
  );
}