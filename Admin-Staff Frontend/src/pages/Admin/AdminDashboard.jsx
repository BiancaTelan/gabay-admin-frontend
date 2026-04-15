import React, { useState, useEffect, useContext } from 'react';
import { 
  FileCheck, Stethoscope, ShieldPlus, ClipboardList, 
  Plus, DownloadCloud, ExternalLink, Activity, AlertCircle 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { AuthContext } from '../../authContext';
import StatCard from '../../components/StatCard';
import { toast } from 'react-hot-toast';

// Dummy data for the timeline until the Appointment table is fully populated with months of data
const timelineData = [
  { name: 'Week 1', appointments: 40 },
  { name: 'Week 2', appointments: 30 },
  { name: 'Week 3', appointments: 55 },
  { name: 'Week 4', appointments: 45 },
];

export default function AdminDashboard() {
  const { token } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/admin/dashboard/summary`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const summary = await response.json();
        setData(summary);
      } catch (error) {
        toast.error("Could not load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchDashboard();
  }, [token]);

  if (isLoading || !data) return <div className="p-12 text-center text-gray-500 font-poppins">Loading Command Center...</div>;

  // Calculate capacity percentage for the bar chart
  const capacityPercent = data.total_slots > 0 ? Math.round((data.used_slots / data.total_slots) * 100) : 0;
  const capacityData = [
    { name: 'Used', value: data.used_slots, color: '#0ea5e9' }, // gabay-blue
    { name: 'Available', value: data.total_slots - data.used_slots, color: '#e0f2fe' }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-montserrat text-3xl font-bold text-gabay-blue">Dashboard</h1>
          <p className="font-poppins text-sm text-gray-500 mt-1">
            Home &gt; <span className="text-gray-700 font-medium">Dashboard</span>
          </p>
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium font-poppins text-sm rounded-lg hover:bg-gray-50 transition">
            Filter By: This Month
          </button> 
          <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-gabay-teal text-white font-medium font-poppins text-sm hover:bg-gabay-teal2 transition">
            <Plus size={18} /> Generate Reports
          </button>
        </div> 
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Appointments (Month)" value={data.appointments} icon={FileCheck} color="teal" />
        <StatCard title="Today's Slots" value={`${data.used_slots} / ${data.total_slots}`} icon={ClipboardList} color="orange" />
        <StatCard title="System Health" value={`${data.health_score}%`} icon={ShieldPlus} color="blue" />
        <StatCard title="Active Personnel" value={data.personnel} icon={Stethoscope} color="green" />
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1.5fr_1fr] gap-6 items-start">
        
        {/* LEFT & CENTER COLUMN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:col-span-2">
          
          {/* TIMELINE CHART */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[300px] flex flex-col">
            <div className="flex justify-between mb-4">
              <h4 className="font-montserrat text-lg font-bold text-gabay-blue flex items-center gap-2">
                Appointment Timeline <ExternalLink size={16} className="text-gray-400" />
              </h4>
              <span className="text-sm text-gray-400 font-poppins">Filter: This Month</span>
            </div>
            <div className="flex-1 w-full h-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="appointments" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorAppts)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SLOT CAPACITY CHART */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[200px] flex flex-col">
            <h4 className="font-montserrat text-lg font-bold text-gabay-blue flex items-center gap-2 mb-2">
              Slot Capacity Today <ExternalLink size={16} className="text-gray-400 cursor-pointer hover:text-gabay-blue transition" />
            </h4>
            <div className="flex items-center justify-between flex-1">
              <div>
                <p className="text-3xl font-bold text-gray-800">{capacityPercent}%</p>
                <p className="text-xs text-gray-400 font-poppins uppercase tracking-wider mt-1">Booked</p>
              </div>
              <div className="w-24 h-24 min-h-[96px] min-w-[96px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capacityData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={20}>
                      {capacityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* QUICK LINKS / ONLINE STAFF */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <Activity className="text-gabay-teal mb-3" size={32} />
            <h4 className="font-montserrat text-lg font-bold text-gabay-blue mb-1">Live Monitoring</h4>
            <p className="text-sm font-poppins text-gray-500 mb-4">The background scheduler is actively protecting system health.</p>
            <span className="px-4 py-1.5 bg-green-50 text-green-600 font-bold text-xs rounded-full font-poppins uppercase tracking-wide">
              Systems Optimal
            </span>
          </div>

          {/* AUDIT LOGS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-montserrat text-lg font-bold text-gabay-blue flex items-center gap-2">
                Recent Audit Logs <ExternalLink size={16} className="text-gray-400" />
              </h4>
              <button className="text-sm text-gray-400 font-medium font-poppins hover:underline">See all</button>
            </div>
            <div className="space-y-3">
              {data.recent_audits.length === 0 ? (
                 <p className="text-sm text-gray-400 font-poppins italic">No recent activity.</p>
              ) : (
                data.recent_audits.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider w-16 text-center ${
                        log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.action}
                      </span>
                      <p className="font-poppins text-sm text-gray-700 truncate max-w-[250px] sm:max-w-md">{log.details}</p>
                    </div>
                    <p className="text-xs text-gray-400 font-poppins whitespace-nowrap">{log.date} - {log.time}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          
          {/* SYSTEM HEALTH LOGS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h4 className="font-montserrat text-lg font-bold text-gabay-blue mb-6 flex items-center gap-2">
              <AlertCircle size={18} className="text-red-400"/> Health Warnings
            </h4>
            <div className="space-y-3">
              {data.recent_health.length === 0 ? (
                 <p className="text-sm text-gray-400 font-poppins italic">Server is running perfectly.</p>
              ) : (
                data.recent_health.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-3 border border-red-100 rounded-lg bg-red-50/30">
                    <div className="space-y-1">
                      <p className="font-poppins text-sm font-semibold text-gray-900">{log.type}</p>
                      <p className="font-poppins text-[10px] text-red-500 font-bold tracking-wide uppercase">{log.priority} &nbsp;•&nbsp; {log.time}</p>
                    </div>
                    <DownloadCloud size={18} className="text-gray-400 cursor-pointer hover:text-gray-700" />
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}