import React, { useState, useMemo, useEffect, useContext } from 'react';
import { 
  Search, Download, Funnel, ChevronLeft, ChevronRight, 
  ChevronDown, ChevronUp, Server, Activity, AlertCircle, Database 
} from 'lucide-react';
import { AuthContext } from '../../authContext';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';

const priorityStyles = {
  CRITICAL: 'bg-red-100 text-red-500 border-red-200',
  HIGH: 'bg-orange-50 text-orange-400 border-orange-200',
  MEDIUM: 'bg-teal-50 text-gabay-teal border-teal-100',
  LOW: 'bg-green-50 text-green-500 border-green-100',
};

export default function SystemLogs() {
  const { token } = useContext(AuthContext);

  // --- STATES ---
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [hardware, setHardware] = useState({
    latency: 0, disk_percent: 0, disk_used_gb: 0, disk_total_gb: 0, server_status: 'LOADING...'
  });
  
  const [systemData, setSystemData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState({
    sortKey: 'date',
    sortOrder: 'desc',
    priorities: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    issueType: 'All'
  });

  const itemsPerPage = 10;

  // --- FETCH DATA & LIVE METRICS ---
  useEffect(() => {
    const fetchHealthLogs = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/admin/health-logs`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch system logs');
        
        const data = await response.json();
        setSystemData(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchHealthLogs();

    // Simulated Server Latency Heartbeat
    // --- REAL-TIME HARDWARE POLLING ---
    const fetchHardware = async () => {
      if (!token) return;
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/admin/system-metrics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHardware(data);
        }
      } catch (error) {
        setHardware(prev => ({...prev, server_status: 'DISCONNECTED', latency: 'ERR'}));
      }
    };

    fetchHardware(); // Fetch immediately on load
    const interval = setInterval(fetchHardware, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
    
  }, [token]);

  const criticalErrorCount = systemData.filter(i => i.priority === 'CRITICAL').length;

  // --- LOGIC: FILTERING & SORTING ---
  const filteredData = useMemo(() => {
    let result = systemData.filter(item => 
      item.type.toLowerCase().includes(search.toLowerCase()) || 
      item.module.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.date.includes(search)
    );

    if (filters.priorities.length > 0) {
      result = result.filter(i => filters.priorities.includes(i.priority));
    }

    if (filters.issueType !== 'All') {
      result = result.filter(i => i.type === filters.issueType);
    }

    result.sort((a, b) => {
      let valA, valB;

      if (filters.sortKey === 'date') {
        valA = new Date(`${a.date} ${a.time}`);
        valB = new Date(`${b.date} ${b.time}`);
      } else if (filters.sortKey === 'priority') {
        const priorityWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        valA = priorityWeight[a.priority] || 0;
        valB = priorityWeight[b.priority] || 0;
      }

      return filters.sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    return result;
  }, [search, filters, systemData]);

  // --- EXPORT TO EXCEL LOGIC ---
  const handleExportExcel = async () => {
    if (filteredData.length === 0) return toast.error("No logs to export.");
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('System Health Logs');
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 15 },
      { header: 'Issue Type', key: 'type', width: 20 },
      { header: 'Module', key: 'module', width: 25 },
      { header: 'Priority', key: 'priority', width: 15 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Recommended Action', key: 'action', width: 50 }
    ];

    filteredData.forEach(log => {
      worksheet.addRow({
        date: log.date, time: log.time, type: log.type, module: log.module,
        priority: log.priority, description: log.description, action: log.actions
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0b3b60' } };
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GABAY_System_Health_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("System Health report generated!");
  };

  // --- PAGINATION ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const entryStart = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, filteredData.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue tracking-tight">System Logs</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">System &gt; System Logs</p>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
        <div className="relative w-full lg:w-96">
          <input 
            type="text" value={search} onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}}
            placeholder="Search System Logs..." 
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20"
          />
          <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
        </div>
        <div className="flex flex-row gap-2 w-full lg:w-auto">
          <button onClick={handleExportExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors">
            <Download size={16} /> Export as Excel
          </button>

          <div className="relative flex-1 lg:flex-none">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)} 
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors"
            >
              <Funnel size={16} /> 
              Filter ({filters.priorities.length + (filters.issueType !== 'All' ? 1 : 0)})
            </button>

            {/* DROPDOWN MENU */}
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5 max-h-[500px] overflow-y-auto">
                
                {/* 1. SORT BY SECTION */}
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Sort By</p>
                  <div className="space-y-3">
                    <div>
                      <select 
                        value={filters.sortKey}
                        className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-gabay-blue/10"
                        onChange={(e) => setFilters({...filters, sortKey: e.target.value})}
                      >
                        <option value="date">Date</option>
                        <option value="priority">Priority Level</option>
                      </select>
                    </div>
                    <div>
                      <select 
                        value={filters.sortOrder}
                        className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-gabay-blue/10"
                        onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}
                      >
                        <option value="desc">By Newest / High Priority</option>
                        <option value="asc">By Oldest / Low Priority</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. ISSUE TYPE SECTION */}
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Issue Type</p>
                  <select 
                    value={filters.issueType}
                    className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-gabay-blue/10"
                    onChange={(e) => setFilters({...filters, issueType: e.target.value})}
                  >
                    <option value="All">All Types</option>
                    <option value="Performance">Performance</option>
                    <option value="Security">Security</option>
                    <option value="Storage">Storage</option>
                    <option value="Memory">Memory</option>
                    <option value="Report">Report</option>
                  </select>
                </div>

                {/* 3. PRIORITY LEVEL SECTION */}
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Priority Level</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                      <label key={p} className="flex items-center gap-2 text-sm font-poppins text-gray-600 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={filters.priorities.includes(p)}
                          onChange={(e) => {
                            const newP = e.target.checked 
                              ? [...filters.priorities, p] 
                              : filters.priorities.filter(x => x !== p);
                            setFilters({...filters, priorities: newP});
                          }}
                          className="w-4 h-4 rounded accent-gabay-blue"
                        /> 
                        <span className="group-hover:text-gabay-blue transition-colors">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-2 flex gap-2">
                  <button 
                    onClick={() => setFilters({ sortKey: 'date', sortOrder: 'desc', priorities: [], issueType: 'All' })} 
                    className="flex-1 py-2 text-xs font-poppins font-medium border border-gray-400 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Reset All
                  </button>
                  <button 
                    onClick={() => setShowFilterDropdown(false)} 
                    className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium shadow-md hover:bg-opacity-90 transition-all"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DASHBOARD CARDS */}
      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard 
          icon={<Server className={hardware.server_status === 'NORMAL' ? "text-green-500" : "text-red-500"}/>} 
          label="Server Status" 
          value={hardware.server_status} 
        />
        <StatusCard 
          icon={<Activity className="text-blue-500"/>} 
          label="Database Latency" 
          value={`${hardware.latency}ms`} 
        />
        <StatusCard 
          icon={<AlertCircle className="text-red-500"/>} 
          label="Critical Errors" 
          value={`${criticalErrorCount} ERRORS`} 
          color="text-red-500" 
        />
        <StatusCard 
          icon={<Database className="text-gabay-teal"/>} 
          label="Storage Space" 
          value={`${hardware.disk_percent}% (${hardware.disk_used_gb} GB / ${hardware.disk_total_gb} GB)`} 
        />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 font-poppins">Loading infrastructure health data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-gabay-blue text-white font-poppins text-[12px] uppercase">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Issue Type</th>
                  <th className="px-6 py-4">Affected Module</th>
                  <th className="px-6 py-4 text-center">Priority Level</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-poppins">
                {pagedData.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-gabay-blue">{log.date}<br/><span className="text-gray-400 font-normal">{log.time}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-700">{log.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 italic">{log.module}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-6 py-0.5 rounded-full text-[10px] font-bold border ${priorityStyles[log.priority]}`}>{log.priority}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[300px]">{log.description}</td>
                      <td className="px-4 py-4">
                        <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                          {expandedId === log.id ? <ChevronUp size={20} className="text-gray-400"/> : <ChevronDown size={20} className="text-gray-400"/>}
                        </button>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan="6" className="px-10 py-4 border-l-4 border-gabay-blue">
                          <p className="text-sm text-gray-700 mb-2">{log.description}</p>
                          <p className="text-[11px] font-bold text-gabay-teal uppercase">Recommended Actions: <span className="font-medium normal-case text-gray-600">{log.actions}</span></p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* PAGINATION */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 rounded hover:bg-white disabled:opacity-30 border border-transparent hover:border-gray-200 transition-all"><ChevronLeft size={20}/></button>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-poppins font-bold transition-all ${currentPage === i + 1 ? 'bg-gabay-blue text-white shadow-md' : 'hover:bg-white border border-transparent hover:border-gray-200 text-gray-500'}`}>
                {i + 1}
              </button>
            ))}
            <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 rounded hover:bg-white disabled:opacity-30 border border-transparent hover:border-gray-200 transition-all"><ChevronRight size={20}/></button>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 font-poppins font-medium">Showing {entryStart} - {entryEnd} of {filteredData.length} entries</p>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon, label, value, color = "text-gray-800" }) {
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center gap-4">
      <div className="p-3 bg-gray-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">{label}</p>
        <p className={`text-sm font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}