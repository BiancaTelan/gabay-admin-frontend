import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Search, Download, Funnel, Plus, Edit3, Eye, CheckCircle2, MinusCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AuthContext } from '../../authContext'; 
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import AddPersonnelModal from '../../components/AddPersonnelModal';
import UserStatusModal from '../../components/UserStatusModal';

export default function Users() {
  const { token } = useContext(AuthContext);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [staffData, setStaffData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [viewDetailsUser, setViewDetailsUser] = useState(null);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    user: null,
    actionType: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    sortKey: 'name', sortOrder: 'asc', roles: ['STAFF', 'ADMIN'], statuses: ['Active', 'Deactivated']
  });

  const itemsPerPage = 10;

  const fetchStaff = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/personnel`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch personnel');
      const data = await response.json();
      const onlyStaff = data.filter(person => person.role !== 'DOCTOR');
      setStaffData(onlyStaff);
    } catch (error) {
      toast.error("Could not load staff directory.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (token) fetchStaff(); }, [token]);

  const confirmStatusChange = (rawId, name, actionType) => {
    setStatusModal({ isOpen: true, user: { rawId, name }, actionType });
  };

  const executeStatusChange = async () => {
    if (!statusModal.user) return;
    setIsSubmitting(true); 

    const { rawId, name } = statusModal.user;
    const isDeactivating = statusModal.actionType === 'deactivate';

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${rawId}/status`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: isDeactivating ? 'Deactivated' : 'Active' })
      });

      if (!response.ok) throw new Error(`Failed to update status.`);
      toast.success(`${name} ${isDeactivating ? 'deactivated' : 'reactivated'} successfully!`);
      setStatusModal({ isOpen: false, user: null, actionType: '' });
      fetchStaff(); 
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    
    let result = staffData.filter(item => 
      (item.name && item.name.toLowerCase().includes(lowerSearch)) || 
      (item.id && String(item.id).toLowerCase().includes(lowerSearch)) ||
      (item.email && item.email.toLowerCase().includes(lowerSearch)) ||
      (item.phone && String(item.phone).toLowerCase().includes(lowerSearch))
    );
    
    if (filters.roles.length > 0) result = result.filter(i => filters.roles.includes(i.role));
    if (filters.statuses.length > 0) result = result.filter(i => filters.statuses.includes(i.status));

    result.sort((a, b) => {
      const valA = String(a[filters.sortKey] || '');
      const valB = String(b[filters.sortKey] || '');
      const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return filters.sortOrder === 'asc' ? comp : -comp;
    });

    return result;
  }, [search, filters, staffData]);

  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      toast.error("No staff data available to export."); return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GABAY Personnel');

    worksheet.columns = [
      { header: 'EmployeeID', key: 'id', width: 15 },
      { header: 'System Role', key: 'role', width: 15 },
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'Schedule', key: 'schedule', width: 20 },
      { header: 'Working Hours', key: 'time', width: 20 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    filteredData.forEach(user => {
      worksheet.addRow({
        id: user.id, role: user.role, name: user.name,
        schedule: user.schedule, time: user.time, status: user.status
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
    link.setAttribute('download', `GABAY_Personnel_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Excel ledger downloaded successfully!");
  };

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue">Personnel Directory</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">Main Menu &gt; System Personnel</p>
      </div>

      <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
        <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full lg:w-96">
            <input type="text" value={search} onChange={(e) => {
              setSearch(e.target.value); 
              setCurrentPage(1); 
            }} 
            placeholder="Search Personnel..." 
            className="w-full pl-4 pr-10 py-2 border rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          </div>
          <button onClick={() => { setSelectedPersonnel(null); setIsAddModalOpen(true); }} className="whitespace-nowrap flex items-center gap-2 px-5 py-2 rounded-full bg-gabay-teal text-white font-medium text-sm hover:bg-opacity-90 transition">
            <Plus size={16} /> Add Personnel
          </button>
        </div>

        <div className="flex flex-row gap-2 w-full lg:w-auto">
          <button onClick={handleExportExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors">
            <Download size={16} /> Export Records
          </button>

          <div className="relative flex-1 lg:flex-none">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors">
              <Funnel size={16} /> Filter ({filters.roles.length + filters.statuses.length})
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-2">Sort By</p>
                  <div className="flex flex-col gap-2">
                    <select value={filters.sortKey} className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:ring-2 focus:ring-gabay-blue/10" onChange={(e) => setFilters({...filters, sortKey: e.target.value})}>
                      <option value="name">Name</option><option value="id">Employee ID</option>
                    </select>
                    <select value={filters.sortOrder} className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:ring-2 focus:ring-gabay-blue/10" onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}>
                      <option value="asc">Ascending (A-Z)</option><option value="desc">Descending (Z-A)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-2">Role</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['STAFF', 'ADMIN'].map(r => (
                      <label key={r} className="flex items-center gap-2 text-sm text-gray-600 font-poppins cursor-pointer">
                        <input type="checkbox" checked={filters.roles.includes(r)} onChange={(e) => {
                            const newRoles = e.target.checked ? [...filters.roles, r] : filters.roles.filter(x => x !== r);
                            setFilters({...filters, roles: newRoles});
                          }} className="w-4 h-4 rounded accent-gabay-blue" /> {r}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-2">Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Active', 'Deactivated'].map(s => (
                      <label key={s} className="flex items-center gap-2 text-sm text-gray-600 font-poppins cursor-pointer">
                        <input type="checkbox" checked={filters.statuses.includes(s)} onChange={(e) => {
                            const newStatus = e.target.checked ? [...filters.statuses, s] : filters.statuses.filter(x => x !== s);
                            setFilters({...filters, statuses: newStatus});
                          }} className="w-4 h-4 rounded accent-gabay-blue" /> {s}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2"> 
                  <button onClick={() => setFilters({ sortKey: 'name', sortOrder: 'asc', roles: [], statuses: [] })} className="flex-1 py-2 text-xs border border-gray-400 rounded-lg font-poppins font-medium text-gray-400 hover:text-red-500 transition-colors">Reset All</button>
                  <button onClick={() => setShowFilterDropdown(false)} className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium hover:bg-opacity-90 transition">Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Loading directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
              <thead className="bg-gabay-blue font-poppins text-white select-none">
                <tr>
                  <th className="px-4 py-4 text-xs font-bold uppercase">Employee ID</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase">System Role</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase">Name</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase">Email</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase min-w-[120px]">Contact No.</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase">Schedule</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase">Time</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase">Status</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedData.map((user) => {
                  const isDeactivated = user.status === 'Deactivated';
                  return (
                    <tr key={user.id} className={`hover:bg-gray-50 ${isDeactivated ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-4 text-sm text-gray-700 font-medium">{user.id}</td>
                      <td className="px-4 py-4">
                        <span className={`px-4 py-1 text-xs font-bold rounded-full ${user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gabay-blue font-medium">{user.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{user.email || 'N/A'}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{user.phone || 'N/A'}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{user.schedule}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{user.time}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs uppercase font-medium text-gray-700">
                          <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-gabay-green' : 'bg-gray-400'}`} />
                          {user.status}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => setViewDetailsUser(user)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Details"><Eye size={18}/></button>
                          <button onClick={() => { setSelectedPersonnel(user); setIsAddModalOpen(true); }} className="p-1.5 text-gabay-teal hover:bg-teal-50 rounded-lg transition-colors" title="Edit Staff"><Edit3 size={18}/></button>
                          {isDeactivated ? (
                            <button onClick={() => confirmStatusChange(user.raw_id, user.name, 'reactivate')} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg" title="Reactivate"><CheckCircle2 size={18}/></button>
                          ) : (
                            <button onClick={() => confirmStatusChange(user.raw_id, user.name, 'deactivate')} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Deactivate"><MinusCircle size={18}/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table> 
          </div>
        )}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 rounded-lg border hover:bg-white disabled:opacity-30 transition"><ChevronLeft size={18}/></button>
            <span className="text-xs font-bold text-gray-500">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 rounded-lg border hover:bg-white disabled:opacity-30 transition"><ChevronRight size={18}/></button>
          </div>
        </div>
      </div>

      {viewDetailsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 font-poppins">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h2 className="text-xl font-bold text-gabay-blue">Personnel Overview</h2>
              <button onClick={() => setViewDetailsUser(null)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            
            {/* EXPANDED STAFF DETAILS */}
            <div className="space-y-4">
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Employee ID</span><span className="text-gray-800 font-medium">{viewDetailsUser.id}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">System Staff ID</span><span className="text-gray-800 font-medium">{viewDetailsUser.staffID}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Full Name</span><span className="text-gray-800 font-medium">{viewDetailsUser.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Email Address</span><span className="text-gray-800 font-medium">{viewDetailsUser.email || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Contact No.</span><span className="text-gray-800 font-medium">{viewDetailsUser.phone || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Gender</span><span className="text-gray-800 font-medium">{viewDetailsUser.gender || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Date of Birth</span><span className="text-gray-800 font-medium">{viewDetailsUser.dob || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">System Role</span><span className="text-gray-800 font-medium">{viewDetailsUser.role}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Address</span><span className="text-gray-800 font-medium">{viewDetailsUser.address}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Working Days</span><span className="text-gray-800 font-medium">{viewDetailsUser.schedule}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Working Hours</span><span className="text-gray-800 font-medium">{viewDetailsUser.time}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 text-sm font-bold uppercase tracking-wide">Account Status</span><span className={`font-bold ${viewDetailsUser.status === 'Active' ? 'text-gabay-green' : 'text-red-500'}`}>{viewDetailsUser.status}</span></div>
            </div>

            <div className="mt-8 pt-4 border-t text-center">
              <button onClick={() => setViewDetailsUser(null)} className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      <AddPersonnelModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchStaff} 
        editData={selectedPersonnel} 
      />

      <UserStatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ isOpen: false, user: null, actionType: '' })}
        onConfirm={executeStatusChange}
        user={statusModal.user}
        actionType={statusModal.actionType}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}