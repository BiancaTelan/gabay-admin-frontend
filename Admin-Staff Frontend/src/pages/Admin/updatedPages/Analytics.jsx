import React, { useState, useEffect } from 'react';
import { Building2, Users, TrendingUp, 
ChevronDown, Download, Stethoscope, ClipboardCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, 
YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ==========================================
// MOCK DATA SAMPLES
// ==========================================

const mockSummaryData = {
  thisWeek: { topDoc: "Dr. Ester German", topDept: "General Dentistry", activeStaff: "Rachel Mawac", docAppts: 4, deptReservations: 12, staffActions: 6 },
  thisMonth: { topDoc: "Dr. Ester German", topDept: "Internal Medicine", activeStaff: "Rachel Mawac", docAppts: 14, deptReservations: 41, staffActions: 18 },
  thisYear: { topDoc: "Dr. Ester German", topDept: "Internal Medicine", activeStaff: "Rachel Mawac", docAppts: 168, deptReservations: 512, staffActions: 210 }
};

const mockGraphData = {
  thisWeek: [
    { name: 'Week 1', General: 11, Specialty: 10 },
  ],
  thisMonth: [
    { name: 'Week 1', General: 11, Specialty: 10 },
    { name: 'Week 2', General: 9, Specialty: 8 },
    { name: 'Week 3', General: 12, Specialty: 10 },
    { name: 'Week 4', General: 8, Specialty: 7 },
    { name: 'Week 5', General: 9, Specialty: 8 },
    { name: 'Week 6', General: 9, Specialty: 8 },
  ],
  thisYear: [
    { name: 'Jan-Feb', General: 54, Specialty: 42 },
    { name: 'Mar-Apr', General: 68, Specialty: 55 },
    { name: 'May-Jun', General: 85, Specialty: 70 },
  ]
};

const mockTopDepartments = {
  thisWeek: [
    { name: 'General Internal Medicine', appointments: 4 },
    { name: 'General Surgery', appointments: 3 },
  ],
  thisMonth: [
    { name: 'General Internal Medicine', appointments: 14, pct: '27%' },
    { name: 'General Surgery', appointments: 12, pct: '25%' },
    { name: 'Nephrology', appointments: 10, pct: '18%' },
    { name: 'General Dentistry', appointments: 6, pct: '15%' },
    { name: 'Cardiology', appointments: 5, pct: '11%' },
  ],
  thisYear: [
    { name: 'General Internal Medicine', appointments: 142 },
    { name: 'General Surgery', appointments: 115 },
    { name: 'Nephrology', appointments: 98 },
  ]
};

const mockDoctors = {
  thisWeek: [
    { name: "Ester German", Department: "General Dentistry", completed: 4, maxSlots: 25, activeSlots: 25 },
  ],
  thisMonth: [
    { name: "Ester German", Department: "General Dentistry", completed: 14, maxSlots: 25, activeSlots: 25 },
    { name: "Adelina Paule", Department: "IM - Vascular Cardiology", completed: 12, maxSlots: 25, activeSlots: 11 },
    { name: "Dennis Naval", Department: "IM - Vascular Cardiology", completed: 10, maxSlots: 25, activeSlots: 23 },
    { name: "Ernesto Santiago", Department: "General Pediatrics", completed: 6, maxSlots: 25, activeSlots: 14 },
    { name: "Girlie Nieto", Department: "Restorative Dentistry", completed: 5, maxSlots: 25, activeSlots: 5 },
  ],
  thisYear: [
    { name: "Ester German", Department: "General Dentistry", completed: 88, maxSlots: 25, activeSlots: 25 },
  ]
};

const mockStaff = {
  thisWeek: [
    { name: "Bianca Telan", approved: 2, canceled: 0, rescheduled: 1, profileUrl: null, isActive: true, lastActionTime: "2026-06-07" },
  ],
  thisMonth: [
    { name: "Bianca Telan", approved: 14, canceled: 1, rescheduled: 5, profileUrl: null, isActive: true, lastActionTime: "2026-06-07T10:00:00Z" },
    { name: "Geraldine Bardon", approved: 10, canceled: 2, rescheduled: 5, profileUrl: null, isActive: true, lastActionTime: "2026-06-06T09:30:00Z" },
    { name: "Rachel Mawac", approved: 7, canceled: 3, rescheduled: 5, profileUrl: null, isActive: false, lastActionTime: "2026-06-05T14:15:00Z" },
    { name: "Marinel Turano", approved: 9, canceled: 1, rescheduled: 5, profileUrl: null, isActive: true, lastActionTime: "2026-06-04T11:00:00Z" },
    { name: "Trixia Bautista", approved: 10, canceled: 2, rescheduled: 5, profileUrl: null, isActive: false, lastActionTime: "2026-05-28T08:22:00Z" },
  ],
  thisYear: [
    { name: "Bianca Telan", approved: 120, canceled: 12, rescheduled: 45, profileUrl: null, isActive: true, lastActionTime: "2026-01-15" },
  ]
};

export default function Analytics() {
  const [timeFilter, setTimeFilter] = useState('thisMonth'); 
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = () => {
      setIsFilterDropdownOpen(false);
      setIsExportDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const getInitials = (fullName) => {
    if (!fullName) return "??";
    const names = fullName.trim().split(" ");
    if (names.length === 1) return names[0].slice(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const handleExport = (type) => {
    alert(`Generating excel report for: ${type.toUpperCase()} with filter range: ${timeFilter}`);
    /* // BACKEND DEVELOPER NOTE:
      // Send Axios or Fetch call to API endpoint:
      // Axios.get(`/api/analytics/export?type=${type}&range=${timeFilter}`, { responseType: 'blob' })
      // .then(res => downloadFileBlob(res.data))
    */
  };

  const activeSummary = mockSummaryData[timeFilter] || mockSummaryData.thisMonth;
  const activeGraph = mockGraphData[timeFilter] || mockGraphData.thisMonth;
  const activeTopDepts = mockTopDepartments[timeFilter] || mockTopDepartments.thisMonth;
  const activeDocs = mockDoctors[timeFilter] || mockDoctors.thisMonth;
  
  // Doctors: Sort from highest to lowest number of completed appointments
  const sortedDocs = [...activeDocs].sort((a, b) => b.completed - a.completed);
  
  // Staff: Sort dynamically from most recent timeline action event tracking stamp
  const activeStaffList = mockStaff[timeFilter] || mockStaff.thisMonth;
  const sortedStaff = [...activeStaffList].sort((a, b) => new Date(b.lastActionTime) - new Date(a.lastActionTime));

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-poppins text-gray-700 antialiased selection:bg-teal-500 selection:text-white">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gabay-blue tracking-tight">GABAY Analytics</h1>
          <p className="text-xs md:text-sm text-gray-500 font-medium mt-0.5">Main Menu &gt; Analytics</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto relative">
          {/* Filter Dropdown */}
          <div className="relative w-1/2 sm:w-44" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => { setIsFilterDropdownOpen(!isFilterDropdownOpen); setIsExportDropdownOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-semibold hover:bg-teal-50/50 transition-colors shadow-sm"
            >
              <span>
                {timeFilter === 'thisWeek' && 'Filter By: This Week'}
                {timeFilter === 'thisMonth' && 'Filter By: This Month'}
                {timeFilter === 'thisYear' && 'Filter By: This Year'}
              </span>
              <ChevronDown size={16} className={`transform transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isFilterDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
                <button onClick={() => { setTimeFilter('thisWeek'); setIsFilterDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">This Week</button>
                <button onClick={() => { setTimeFilter('thisMonth'); setIsFilterDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">This Month</button>
                <button onClick={() => { setTimeFilter('thisYear'); setIsFilterDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">This Year</button>
              </div>
            )}
          </div>

          {/* Export Report Button*/}
          <div className="relative w-1/2 sm:w-44" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => { setIsExportDropdownOpen(!isExportDropdownOpen); setIsFilterDropdownOpen(false); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gabay-teal text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-all shadow-sm"
            >
              <Download size={16} />
              <span>Export Reports</span>
            </button>

            {isExportDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-gray-100">
                <button onClick={() => { handleExport('doctors'); setIsExportDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">Doctors</button>
                <button onClick={() => { handleExport('staff'); setIsExportDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">Staff</button>
                <button onClick={() => { handleExport('departments'); setIsExportDropdownOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 text-gray-700 transition-colors">Departments</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BACKEND DEVELOPER NOTE: Aggregates can be calculated dynamically inside SQL with COUNT() groupings relative to your ranges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        {/* TOP DOCTOR */}
        <div className="p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <h4 className="text-xl font-bold text-gabay-teal">{activeSummary.topDoc}</h4>
            <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase">General Dentistry</p>
            <p className="text-xs font-medium text-gray-500 pt-1">Most Appointments Completed ({activeSummary.docAppts})</p>
          </div>
          <div className="p-3 bg-teal-50 text-gabay-teal rounded-xl border border-teal-100">
            <Stethoscope size={24} />
          </div>
        </div>

        {/* DEPT. WITH HIGHEST VOLUME */}
        <div className="p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <h4 className="text-xl font-bold text-gabay-blue">{activeSummary.topDept}</h4>
            <p className="text-xs text-blue-400 font-semibold tracking-wide uppercase">{activeSummary.deptReservations} Reservations</p>
            <p className="text-xs font-medium text-gray-500 pt-1">Most Booked Department</p>
          </div>
          <div className="p-3 bg-blue-50 text-gabay-blue rounded-xl border border-blue-100">
            <Building2 size={24} />
          </div>
        </div>

        {/* TOP STAFF */}
        <div className="p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <h4 className="text-xl font-bold text-green-600">{activeSummary.activeStaff}</h4>
            <p className="text-xs text-green-400 font-semibold tracking-wide uppercase">{activeSummary.staffActions} Handled Appointments</p>
            <p className="text-xs font-medium text-gray-500 pt-1">Most Active Staff</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl border border-green-100">
            <ClipboardCheck size={24} />
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* VERTICAL CHART - BACKEND DEVELOPER NOTE: Formulate your data payload arrays formatted to map out keys: name, General, Specialty */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm lg:col-span-7 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gabay-blue font-poppins">Department Overview</h3>
            <p className="text-xs text-gray-400 font-medium mb-4">Completed comparative structural load ratios</p>
          </div>
          <div className="h-64 w-full text-xs font-medium">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeGraph} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#9ca3af" />
                <YAxis tickLine={false} axisLine={false} stroke="#9ca3af" />
                <Tooltip cursor={{ fill: '#f3f4f6', opacity: 0.5 }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="General" fill="#3c6ecb" radius={[4, 4, 0, 0]} name="General" />
                <Bar dataKey="Specialty" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Specialty" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HORIZONTAL CHART */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm lg:col-span-5 flex flex-col">
          <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4">Top Departments</h3>
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[260px] pr-1 custom-scrollbar">
            {activeTopDepts.map((dept, index) => {
              const highestValue = Math.max(...activeTopDepts.map(d => d.appointments), 1);
              const calculatedWidthPct = (dept.appointments / highestValue) * 100;

              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-bold text-gray-400 text-center">{index + 1}</span>
                  <div className="flex-1 bg-gray-50 rounded-lg h-10 relative flex items-center justify-between px-3 overflow-hidden border border-gray-100">
                    
                    <div 
                      className="absolute left-0 top-0 h-full transition-all duration-500 ease-out"
                      style={{ 
                        width: `${calculatedWidthPct}%`, 
                        backgroundColor: index === 2 ? '#f59e0b' : index === 4 ? '#f59e0b' : '#3c6ecb' 
                      }}
                    />
                    
                    {/* Floating Labels */}
                    <span className="relative z-10 text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] truncate max-w-[70%]">
                      {dept.name}
                    </span>
                    <div className="relative z-10 flex items-center gap-2 text-xs font-bold text-gray-600">
                      <span className="bg-white px-2 py-0.5 rounded border border-gray-200/80 shadow-2xs text-gabay-blue">
                        {dept.appointments}
                      </span>
                      {dept.pct && <span className="text-gray-400 text-[11px] font-semibold w-8 text-right">{dept.pct}</span>}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DOCTOR OVERVIIEW - BACKEND DEVELOPER NOTE: Run internal sorting logic query `ORDER BY completed_appointments DESC` */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gabay-blue">Doctor Overview</h3>
            <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mt-1">
              Name / Department / Completed Appt. / Slots
            </p>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {sortedDocs.map((doc, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50/80 border border-transparent hover:border-gray-100 transition-all">
                {/* Dynamically Generated Initials Avatar Block Container */}
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 text-gabay-blue flex items-center justify-center font-bold text-sm tracking-wide shrink-0">
                  {getInitials(doc.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gabay-blue truncate">{doc.name}</h4>
                  <p className="text-xs text-gray-400 font-medium truncate">{doc.department}</p>
                </div>

                {/* Right Metrics Layout Data Matrix Block */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-md min-w-[32px] text-center shadow-xs">
                    {doc.completed}
                  </span>
                  
                  {/* Fixed Static Capacity Display Progress Track Bar Indicators */}
                  <div className="w-20 md:w-24 bg-gray-100 rounded-full h-6 relative overflow-hidden border border-gray-200/60 hidden sm:flex items-center justify-center">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gray-400/40 transition-all duration-300"
                      style={{ width: `${(doc.activeSlots / doc.maxSlots) * 100}%` }}
                    />
                    <span className="relative text-[11px] font-black text-gray-700 tracking-wide">
                      {doc.activeSlots}/{doc.maxSlots}
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>


        {/* STAFF OVERVIEW - BACKEND DEVELOPER NOTE: Query your tracking logs filtering `ORDER BY action_timestamp DESC` */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gabay-blue">Staff Overview</h3>
            <p className="text-[11px] font-bold text-gray-400 tracking-wider uppercase mt-1">
              Name / Approved / Canceled / Rescheduled
            </p>
          </div>

          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {sortedStaff.map((staff, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50/80 border border-transparent hover:border-gray-100 transition-all">
                
                {/* Fallback Verified Avatar Element Layer Holder */}
                <div className="relative shrink-0">
                  {staff.profileUrl ? (
                    <img src={staff.profileUrl} alt={staff.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 text-gabay-teal flex items-center justify-center font-bold text-sm tracking-wide">
                      {getInitials(staff.name)}
                    </div>
                  )}
                  {/* Status Dot */}
                  {staff.isActive && (
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gabay-blue truncate">{staff.name}</h4>
                </div>

                <div className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl flex items-center gap-2 md:gap-3 text-[10px] md:text-xs font-bold tracking-tight">
                  <div className="text-green-600">
                    <span>{staff.approved} </span>
                    <span className="hidden sm:inline">APPROVED</span>
                    <span className="inline sm:hidden">APPR</span>
                  </div>
                  <span className="text-gray-300 font-normal">|</span>
                  <div className="text-red-500">
                    <span>{staff.canceled} </span>
                    <span className="hidden sm:inline">CANCELED</span>
                    <span className="inline sm:hidden">CANC</span>
                  </div>
                  <span className="text-gray-300 font-normal">|</span>
                  <div className="text-teal-600">
                    <span>{staff.rescheduled} </span>
                    <span className="hidden sm:inline">RESCHEDULED</span>
                    <span className="inline sm:hidden">RESCHED</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}