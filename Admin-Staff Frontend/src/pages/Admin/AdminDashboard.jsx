import React, { useState, useEffect, useContext } from 'react';
import { 
  FileCheck, Stethoscope, ShieldPlus, ClipboardList, 
  Plus, DownloadCloud, ExternalLink, Activity, AlertCircle, ChevronDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { AuthContext } from '../../authContext';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/StatCard';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';

// ADMIN DASHBOARD
export default function AdminDashboard() {
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('month');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  // Fetch Dashboard Data
  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, metricsRes] = await Promise.all([
          fetch(`${apiBase}/api/admin/dashboard/summary?period=${filter}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${apiBase}/api/admin/system-metrics`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        if (!summaryRes.ok) throw new Error('Failed to fetch dashboard data');
        
        const summary = await summaryRes.json();
        const metricsData = metricsRes.ok ? await metricsRes.json() : null;
        
        setData(summary);
        setMetrics(metricsData);
      } catch (error) {
        toast.error("Could not load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchDashboard();
  }, [token, apiBase, filter]);

  // Excel Report Generation
  const handleGenerateReport = async () => {
    if (!data) {
      toast.error("No data available to export.");
      return;
    }

    const toastId = toast.loading("Formatting Excel report...");

    try {
      const workbook = new ExcelJS.Workbook();

      const summarySheet = workbook.addWorksheet('System Overview');
      
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 30 },
        { header: 'Value', key: 'value', width: 25 },
        { header: 'Date Generated', key: 'date', width: 20 }
      ];

      const currentDate = new Date().toISOString().split('T')[0];

      summarySheet.addRows([
        { metric: 'Total Appointments', value: data.appointments, date: currentDate },
        { metric: 'Used Slots Today', value: data.used_slots, date: currentDate },
        { metric: 'Total Slots Today', value: data.total_slots, date: currentDate },
        { metric: 'System Health Score', value: `${data.health_score}%`, date: currentDate },
        { metric: 'Active Personnel', value: data.personnel, date: currentDate }
      ]);

      const summaryHeader = summarySheet.getRow(1);
      summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0b3b60' } }; // gabay-blue

      if (data.timeline_data && data.timeline_data.length > 0) {
        const timelineSheet = workbook.addWorksheet('Appointment Timeline');
        
        timelineSheet.columns = [
          { header: 'Period (Week/Month)', key: 'name', width: 25 },
          { header: 'Appointments Booked', key: 'appointments', width: 25 },
        ];

        timelineSheet.addRows(data.timeline_data);

        const timelineHeader = timelineSheet.getRow(1);
        timelineHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        timelineHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0ea5e9' } }; // gabay-teal
      }

      // --- EXPORT EXECUTION ---
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GABAY_System_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Excel report generated successfully!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Could not generate the Excel file.", { id: toastId });
    }
  };

  // --- RENDER ---
  if (isLoading || !data) return <div className="p-12 text-center text-gray-500 font-poppins">Loading Command Center...</div>;

  // Calculation for Slot Capacity Chart
  const capacityPercent = data.total_slots > 0 ? Math.round((data.used_slots / data.total_slots) * 100) : 0;
  const capacityData = [
    { name: 'Used', value: data.used_slots, color: '#0ea5e9' }, 
    { name: 'Available', value: data.total_slots - data.used_slots, color: '#e0f2fe' }
  ];

  // Helper for Filter Button Text
  const getFilterText = () => {
    if (filter === 'week') return 'This Week';
    if (filter === 'year') return 'This Year';
    return 'This Month';
  };

  // Main Dashboard Render
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
        
        <div className="flex gap-4 relative">
          {/* --- INTERACTIVE FILTER DROPDOWN --- */}
          <div className="relative">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-medium font-poppins text-sm rounded-lg hover:bg-gray-50 transition"
            >
              Filter By: {getFilterText()}
              <ChevronDown size={16} className={`transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showFilterDropdown && (
              <div className="absolute top-full mt-2 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                <button 
                  onClick={() => { setFilter('week'); setShowFilterDropdown(false); }} 
                  className={`w-full text-left px-4 py-2 text-sm font-poppins hover:bg-gray-50 ${filter === 'week' ? 'text-gabay-blue font-bold bg-blue-50/50' : 'text-gray-700'}`}
                >
                  This Week
                </button>
                <button 
                  onClick={() => { setFilter('month'); setShowFilterDropdown(false); }} 
                  className={`w-full text-left px-4 py-2 text-sm font-poppins hover:bg-gray-50 ${filter === 'month' ? 'text-gabay-blue font-bold bg-blue-50/50' : 'text-gray-700'}`}
                >
                  This Month
                </button>
                <button 
                  onClick={() => { setFilter('year'); setShowFilterDropdown(false); }} 
                  className={`w-full text-left px-4 py-2 text-sm font-poppins hover:bg-gray-50 ${filter === 'year' ? 'text-gabay-blue font-bold bg-blue-50/50' : 'text-gray-700'}`}
                >
                  This Year
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={handleGenerateReport}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gabay-teal text-white font-medium font-poppins text-sm hover:bg-gabay-teal2 transition shadow-md"
          >
            <DownloadCloud size={18} /> Export Excel Report
          </button>
        </div> 
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Appointments (Month)" value={data.appointments} icon={FileCheck} color="teal" />
        <StatCard title="Today's Slots" value={`${data.used_slots} / ${data.total_slots}`} icon={ClipboardList} color="orange" />
        <StatCard title="System Health" value={`${data.health_score}%`} icon={ShieldPlus} color="blue" />
        <StatCard title="Total Personnel" value={data.personnel} icon={Stethoscope} color="green" />
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
                <AreaChart data={data.timeline_data || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

          {/* QUICK LINKS / PERSONNEL COUNT */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <Activity className={`${metrics?.server_status === 'NORMAL' ? 'text-gabay-teal' : 'text-orange-500'} mb-3`} size={32} />
            <h4 className="font-montserrat text-lg font-bold text-gabay-blue mb-1">Live Monitoring</h4>
            <p className="text-sm font-poppins text-gray-500 mb-4">
              CPU: {metrics?.cpu_percent ?? 0}% | RAM: {metrics?.ram_percent ?? 0}% <br/>
              Latency: {metrics?.latency ?? 0}ms
            </p>
            <span className={`px-4 py-1.5 font-bold text-xs rounded-full font-poppins uppercase tracking-wide ${
              metrics?.server_status === 'NORMAL' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
            }`}>
              {metrics?.server_status === 'NORMAL' ? 'Systems Optimal' : (metrics?.server_status || 'Checking...')}
            </span>
          </div>

          {/* AUDIT LOGS */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-montserrat text-lg font-bold text-gabay-blue flex items-center gap-2">
                Recent Audit Logs <ExternalLink size={16} className="text-gray-400" />
              </h4>
              <button 
                onClick={() => navigate('/admin/audit-logs')} 
                className="text-sm text-gray-400 font-medium font-poppins hover:underline hover:text-gabay-blue transition-colors"
              >
                See all
              </button>
            </div>
            <div className="space-y-3">
              {data.recent_audits && data.recent_audits.length === 0 ? (
                 <p className="text-sm text-gray-400 font-poppins italic">No recent activity.</p>
              ) : (
                data.recent_audits?.map((log) => (
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
              {data.recent_health && data.recent_health.length === 0 ? (
                 <p className="text-sm text-gray-400 font-poppins italic">Server is running perfectly.</p>
              ) : (
                data.recent_health?.map((log) => (
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