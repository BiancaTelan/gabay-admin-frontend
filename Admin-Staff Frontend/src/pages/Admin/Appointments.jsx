import React, { useState, useMemo, useEffect, useContext } from 'react';
import { 
  Search, Download, Funnel, Plus, 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, Clock, User 
} from 'lucide-react';
import { AuthContext } from '../../authContext';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';

const statusStyles = {
  Approved: 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-50 text-gabay-green',
  Cancelled: 'bg-red-50 text-gabay-red',
  Pending: 'bg-gray-100 text-gray-400',
};

export default function Appointments() {
  const { token } = useContext(AuthContext);

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  
  const [appointmentData, setAppointmentData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filters, setFilters] = useState({
    sortKey: 'id',
    sortOrder: 'desc',
    statuses: ['Pending', 'Approved', 'Completed', 'Cancelled'],
    deptTypes: ['General', 'Specialty']
  });

  

  const itemsPerPage = 10;

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/admin/appointments`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch appointments');
        
        const data = await response.json();
        setAppointmentData(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchAppointments();
  }, [token]);


  // --- 2. LOGIC: FILTERING & SORTING ---
  const filteredData = useMemo(() => {
    let result = appointmentData.filter(item => 
      item.patient.toLowerCase().includes(search.toLowerCase()) || 
      item.doctor.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      (item.hospitalNum && item.hospitalNum.includes(search))
    );

    if (filters.statuses.length > 0) result = result.filter(i => filters.statuses.includes(i.status));
    
    if (filters.deptTypes.length > 0) {
      result = result.filter(i => {
        const type = i.isSpecialty ? 'Specialty' : 'General';
        return filters.deptTypes.includes(type);
      });
    }

    result.sort((a, b) => {
      const valA = String(a[filters.sortKey] || '');
      const valB = String(b[filters.sortKey] || '');
      const comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [search, filters, appointmentData]);

  // --- 3. EXPORT TO EXCEL ---
  const handleExportExcel = async () => {
    if (filteredData.length === 0) return toast.error("No appointments to export.");
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Appointments');
    
    worksheet.columns = [
      { header: 'Appt ID', key: 'id', width: 15 },
      { header: 'Hospital #', key: 'hosp', width: 15 },
      { header: 'Patient Name', key: 'patient', width: 25 },
      { header: 'Doctor', key: 'doctor', width: 25 },
      { header: 'Department', key: 'dept', width: 25 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Time', key: 'time', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Action By', key: 'approvedBy', width: 25 },
      { header: 'Cancel Reason', key: 'reason', width: 40 }
    ];

    filteredData.forEach(app => {
      worksheet.addRow({
        id: app.id, hosp: app.hospitalNum, patient: app.patient, 
        doctor: app.doctor, dept: app.dept, date: app.date, 
        time: app.time, status: app.status,
        approvedBy: app.approvedBy || 'N/A',
        reason: app.cancelReason || 'N/A'
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
    link.setAttribute('download', `GABAY_Appointments_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Excel report generated!");
  };

  // --- 4. LOGIC: PAGINATION & SELECTION ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const entryStart = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, filteredData.length);

  const handleSelectAll = (e) => e.target.checked ? setSelectedIds(pagedData.map(i => i.id)) : setSelectedIds([]);
  const toggleSelection = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue tracking-tight">Appointments Management</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">Main Menu &gt; Appointments</p>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
        <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96">
            <input 
              type="text" value={search}
              onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}}
              placeholder="Search Appointments..." 
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          </div>
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
              <Funnel size={16} /> Filter ({filters.statuses.length + filters.deptTypes.length})
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl p-5 space-y-5 max-h-[500px] overflow-y-auto z-50">
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Sort By</p>
                  <div className="space-y-3">
                    <select 
                      value={filters.sortKey}
                      className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:border-gabay-blue"
                      onChange={(e) => setFilters({...filters, sortKey: e.target.value})}
                    >
                      <option value="id">Appointment ID</option>
                      <option value="dept">Department</option>
                      <option value="date">Date</option>
                    </select>
                    <select 
                      value={filters.sortOrder}
                      className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:border-gabay-blue"
                      onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}
                    >
                      <option value="asc">Ascending (A-Z)</option>
                      <option value="desc">Descending (Z-A)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Pending', 'Approved', 'Completed', 'Cancelled'].map(s => (
                      <label key={s} className="flex items-center gap-2 text-sm font-poppins cursor-pointer group">
                        <input type="checkbox" checked={filters.statuses.includes(s)} onChange={(e) => {
                          const newStatus = e.target.checked ? [...filters.statuses, s] : filters.statuses.filter(x => x !== s);
                          setFilters({...filters, statuses: newStatus});
                        }} className="w-4 h-4 rounded accent-gabay-blue" />
                        <span className="text-gray-600 group-hover:text-gabay-blue transition-colors">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Department Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['General', 'Specialty'].map(type => (
                      <label key={type} className="flex items-center gap-2 text-sm font-poppins cursor-pointer group">
                        <input type="checkbox" checked={filters.deptTypes.includes(type)} onChange={(e) => {
                          const newTypes = e.target.checked ? [...filters.deptTypes, type] : filters.deptTypes.filter(x => x !== type);
                          setFilters({...filters, deptTypes: newTypes});
                        }} className="w-4 h-4 rounded accent-gabay-blue" />
                        <span className="text-gray-600 group-hover:text-gabay-blue transition-colors">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button onClick={() => setFilters({ sortKey: 'id', sortOrder: 'desc', statuses: [], deptTypes: [] })} 
                  className="flex-1 py-2 text-xs font-poppins font-medium border border-gray-400 rounded-lg text-gray-400 hover:text-red-500 transition-colors">Reset All</button>
                  <button onClick={() => setShowFilterDropdown(false)} 
                  className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium shadow-md hover:bg-opacity-90 transition-all">Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 font-poppins">Loading appointments...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-gabay-blue font-poppins text-white select-none">
                <tr>
                  <th className="px-4 py-4 text-center">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedIds.length === pagedData.length && pagedData.length > 0}
                      className="w-4 h-4 bg-gabay-blue"
                    />
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Appointment ID</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Hospital #</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Patient Name</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Doctor</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Department</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedData.map((app) => (
                  <React.Fragment key={app.id}>
                    <tr className={`hover:bg-gray-50 transition-colors ${expandedId === app.id ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-4 py-4 text-center"><input 
                        type="checkbox" checked={selectedIds.includes(app.id)} 
                        onChange={() => toggleSelection(app.id)} className="w-4 h-4 accent-gabay-blue" />
                      </td>
                      <td className="px-4 py-4 text-sm font-poppins text-gray-700 font-medium">{app.id}</td>
                      <td className="px-4 py-4 text-sm font-poppins text-gray-700 font-base">{app.hospitalNum}</td>
                      <td className="px-4 py-4 text-sm font-poppins font-medium text-gabay-blue">{app.patient}</td>
                      <td className="px-4 py-4 text-sm font-poppins text-gray-700">{app.doctor}</td>
                      <td className="px-4 py-4 text-sm font-poppins text-gabay-teal font-medium">{app.dept}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-4 py-0.5 rounded-full text-[11px] font-poppins font-bold ${statusStyles[app.status] || statusStyles['Pending']}`}>
                          {app.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                          className="text-gray-400 hover:text-gabay-blue transition-colors"
                        >
                          {expandedId === app.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                        </button>
                      </td>
                    </tr>
                    {expandedId === app.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan="8" className="px-10 py-5 border-l-4 border-gabay-blue bg-white shadow-inner">
                          <div className="flex flex-col gap-4">
                            
                            {/* DETAILS GRID (Full Width) */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              <div className="space-y-2 text-xs font-poppins">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Schedule Details:</p>
                                <span className="flex items-center gap-2 text-gray-700 font-medium"><Calendar size={14}/> {app.date}</span>
                                <span className="flex items-center gap-2 text-gray-700 font-medium"><Clock size={14}/> {app.time}</span>
                              </div>
                              <div className="space-y-2 text-xs font-poppins">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Action Taken By:</p>
                                <span className="flex items-center gap-2 text-gray-700 font-medium"><User size={14}/> {app.approvedBy || '--'}</span>
                                <span className="flex items-center gap-2 text-gray-700 font-medium"><Calendar size={14}/> {app.approvedDate || '--'}</span>
                              </div>
                              <div className="space-y-2 text-xs font-poppins">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Record:</p>
                                <span className="text-gray-700 font-medium">Created: {app.lastUpdate}</span>
                              </div>
                            </div>
                            
                            {app.status === 'Cancelled' && (
                              <div className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg w-full">
                                <p className="text-[10px] font-bold text-red-400 uppercase">Cancellation Reason:</p>
                                <p className="text-xs font-medium text-red-700 mt-1">"{app.cancelReason || "No reason provided in system."}"</p>
                              </div>
                            )}

                          </div>
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
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)} 
              className="p-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={20}/>
            </button>
            <div className="flex gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentPage(i + 1)} 
                  className={`w-8 h-8 rounded-lg text-xs font-poppins font-bold transition-all ${
                    currentPage === i + 1 ? 'bg-gabay-blue text-white shadow-md' : 'hover:bg-white border border-transparent hover:border-gray-200 text-gray-500'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              disabled={currentPage === totalPages || totalPages === 0} 
              onClick={() => setCurrentPage(p => p + 1)} 
              className="p-1.5 rounded hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={20}/>
            </button>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 font-poppins font-medium">
            Showing {entryStart} - {entryEnd} of {filteredData.length} entries
          </p>
        </div>
      </div>
    </div>
  );
}