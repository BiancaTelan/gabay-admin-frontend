import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Search, Download, Funnel, Plus, Edit3, ChevronLeft, ChevronRight, CircleMinus, CircleCheckBig, Eye, CalendarClock, X } from 'lucide-react';
import { AuthContext } from '../../authContext';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import AddDoctorModal from '../../components/AddDoctorModal';
import UserStatusModal from '../../components/UserStatusModal';
import SchedulePickerModal from '../../components/SchedulePickerModal';

export default function Personnel() {
  const { token } = useContext(AuthContext);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [doctorsData, setDoctorsData] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [viewDetailsDoctor, setViewDetailsDoctor] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedDoctorSched, setSelectedDoctorSched] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    sortKey: 'name', 
    sortOrder: 'asc', 
    status: ['Active', 'Deactivated'],
    deptFilter: '' 
  });
  const [statusModal, setStatusModal] = useState({ isOpen: false, user: null, actionType: '' });

  const itemsPerPage = 10;

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/personnel`, { headers: { 'Authorization': `Bearer ${token}` } });
      const deptRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/departments`, { headers: { 'Authorization': `Bearer ${token}` } });
      
      if (!response.ok) throw new Error('Failed to fetch personnel');
      const data = await response.json();
      setDoctorsData(data.filter(person => person.role === 'DOCTOR'));
      
      if(deptRes.ok) setDepartments(await deptRes.json());
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (token) fetchDoctors(); }, [token]);

  useEffect(() => {
    if (selectedDoctorSched) {
      const updatedDoc = doctorsData.find(d => d.raw_id === selectedDoctorSched.raw_id);
      if (updatedDoc) setSelectedDoctorSched(updatedDoc);
    }
  }, [doctorsData]);

  const executeStatusChange = async () => {
    if (!statusModal.user) return;
    setIsSubmitting(true);
    try {
      const updatedStatus = statusModal.actionType === 'deactivate' ? 'Deactivated' : 'Active';
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/doctors/${statusModal.user.raw_id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: updatedStatus })
      });
      if (!response.ok) throw new Error('Failed to update status');

      toast.success(`Account successfully ${statusModal.actionType}d!`);
      fetchDoctors(); 
      setStatusModal({ isOpen: false, user: null, actionType: '' });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSchedule = async (docId, daysStr, timeStr, maxPatients, schedId) => {
    try {
      if (schedId) {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/schedules/${schedId}`, { 
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/doctors/${docId}/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ days: daysStr, timePeriod: timeStr, maxPatients })
      });
      if(!res.ok) throw new Error("Failed to save schedule");
      fetchDoctors();
      return true;
    } catch(e) {
      toast.error(e.message);
      return false;
    }
  };

  const handleDeleteSchedule = async (schedId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/schedules/${schedId}`, { 
          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if(!res.ok) throw new Error("Failed to delete block");
      fetchDoctors();
      return true;
    } catch(e) {
      toast.error(e.message);
      return false;
    }
  };

  const filteredData = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    const searchTerms = cleanSearch ? cleanSearch.split(/\s+/) : [];
    
    let result = doctorsData.filter(item => {
      if (searchTerms.length === 0) return true;

      const name = item.name || '';
      const id = item.id || '';
      const email = item.email || '';
      const dept = item.dept || item.department || '';
      const license = item.licenseNumber || item.license_number || '';

      const searchableString = `${name} ${id} ${email} ${dept} ${license}`.toLowerCase();

      return searchTerms.every(term => searchableString.includes(term));
    });

    if (filters.status.length > 0) result = result.filter(i => filters.status.includes(i.status));
    if (filters.deptFilter) result = result.filter(item => item.dept === filters.deptFilter);

    result.sort((a, b) => {
      const valA = String(a[filters.sortKey] || '');
      const valB = String(b[filters.sortKey] || '');
      const comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [search, filters, doctorsData]);

  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      toast.error("No doctor data available to export."); return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GABAY Doctors');

    worksheet.columns = [
      { header: 'Employee ID', key: 'id', width: 15 },
      { header: 'License Number', key: 'licenseNumber', width: 25 },
      { header: 'Full Name', key: 'name', width: 30 },
      { header: 'Department', key: 'dept', width: 25 },
      { header: 'Schedule Summary', key: 'schedule', width: 35 },
      { header: 'Average Slots', key: 'slot', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    filteredData.forEach(doc => {
      worksheet.addRow({
        id: doc.id, name: doc.name, dept: doc.dept, schedule: `${doc.schedule} | ${doc.time}`,
        slot: doc.slot, licenseNumber: doc.licenseNumber, status: doc.status
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; 
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0b3b60' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => { cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }; });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GABAY_Doctors_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Excel ledger downloaded successfully!");
  };

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue">Doctor List</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">Main Menu &gt; Doctors</p>
      </div>

      <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
        <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full lg:w-96">
            <input type="text" value={search} onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}} placeholder="Search Doctors..." className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20" />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          </div>
          <button onClick={() => { setEditingDoctor(null); setIsAddModalOpen(true); }} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gabay-teal text-white font-medium font-poppins text-sm hover:bg-gabay-teal2 transition">
            <Plus size={16} /> <span className="hidden sm:inline">New Doctor</span>
          </button>
        </div>

        <div className="flex flex-row gap-2 w-full lg:w-auto">
          <button onClick={handleExportExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors">
            <Download size={16} /> Export Records
          </button>

          <div className="relative flex-1 lg:flex-none">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors">
              <Funnel size={16} /> Filter ({filters.status.length + (filters.deptFilter ? 1 : 0)})
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5 max-h-[500px] overflow-y-auto scrollbar-thin">
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Sort By</p>
                  <div className="space-y-3">
                    <div>
                      <select value={filters.sortKey} className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-gabay-blue/10" onChange={(e) => setFilters({...filters, sortKey: e.target.value})}>
                        <option value="name">Name</option>
                        <option value="id">Employee ID</option>
                      </select>
                    </div>
                    <div>
                      <select value={filters.sortOrder} className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-gabay-blue/10" onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}>
                        <option value="asc">Ascending (A-Z / 0-9)</option>
                        <option value="desc">Descending (Z-A / 9-0)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-1">Department Filter</p>
                  <select value={filters.deptFilter} className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-gabay-blue/10" onChange={(e) => { setFilters({...filters, deptFilter: e.target.value}); setCurrentPage(1); }}>
                    <option value="">All Departments</option>
                    {departments.map(d => (
                        <option key={d.deptID || d.id} value={d.department || d.name}>{d.department || d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-2"> 
                  <button onClick={() => setFilters({ sortKey: 'name', sortOrder: 'asc', status: ['Active', 'Deactivated'], deptFilter: '' })} className="flex-1 py-2 text-xs border border-gray-400 rounded-lg font-poppins font-medium text-gray-400 hover:text-red-500 transition-colors">Reset All</button>
                  <button onClick={() => setShowFilterDropdown(false)} className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium hover:bg-opacity-90 transition">Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 font-poppins">Loading doctors...</div>
        ) : (
        <div className="overflow-x-auto cursor-default">
          <table className="w-full text-left min-w-[1200px]">
            <thead className="bg-gabay-blue font-poppins text-white select-none">
              <tr>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Employee ID</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">License No.</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Name</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Department</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Schedule</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Time</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Slot</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedData.map((doc, index) => {
                const isAvailable = doc.status === 'Active';
                const isDeactivated = doc.status !== 'Active';
                
                return (
                  <tr key={doc.raw_id || `doc-${index}`} className={`hover:bg-gray-50 transition-colors ${isDeactivated ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700 font-medium">{doc.id}</td>
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700">{doc.licenseNumber || 'N/A'}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gabay-blue font-medium">{doc.name}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-700">{doc.dept}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-700">{doc.schedule}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-500">{doc.time}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-500">{doc.slot}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase md:text-[12px] font-poppins font-medium text-gray-700">
                        <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-gabay-green' : 'bg-red-500'}`} />
                        {isAvailable ? 'Available' : 'Unavailable'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setViewDetailsDoctor(doc)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Details"><Eye size={18}/></button>
                        
                        <button onClick={() => { setEditingDoctor(doc); setIsAddModalOpen(true); }} className="p-1.5 text-gabay-teal hover:bg-teal-50 rounded-lg transition-colors" title="Edit Doctor Profile"><Edit3 size={18}/></button>
                        
                        <button onClick={() => { setSelectedDoctorSched(doc); setIsScheduleModalOpen(true); }} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Manage Schedule & Slots"><CalendarClock size={18}/></button>
                        
                        {isDeactivated ? (
                            <button onClick={() => setStatusModal({ isOpen: true, user: doc, actionType: 'activate' })} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Activate Account"><CircleCheckBig size={18}/></button>
                          ) : (
                            <button onClick={() => setStatusModal({ isOpen: true, user: doc, actionType: 'deactivate' })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Deactivate Account"><CircleMinus size={18}/></button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>)}

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 transition-all"><ChevronLeft size={20} /></button>
            <span className="text-xs font-bold text-gray-500">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 transition-all"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {viewDetailsDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 font-poppins">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-xl font-bold text-gabay-blue">Doctor Overview</h2>
              <button onClick={() => setViewDetailsDoctor(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Doctor DB-ID</span><span className="text-gray-800 font-medium">{viewDetailsDoctor.docID}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Employee ID</span><span className="text-gray-800 font-medium">{viewDetailsDoctor.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">PRC License Number</span><span className="text-gray-800 font-medium">{viewDetailsDoctor.licenseNumber || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Full Name</span><span className="text-gray-800 font-medium">{viewDetailsDoctor.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Email Address</span><span className="text-gray-800 font-medium">{viewDetailsDoctor.email || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Contact No.</span><span className="text-gray-800 font-medium">{viewDetailsDoctor.phone || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Department</span><span className="text-gray-800 font-medium">{viewDetailsDoctor.dept}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Average Slots</span><span className="text-gray-800 font-medium">{viewDetailsDoctor.slot}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Status</span><span className={`font-bold ${viewDetailsDoctor.status === 'Active' ? 'text-gabay-green' : 'text-red-500'}`}>{viewDetailsDoctor.status}</span></div>
            </div>

            <div className="mt-8 pt-4 border-t text-center">
              <button onClick={() => setViewDetailsDoctor(null)} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      <AddDoctorModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchDoctors} 
        editData={editingDoctor} 
      />

      <SchedulePickerModal 
        isOpen={isScheduleModalOpen} 
        onClose={() => setIsScheduleModalOpen(false)} 
        doctor={selectedDoctorSched ? { ...selectedDoctorSched, id: selectedDoctorSched.raw_id } : null} 
        onSave={handleSaveSchedule} 
        onDelete={handleDeleteSchedule} 
      />

      <UserStatusModal
        isOpen={statusModal.isOpen}
        user={statusModal.user}
        actionType={statusModal.actionType}
        isSubmitting={isSubmitting}
        onClose={() => setStatusModal({ isOpen: false, user: null, actionType: '' })}
        onConfirm={executeStatusChange}
       />
    </div>
  );
}