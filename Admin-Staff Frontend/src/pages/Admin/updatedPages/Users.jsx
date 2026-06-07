import React, { useState, useMemo, useEffect, useContext } from 'react';
import { 
  Search, Download, Plus, Funnel,
  Edit3, MinusCircle, CheckCircle2, ChevronLeft, ChevronRight, X, AlertTriangle
} from 'lucide-react';
import { AuthContext } from '../../authContext'; 
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import AddPersonnelModal from './AddPersonnelModal';

function UserStatusModal({ isOpen, user, actionType, isSubmitting, onClose, onConfirm }) {
  if (!isOpen) return null;
  const isDeactivating = actionType === 'deactivate';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl p-6 shadow-2xl w-full max-w-sm space-y-4 font-poppins">
        <div className="flex items-center gap-3 text-amber-500">
          <AlertTriangle size={24} />
          <h3 className="text-base font-bold text-gray-800">Confirm Action</h3>
        </div>
        <p className="text-xs text-gray-600">
          Are you sure you want to {actionType} the access directory status parameters for <strong>{user?.name}</strong>?
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
          <button type="button" onClick={onConfirm} disabled={isSubmitting} className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition ${isDeactivating ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
            {isSubmitting ? 'Processing...' : isDeactivating ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  // --- CONTEXT & STYLES ---
  const { token } = useContext(AuthContext);

  // --- COMPONENT STATE ---
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [usersData, setUsersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);

  // --- EDIT & STATUS MODAL STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // --- UNIFIED STATUS CHANGE MODAL STATE ---
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    user: null,       
    actionType: ''  
  });

  // --- FILTER CONFIGURATION STATE ---
  const [filters, setFilters] = useState({
    sortKey: 'name',
    sortOrder: 'asc',
    emailFilter: '', 
    deptSearch: '', 
    statuses: ['Active', 'Offline', 'Inactive', 'Deactivated'],
    roles: ['Staff', 'Admin']
  });

  const itemsPerPage = 10;

  // --- FETCH USERS STATE HANDLER ---
  const fetchUsers = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });

      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsersData(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Could not synchronize remote directory database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  // --- DUAL-MODE MODAL TRIGGERS ---
  const handleOpenAddModal = () => {
    setSelectedPersonnel(null); 
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setSelectedPersonnel(user); 
    setIsAddModalOpen(true);
  };

  // --- STATUS CHANGE LOGIC (Deactivate & Reactivate) ---
  const confirmStatusChange = (rawId, name, actionType) => {
    setStatusModal({
      isOpen: true,
      user: { rawId, name },
      actionType
    });
  };

  const executeStatusChange = async () => {
    if (!statusModal.user) return;
    setIsSubmitting(true); 

    const { rawId, name } = statusModal.user;
    const isDeactivating = statusModal.actionType === 'deactivate';

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${rawId}`, {
        method: 'PUT', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          status: isDeactivating ? 'Deactivated' : 'Active' 
        })
      });

      if (!response.ok) throw new Error(`Failed to ${statusModal.actionType} user`);
      
      toast.success(`${name} ${isDeactivating ? 'deactivated' : 'reactivated'} successfully!`);
      setStatusModal({ isOpen: false, user: null, actionType: '' });
      fetchUsers(); 
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- EXPORT TO EXCEL LOGIC ---
  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      toast.error("No data available to export.");
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GABAY Personnel');

    worksheet.columns = [
      { header: 'Employee ID', key: 'id', width: 18 },
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'System Role', key: 'role', width: 15 },
      { header: 'License No.', key: 'licenseNumber', width: 18 },
      { header: 'Department/s', key: 'departments', width: 35 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'Job Position', key: 'position', width: 25 },
      { header: 'Contact Number', key: 'phone', width: 20 },
      { header: 'Account Status', key: 'status', width: 18 }
    ];

    filteredData.forEach(user => {
      const cleanRole = String(user.role || '').toUpperCase();
      const formattedLicense = cleanRole === 'STAFF' && (user.licenseNumber || user.license_number)
        ? `PRC-${user.licenseNumber || user.license_number}`
        : 'N/A';

      worksheet.addRow({
        id: user.id,
        name: user.name,
        role: user.role,
        licenseNumber: formattedLicense, 
        departments: (user.departments && user.departments.length > 0) ? user.departments.join(', ') : 'N/A',
        email: user.email,
        position: user.position,
        phone: user.phone,
        status: user.status
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; 
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0b3b60' } 
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateToday = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `GABAY_Personnel_${dateToday}.xlsx`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success("Excel report downloaded successfully!");
  };

  // --- FILTER & SEARCH LOGIC ---
  const filteredData = useMemo(() => {
    let result = usersData.filter(item => 
      (item.name && item.name.toLowerCase().includes(search.toLowerCase())) || 
      (item.id && String(item.id).toLowerCase().includes(search.toLowerCase()))
    );

    if (filters.statuses.length > 0) {
      result = result.filter(i => filters.statuses.includes(i.status));
    }

    if (filters.roles.length > 0) {
      result = result.filter(i => {
        if (!i.role) return false;
        const cleanRole = i.role.charAt(0).toUpperCase() + i.role.slice(1).toLowerCase();
        return filters.roles.includes(cleanRole);
      });
    }
    
    if (filters.deptSearch.trim() !== '') {
      result = result.filter(item => 
        item.departments && item.departments.some(dept => 
          dept.toLowerCase().includes(filters.deptSearch.toLowerCase())
        )
      );
    }

    result.sort((a, b) => {
      let valA = String(a[filters.sortKey] || '');
      let valB = String(b[filters.sortKey] || '');

      const comparison = valA.localeCompare(valB, undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      });

      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [search, filters, usersData]); 

  // --- PAGINATION MATHEMATICS ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const entryStart = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, filteredData.length);

  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue">Personnel List</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">Main Menu &gt; Personnel</p>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
        <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96">
            <input 
              type="text" 
              value={search}
              onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}}
              placeholder="Search Users..." 
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          </div>
          
          <button 
            onClick={handleOpenAddModal}
            className="whitespace-nowrap flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gabay-teal text-white font-medium font-poppins text-sm hover:bg-opacity-90 transition shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline"> New Personnel</span><span className="sm:hidden">New Personnel</span>
          </button>
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
              <Funnel size={16} /> Filter ({filters.statuses.length + filters.roles.length + (filters.deptSearch ? 1 : 0)})
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Sort By</p>
                  <div className="flex flex-col gap-2">
                    <select 
                      value={filters.sortKey}
                      className="w-full text-sm font-poppins border rounded-lg p-2 outline-none"
                      onChange={(e) => setFilters({...filters, sortKey: e.target.value})}
                    >
                      <option value="name">Name</option>
                      <option value="id">Employee ID</option>
                    </select>

                    <select 
                      value={filters.sortOrder}
                      className="w-full text-sm font-poppins border rounded-lg p-2 outline-none"
                      onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}
                    >
                      <option value="asc">Ascending (A-Z / Oldest)</option>
                      <option value="desc">Descending (Z-A / Newest)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-2">Search Department</p>
                  <input 
                    type="text"
                    placeholder="e.g. Pediatrics, ER..."
                    value={filters.deptSearch}
                    className="w-full text-xs font-poppins border rounded-lg p-2 outline-none"
                    onChange={(e) => setFilters({...filters, deptSearch: e.target.value})}
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">System Role</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Staff', 'Admin'].map(r => (
                      <label key={r} className="flex items-center gap-2 text-sm text-gray-600 font-poppins cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={filters.roles.includes(r)} 
                          onChange={(e) => {
                            const newRoles = e.target.checked 
                              ? [...filters.roles, r] 
                              : filters.roles.filter(x => x !== r);
                            setFilters({...filters, roles: newRoles});
                          }} 
                          className="w-4 h-4 rounded accent-gabay-blue" 
                        /> {r.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Active', 'Offline', 'Inactive', 'Deactivated'].map(s => (
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
                  <button onClick={() => setFilters({ sortKey: 'name', sortOrder: 'asc', deptSearch: '', statuses: [], roles: [] })} className="flex-1 py-2 text-xs border border-gray-400 rounded-lg font-poppins font-medium text-gray-400 hover:text-red-500">Reset All</button>
                  <button onClick={() => setShowFilterDropdown(false)} className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium hover:bg-opacity-90">Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DATA TABLE CONTAINER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 font-poppins">Loading personnel data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1200px]">
              <thead className="bg-gabay-blue font-poppins text-white select-none">
                <tr>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Name</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Role</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">License No.</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Departments</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Email</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Phone Number</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedData.map((user) => {
                  const isDeactivated = user.status === 'Deactivated';
                  const cleanRole = String(user.role || '').toUpperCase();
                  
                  return (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedIds.includes(user.id) ? 'bg-blue-50/50' : ''
                      } ${isDeactivated ? 'bg-gray-100/70 opacity-60' : ''}`} 
                      onClick={() => toggleSelection(user.id)}
                    >
                      <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700 font-medium">{user.id}</td>
                      <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gabay-blue font-medium">{user.name}</td>
                      
                      <td className="px-4 py-4">
                        {cleanRole === 'ADMIN' ? (
                          <span className="inline-block px-4 py-1 text-center text-xs font-bold font-poppins tracking-wider rounded-full bg-[#e2ecff] text-[#2c53db]">
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-block px-5 py-1 text-center text-xs font-bold font-poppins tracking-wider rounded-full bg-[#dcfce7] text-[#157154]">
                            STAFF
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-xs md:text-sm font-poppins">
                        {cleanRole === 'STAFF' ? (
                          (user.licenseNumber || user.license_number) ? (
                            <span className="font-mono text-gray-800 bg-gray-100 px-2 py-1 rounded-md font-bold">
                              PRC-{user.licenseNumber || user.license_number}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Unassigned</span>
                          )
                        ) : (
                          <span className="text-gray-400 font-medium select-none">N/A</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {user.departments && user.departments.length > 0 ? (
                            user.departments.map((d, index) => (
                              <span key={index} className="bg-gray-100 text-gabay-blue text-[11px] font-medium px-2 py-0.5 rounded-md">
                                {d}
                              </span>
                            ))
                          ) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700">{user.email}</td>
                      <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700">{user.phone}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-[12px] uppercase font-poppins font-medium text-gray-700">
                          <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-gabay-green' : isDeactivated ? 'bg-gray-400' : user.status === 'Offline' ? 'bg-gray-400' : 'bg-gabay-red'}`} />
                          {user.status}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleOpenEditModal(user)} className="p-1.5 text-gabay-teal hover:bg-teal-50 rounded-lg transition-colors" title="Edit User">
                            <Edit3 size={18}/>
                          </button>
                          
                          {cleanRole !== 'ADMIN' && (
                            isDeactivated ? (
                              <button 
                                onClick={() => confirmStatusChange(user.raw_id, user.name, 'reactivate')} 
                                className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" 
                                title="Reactivate User"
                              >
                                <CheckCircle2 size={18}/>
                              </button>
                            ) : (
                              <button 
                                onClick={() => confirmStatusChange(user.raw_id, user.name, 'deactivate')} 
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" 
                                title="Deactivate User"
                              >
                                <MinusCircle size={18}/>
                              </button>
                            )
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

        {/* PAGE RESULTS */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="disabled:opacity-30"><ChevronLeft size={20}/></button>
            {[...Array(totalPages)].map((_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-poppins font-bold ${currentPage === i + 1 ? 'bg-gabay-blue text-white' : 'text-gray-500'}`}>{i + 1}</button>
            ))}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="disabled:opacity-30"><ChevronRight size={20}/></button>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 font-poppins font-medium">Showing {entryStart} - {entryEnd} of {filteredData.length} entries</p>
        </div>
      </div>

       <UserStatusModal
        isOpen={statusModal.isOpen}
        user={statusModal.user}
        actionType={statusModal.actionType}
        isSubmitting={isSubmitting}
        onClose={() => setStatusModal({ isOpen: false, user: null, actionType: '' })}
        onConfirm={executeStatusChange}
       />

      <AddPersonnelModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchUsers} 
        editData={selectedPersonnel}
      />
    </div>
  );
}