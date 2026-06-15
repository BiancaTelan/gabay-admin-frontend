import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Search, Download, Funnel, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthContext } from '../../authContext'; 
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';

// --- ROLE BADGE STYLES ---
const roleStyles = {
  STAFF: 'bg-teal-100 text-teal-700',
  ADMIN: 'bg-blue-100 text-blue-700'
};

const ACTION_OPTIONS = [
  'Update', 'Create', 'Insert', 'Book', 'Approved', 
  'Deny', 'Delete', 'Cancel', 'Deactivated', 'Reactivated'
];

export default function AuditLogs() {
  const { token } = useContext(AuthContext);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [logsData, setLogsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    sortOrder: 'desc', 
    roles: ['STAFF', 'ADMIN'],
    timeline: 'All',
    actionTypes: [] 
  });

  const itemsPerPage = 10;

  // --- FETCH AUDIT LOGS ---
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/logs`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Failed to fetch audit logs');
        
        const data = await response.json();
        setLogsData(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchLogs();
  }, [token]);

  // --- FILTERING & SORTING ---
  const filteredData = useMemo(() => {
    let result = logsData.filter(item => 
      (item.user && item.user.toLowerCase().includes(search.toLowerCase())) ||
      (item.target && item.target.toLowerCase().includes(search.toLowerCase())) ||
      (item.action && item.action.toLowerCase().includes(search.toLowerCase())) ||
      (item.date && item.date.includes(search))
    );

    if (filters.roles.length > 0) {
      result = result.filter(i => filters.roles.includes(i.role));
    }

    if (filters.actionTypes.length > 0) {
      result = result.filter(item => {
         const act = item.action.toUpperCase();
         const desc = item.description.toUpperCase();
         return filters.actionTypes.some(filterAct => {
            const f = filterAct.toUpperCase();
            if ((f === 'CREATE' || f === 'INSERT') && (act === 'INSERT' || desc.includes('CREATED') || desc.includes('ADDED'))) return true;
            if (f === 'CANCEL' && (desc.includes('CANCEL') || act === 'DENY')) return true;
            if (f === 'DEACTIVATED' && desc.includes('DEACTIVATED')) return true;
            if (f === 'REACTIVATED' && desc.includes('REACTIVATED')) return true;
            if (f === 'APPROVED' && act === 'APPROVE') return true;
            if (f === 'DELETE' && act === 'DELETE') return true;
            if (f === 'UPDATE' && act === 'UPDATE') return true;
            if (f === 'BOOK' && act === 'BOOK') return true;
            if (f === 'DENY' && act === 'DENY') return true;
            return false;
         });
      });
    }

    if (filters.timeline !== 'All') {
      const now = new Date();
      result = result.filter(item => {
        if (!item.rawDate) return false;
        
        const itemDate = new Date(item.rawDate);
        
        if (filters.timeline === 'Today') {
          return itemDate.toDateString() === now.toDateString();
        }
        if (filters.timeline === 'This Week') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay()); 
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          return itemDate >= startOfWeek && itemDate <= endOfWeek;
        }
        if (filters.timeline === 'This Month') {
          return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
        }
        if (filters.timeline === 'This Year') {
          return itemDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Sort Order
    result.sort((a, b) => {
      const valA = new Date(a.rawDate || `${a.date} ${a.time}`);
      const valB = new Date(b.rawDate || `${b.date} ${b.time}`);
      return filters.sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [search, filters, logsData]); 

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      toast.error("No logs to export.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('System Audit Logs');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 15 },
      { header: 'User', key: 'user', width: 25 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Action', key: 'action', width: 15 },
      { header: 'Target', key: 'target', width: 25 },
      { header: 'Description', key: 'description', width: 50 }
    ];

    filteredData.forEach(log => {
      worksheet.addRow({
        date: log.date,
        time: log.time,
        user: log.user,
        role: log.role,
        action: log.action,
        target: log.target,
        description: log.description
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
    link.setAttribute('download', `GABAY_AuditLogs_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success("Audit Log report generated!");
  };

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const entryStart = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, filteredData.length);

  const toggleSelection = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue tracking-tight">Audit Logs</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">System &gt; Audit Logs</p>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
        <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96">
            <input 
              type="text" 
              value={search}
              onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}}
              placeholder="Search by Target, User, or Action..." 
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        <div className="flex flex-row gap-2 w-full lg:w-auto">
          <button 
            onClick={handleExportExcel}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors"
          >
            <Download size={16} /> Export as Excel
          </button>
          
          <div className="relative flex-1 lg:flex-none">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors"
            >
              <Funnel size={16} /> Filter ({filters.roles.length + filters.actionTypes.length + (filters.timeline !== 'All' ? 1 : 0)})
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5 max-h-[500px] overflow-y-auto scrollbar-thin">
                
                {/* TIMELINE FILTER */}
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-2">Timeline</p>
                  <select 
                    value={filters.timeline}
                    className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:border-gabay-blue bg-white"
                    onChange={(e) => setFilters({...filters, timeline: e.target.value})}
                  >
                    <option value="All">All Time</option>
                    <option value="Today">Today</option>
                    <option value="This Week">This Week</option>
                    <option value="This Month">This Month</option>
                    <option value="This Year">This Year</option>
                  </select>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Sort Order</p>
                  <select 
                    value={filters.sortOrder}
                    className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:border-gabay-blue bg-white"
                    onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}
                  >
                    <option value="desc">By Newest Date</option>
                    <option value="asc">By Oldest Date</option>
                  </select>
                </div>

                {/* ROLE FILTER */}
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">User Role</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['STAFF', 'ADMIN'].map(role => (
                      <label key={role} className="flex items-center gap-2 text-sm font-poppins text-gray-600 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={filters.roles.includes(role)}
                          onChange={(e) => {
                            const newRoles = e.target.checked ? [...filters.roles, role] : filters.roles.filter(x => x !== role);
                            setFilters({...filters, roles: newRoles});
                          }}
                          className="w-4 h-4 rounded accent-gabay-blue"
                        /> {role}
                      </label>
                    ))}
                  </div>
                </div>

                {/* ACTION FILTER */}
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Action Taken</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ACTION_OPTIONS.map(act => (
                      <label key={act} className="flex items-center gap-2 text-sm font-poppins text-gray-600 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={filters.actionTypes.includes(act)}
                          onChange={(e) => {
                            const newActs = e.target.checked ? [...filters.actionTypes, act] : filters.actionTypes.filter(x => x !== act);
                            setFilters({...filters, actionTypes: newActs});
                          }}
                          className="w-4 h-4 rounded accent-gabay-blue"
                        /> {act}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button onClick={() => setFilters({ sortOrder: 'desc', roles: [], actionTypes: [], timeline: 'All' })} 
                  className="flex-1 py-2 text-xs font-poppins font-medium border border-gray-400 rounded-lg text-gray-400 hover:text-red-500 transition-colors">Reset</button>
                  <button onClick={() => setShowFilterDropdown(false)} 
                  className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium shadow-md hover:bg-opacity-90">Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 font-poppins">
            Loading personnel data...
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-gabay-blue font-poppins text-white select-none">
              <tr>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Date</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center">Role</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">User</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Action</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Target</th>
                <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedData.map((log) => (
                <tr key={log.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(log.id) ? 'bg-blue-50/50' : ''}`} onClick={() => toggleSelection(log.id)}>
                  <td className="px-4 py-4 text-xs font-poppins text-gabay-blue font-medium min-w-[120px]">
                    {log.date} <br/> <span className="text-gray-400 font-normal">{log.time}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-3 py-0.5 rounded-full text-[10px] font-poppins font-bold tracking-wider ${roleStyles[log.role]}`}>
                      {log.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-poppins font-medium text-blue-600 min-w-[150px]">{log.user}</td>
                  <td className="px-4 py-4 text-sm text-gray-700 font-poppins font-semibold">{log.action}</td>
                  <td className="px-4 py-4 text-sm text-gabay-teal font-medium font-poppins min-w-[150px]">{log.target}</td>
                  <td className="px-4 py-4 text-sm text-gray-500 font-poppins min-w-[300px]">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>)}

        {/* PAGINATION */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 transition-all"><ChevronLeft size={20}/></button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} 
                  className={`w-8 h-8 rounded-lg text-xs font-poppins font-bold transition-all ${currentPage === i + 1 ? 'bg-gabay-blue text-white shadow-md' : 'hover:bg-white text-gray-500'}`}>
                  {i + 1}
                </button>
              ))}
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 transition-all"><ChevronRight size={20}/></button>
           </div>
           <p className="text-[10px] md:text-xs text-gray-400 font-poppins font-medium">Showing {entryStart} - {entryEnd} of {filteredData.length} entries</p>
        </div>
      </div>
    </div>
  );
}