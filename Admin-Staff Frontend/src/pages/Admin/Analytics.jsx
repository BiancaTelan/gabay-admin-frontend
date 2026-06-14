import React, { useState, useEffect, useContext } from 'react';
import { Building2, Users, TrendingUp, ChevronDown, Download, Stethoscope, ClipboardCheck, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AuthContext } from '../../authContext';
import { toast } from 'react-hot-toast';

export default function Analytics() {
  const { token } = useContext(AuthContext);
  
  const [timeFilter, setTimeFilter] = useState('thisMonth');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [data, setData] = useState({
    summary: { topDoc: "-", topDept: "-", activeStaff: "-", docAppts: 0, deptReservations: 0, staffActions: 0 },
    graphData: [],
    departmentStats: [],
    staffPerformance: []
  });

  const filterOptions = [
    { id: 'thisDay', label: 'Today' },
    { id: 'thisWeek', label: 'This Week' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'thisYear', label: 'This Year' }
  ];

  // --- FETCH ANALYTICS DATA ---
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/analytics?period=${timeFilter}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch analytics');
        
        const result = await response.json();
        setData(result);
      } catch (error) {
        toast.error("Could not load system analytics.");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchAnalytics();
  }, [timeFilter, token]);

  const { summary, graphData, departmentStats, staffPerformance } = data;

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue tracking-tight">System Analytics</h1>
          <p className="text-xs md:text-sm font-poppins text-gray-500 mt-1">Data-driven insights and performance metrics</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* TIME FILTER DROPDOWN */}
          <div className="relative w-full sm:w-48">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between bg-white border border-gray-200 px-4 py-2.5 rounded-xl shadow-sm text-sm font-poppins font-medium text-gray-700 hover:bg-gray-50 transition-all"
            >
              <span className="flex items-center gap-2">
                <TrendingUp size={16} className="text-gabay-teal" />
                {filterOptions.find(opt => opt.id === timeFilter)?.label}
              </span>
              <ChevronDown size={16} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-gabay-blue' : 'text-gray-400'}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => { setTimeFilter(option.id); setIsDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm font-poppins transition-colors ${
                      timeFilter === option.id ? 'bg-teal-50 text-gabay-teal font-bold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-gabay-blue mb-4" />
            <p className="font-poppins text-sm animate-pulse">Compiling analytics data...</p>
        </div>
      ) : (
        <>
          {/* TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 flex items-center gap-4 lg:gap-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Stethoscope size={24} className="text-gabay-blue" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Most Booked Doctor</p>
                <h3 className="text-sm md:text-lg font-bold text-gray-800 truncate">{summary.topDoc}</h3>
                <p className="text-xs text-gabay-teal font-medium mt-1">{summary.docAppts} Appointments</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 flex items-center gap-4 lg:gap-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Building2 size={24} className="text-gabay-teal" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Top Department</p>
                <h3 className="text-sm md:text-lg font-bold text-gray-800 truncate">{summary.topDept}</h3>
                <p className="text-xs text-gabay-blue font-medium mt-1">{summary.deptReservations} Total Reservations</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 flex items-center gap-4 lg:gap-6 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                <Users size={24} className="text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Most Active Staff</p>
                <h3 className="text-sm md:text-lg font-bold text-gray-800 truncate">{summary.activeStaff}</h3>
                <p className="text-xs text-orange-500 font-medium mt-1">{summary.staffActions} Tracked Actions</p>
              </div>
            </div>
          </div>

          {/* MAIN DASHBOARD CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* MAIN CHART (SPAN 2) */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gabay-blue font-montserrat">Appointment Traffic</h2>
                  <p className="text-xs text-gray-500 font-poppins mt-1">Comparing General vs Specialty requests</p>
                </div>
              </div>
              <div className="h-[300px] md:h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={graphData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10}/>
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '20px'}}/>
                    <Bar dataKey="General" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="Specialty" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DEPARTMENT LIST */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 flex flex-col">
              <h2 className="text-lg font-bold text-gabay-blue font-montserrat mb-1">Department Demand</h2>
              <p className="text-xs text-gray-500 font-poppins mb-6">Volume breakdown by department</p>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 max-h-[350px]">
                {departmentStats.length === 0 ? (
                    <p className="text-sm text-gray-400 font-poppins italic text-center mt-10">No department data available.</p>
                ) : (
                    departmentStats.map((dept, index) => (
                    <div key={index} className="group relative bg-gray-50/50 border border-gray-100 p-4 rounded-xl hover:bg-white hover:border-gabay-teal transition-all hover:shadow-md">
                        <div className="flex justify-between items-center mb-3">
                        <h4 className="text-sm font-bold text-gray-800 pr-4">{dept.name}</h4>
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{dept.reservations}</span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2 overflow-hidden flex">
                        <div className="bg-gabay-green h-1.5" style={{ width: `${(dept.completed / dept.reservations) * 100}%` }}></div>
                        <div className="bg-red-400 h-1.5" style={{ width: `${(dept.canceled / dept.reservations) * 100}%` }}></div>
                        </div>

                        <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span className="text-gabay-green">{dept.completed} Completed</span>
                        <span className="text-red-400">{dept.canceled} Canceled</span>
                        </div>
                    </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: STAFF PERFORMANCE */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gabay-blue font-montserrat">Staff Output & Efficiency</h2>
                <p className="text-xs text-gray-500 font-poppins mt-1">Monitoring administrative appointment handling</p>
              </div>
              <ClipboardCheck size={24} className="text-gray-300" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {staffPerformance.length === 0 ? (
                  <p className="text-sm text-gray-400 font-poppins italic col-span-full py-4 text-center">No staff performance data recorded for this period.</p>
              ) : (
                staffPerformance.map((staff) => (
                <div key={staff.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm border-2 border-white shadow-sm">
                      {staff.name.charAt(0)}
                    </div>
                    {staff.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-gabay-green border-2 border-white rounded-full animate-pulse" />
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
                      <span className="inline sm:hidden\">CANC</span>
                    </div>
                    <span className="text-gray-300 font-normal">|</span>
                    <div className="text-teal-600">
                      <span>{staff.rescheduled} </span>
                      <span className="hidden sm:inline\">RESCHEDULED</span>
                      <span className="inline sm:hidden\">RESCHED</span>
                    </div>
                  </div>
                </div>
              )))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}