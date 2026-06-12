import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Plus, ChevronLeft as ChevronLeftIcon } from 'lucide-react';
import { AuthContext } from '../../authContext';

// --- HELPER FUNCTIONS & CONSTANTS ---
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const weekDays = [
  { name: 'Sun', color: 'text-gabay-teal', dayCode: 'S' },
  { name: 'Mon', color: 'text-gabay-blue', dayCode: 'M' },
  { name: 'Tue', color: 'text-gabay-blue', dayCode: 'T' },
  { name: 'Wed', color: 'text-gabay-blue', dayCode: 'W' },
  { name: 'Thu', color: 'text-gabay-blue', dayCode: 'TH' },
  { name: 'Fri', color: 'text-gabay-blue', dayCode: 'F' },
  { name: 'Sat', color: 'text-gabay-teal', dayCode: 'ST' }
];

export default function DoctorScheduleCalendar() {
  const navigate = useNavigate();
  const { token, userRole } = useContext(AuthContext); 
  const apiBase = userRole?.toUpperCase() === 'ADMIN' ? '/api/admin' : '/api/staff';
  const [doctors, setDoctors] = useState([]);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // --- FETCH DOCTORS ON MOUNT ---
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/doctors/list`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setDoctors(data);
      } catch (error) {
        console.error("Error loading calendar data:", error);
      }
    };
    if (token) fetchDoctors();
  }, [token]);

  // --- MONTH NAVIGATION HANDLERS ---
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // --- GET DOCTORS ON DUTY FOR A GIVEN DAY ---
  const getDoctorsForDay = (dayIndex, dateObj) => {
    const fullDayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDay = fullDayMap[dayIndex];
    
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const localDateString = `${yyyy}-${mm}-${dd}`;

    const onDuty = [];

    doctors.forEach(doc => {
      if (!doc.schedules || !Array.isArray(doc.schedules)) return;

      const matchedSchedules = doc.schedules.filter(s => s.day === targetDay);

      matchedSchedules.forEach(matchedSchedule => {
        const isGloballyInactive = !doc.isActive || doc.availability === 'Not Available';
        const isOnLeaveToday = doc.onLeaveDate === localDateString;
        const isUnavailable = isGloballyInactive || isOnLeaveToday;

        onDuty.push({
          uniqueKey: `${doc.id}-${matchedSchedule.id}`,
          name: doc.name,
          time: matchedSchedule.time,
          isUnavailable: isUnavailable
        });
      });
    });

    return onDuty;
  };

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6 font-poppins">
      {/* Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gabay-blue px-6 py-6 mb-4">
        <div className="text-left">
          <h1 className="font-montserrat text-3xl font-bold text-white tracking-tight">Doctor List & Schedule</h1>
          <p className="font-poppins text-sm text-white/90 mt-1">
            Doctors &gt; <span className="text-white font-medium underline underline-offset-4">Doctors Schedule</span>
          </p>
        </div>
        <button 
          onClick={() => navigate('/staff/doctors')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gabay-blue font-bold text-sm rounded-lg hover:bg-teal-50 transition-all shadow-lg active:scale-95 group"
        >
          <ChevronLeftIcon size={18} className="group-hover:-translate-x-1 transition-transform" />
          Return to Doctor List
        </button>
      </div>

      {/* CALENDAR */}
      <div className="w-full pb-8">
        <div className="bg-white rounded-xl shadow-md p-6 overflow-hidden">
          
          {/* CALENDAR NAV */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-3 text-gray-600 hover:text-gabay-blue transition"
                aria-label="Previous month"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="font-montserrat font-bold text-2xl text-gabay-teal w-64 text-center uppercase tracking-widest">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={nextMonth}
                className="p-3 text-gray-600 hover:text-gabay-blue transition"
                aria-label="Next month"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          {/* WEEKDAY LABELS */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center font-semibold">
            {weekDays.map(({ name, color }) => (
              <div key={name} className={`py-2 ${color} uppercase text-xs tracking-widest`}>{name}</div>
            ))}
          </div>

          {/* CALENDAR GRID */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for previous month */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 md:h-32 bg-gray-50/30 border border-gray-50 rounded-lg" />
            ))}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(currentYear, currentMonth, day);
              
              const onDuty = getDoctorsForDay(dateObj.getDay(), dateObj); 
              const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

              return (
                <div
                  key={day}
                  className={`h-24 md:h-32 flex flex-col items-start p-2 border border-gray-100 rounded-lg overflow-hidden transition-colors ${
                    isToday ? 'bg-teal-50 border-teal-200' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-sm mb-1 font-bold ${isToday ? 'text-gabay-teal' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  
                  <div className="w-full space-y-1 overflow-y-auto custom-scrollbar">
                    {onDuty.map((doc) => (
                      <div 
                        key={doc.uniqueKey} 
                        title={doc.isUnavailable ? "Unavailable / On Leave" : "Available"}
                        className={`px-1.5 py-1 rounded border shadow-sm truncate transition-colors ${
                          doc.isUnavailable 
                            ? 'bg-red-50 border-red-200 border-l-4 border-l-red-500' 
                            : 'bg-white border-gray-200 border-l-4 border-l-gabay-teal'
                        }`}
                      >
                        <p className={`text-[9px] font-bold truncate leading-tight uppercase ${
                          doc.isUnavailable ? 'text-red-700' : 'text-gray-800'
                        }`}>
                          {doc.name.replace('Dr. ', '')}
                        </p>
                        <div className={`flex items-center gap-0.5 ${
                          doc.isUnavailable ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          <Clock size={7} />
                          <span className="text-[7px] italic font-medium truncate">
                            {doc.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}