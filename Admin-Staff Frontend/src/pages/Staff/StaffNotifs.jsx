import React, { useState, useContext, useEffect } from 'react';
import { Bell, CheckCheck, Clock, Calendar, User, Activity, Info, ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function StaffNotifs() {
  const { notifications, unreadCount, markAllAsRead, lastReadTimestamp } = useContext(AuthContext);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 6000); 
      return () => clearTimeout(timer);
    }
  }, [unreadCount, markAllAsRead]);

  // --- PAGINATION ---
  const safeNotifications = notifications || [];
  const totalPages = Math.max(1, Math.ceil(safeNotifications.length / itemsPerPage));
  const pagedData = safeNotifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const entryStart = safeNotifications.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, safeNotifications.length);

  // --- ICON & COLOR HELPERS ---
  const getIcon = (notif) => {
    const text = (notif.title + notif.desc).toLowerCase();
    if (text.includes('appointment') || text.includes('schedule')) return <Calendar className="text-gabay-blue" size={20} />;
    if (text.includes('patient') || text.includes('check')) return <User className="text-green-500" size={20} />;
    if (notif.action === 'UPDATE') return <Clock className="text-orange-500" size={20} />;
    return <Info className="text-gray-500" size={20} />;
  };

  const getBgColor = (notif) => {
    const text = (notif.title + notif.desc).toLowerCase();
    if (text.includes('appointment') || text.includes('schedule')) return 'bg-blue-50 border-blue-100';
    if (text.includes('patient') || text.includes('check')) return 'bg-green-50 border-green-100';
    if (notif.action === 'UPDATE') return 'bg-orange-50 border-orange-100';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 font-poppins animate-in fade-in duration-500 pb-20">
      
      {/* HEADER & UNREAD BADGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 text-left">
        <div>
          <h1 className="text-3xl font-montserrat font-bold text-gabay-teal flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse shadow-sm">
                {unreadCount} New
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1">Manage your daily tasks and updates</p>
        </div>
        
        <button 
          onClick={() => {
            markAllAsRead();
            toast.success('All notifications marked as read.');
          }}
          disabled={unreadCount === 0 || safeNotifications.length === 0}
          className="flex items-center gap-2 text-sm font-semibold text-gabay-blue hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCheck size={18} /> Mark all as read
        </button>
      </div>

      {/* NOTIFICATIONS LIST */}
      <div className="space-y-4 text-left">
        {safeNotifications.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Bell className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No new notifications at the moment.</p>
          </div>
        ) : (
          pagedData.map((n) => {
            const isUnread = new Date(n.raw_date) > new Date(lastReadTimestamp);

            return (
              <div 
                key={n.id} 
                className={`relative flex items-start gap-4 p-5 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  isUnread ? 'border-gabay-blue ring-1 ring-gabay-blue/20 bg-blue-50/10' : 'border-gray-100 opacity-90 hover:opacity-100'
                }`}
              >

                {isUnread && <div className="absolute -left-1.5 -top-1.5 w-4 h-4 bg-gabay-blue rounded-full border-2 border-white shadow-sm animate-pulse" />}

                {/* Icon Box */}
                <div className={`p-3 rounded-lg border transition-colors ${getBgColor(n)}`}>
                  {getIcon(n)}
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex justify-between items-start md:items-center mb-1 flex-col md:flex-row gap-1 md:gap-0">
                    <h3 className={`text-sm md:text-base group-hover:text-gabay-teal transition-colors ${isUnread ? 'font-bold text-gabay-blue' : 'font-semibold text-gray-800'}`}>
                      {n.title || n.action} 
                    </h3>
                    <span className={`text-xs flex items-center gap-1.5 whitespace-nowrap ${isUnread ? 'text-gabay-blue font-semibold' : 'text-gray-400'}`}>
                      <Clock size={12}/> {timeAgo(n.raw_date)}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${isUnread ? 'text-gray-800 font-medium' : 'text-gray-600'}`}>
                    {n.desc || n.details} 
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PAGINATION */}
      {safeNotifications.length > 0 && (
        <div className="px-6 py-4 bg-white border border-gray-100 rounded-xl shadow-sm mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                    currentPage === i + 1 ? 'bg-gabay-teal text-white shadow-md' : 'hover:bg-gray-50 border border-transparent hover:border-gray-200 text-gray-500'
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