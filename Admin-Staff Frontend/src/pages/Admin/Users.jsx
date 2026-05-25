import React, { useState, useMemo, useEffect, useContext } from 'react';
import { 
  Search, Download, Funnel, Plus, 
  Edit3, MinusCircle, ChevronLeft, ChevronRight, X, AlertTriangle
} from 'lucide-react';
import { AuthContext } from '../../authContext'; 
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';

export default function Users() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [usersData, setUsersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    firstname: '', surname: '', email: '', role: 'Staff', departments: [],
    position: 'Nurse', gender: 'Female', contactNumber: ''
  });

  // --- VALIDATION ERROR STATES ---
  const [addErrors, setAddErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  // --- VALIDATION ENGINE ---
  const validateUserForm = (userData) => {
    const errors = {};
    if (!userData.firstname?.trim()) errors.firstname = "First name is required.";
    if (!userData.surname?.trim()) errors.surname = "Surname is required.";
    if (!userData.email?.trim()) errors.email = "Email address is required.";
    if (!userData.departments || userData.departments.length === 0) {
      errors.departments = "Personnel must be assigned to at least one department.";
    }
    if (!userData.position?.trim()) errors.position = "Job position is required.";
    return errors;
  };

  // --- CREATE USER LOGIC ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setAddErrors({});

    // Inline validation replaces browser alerts
    const errors = validateUserForm(newUser);
    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/addusers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        // Safe error reading (prevents the JSON alert crash!)
        const errorText = await response.text();
        let errorMessage = 'Failed to create user';
        try {
            errorMessage = JSON.parse(errorText).detail || errorMessage;
        } catch {
            errorMessage = `Server Error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      toast.success(`${newUser.firstname}'s account created! An email with their password has been sent.`);
      
      setIsAddModalOpen(false);
      setAddErrors({});
      setNewUser({ firstname: '', surname: '', email: '', role: 'Staff', departments: [], position: 'Nurse', gender: 'Female', contactNumber: '' });
      
      setTimeout(() => {
        window.location.reload(); 
      }, 1500);

    } catch (error) {
      toast.error(error.message); 
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- EDIT & DELETE STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // --- DELETE MODAL STATE ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // --- EDIT USER LOGIC ---
  const handleOpenEdit = (user) => {
    setEditErrors({});
    setEditingUser({...user}); 
    setIsEditModalOpen(true);
  };

  // --- UPDATE USER LOGIC ---
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setEditErrors({});

    // Inline validation replaces browser alerts
    const errors = validateUserForm(editingUser);
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${editingUser.raw_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          firstname: editingUser.firstname,
          surname: editingUser.surname,
          role: editingUser.role,
          departments: editingUser.departments,
          position: editingUser.position,
          gender: editingUser.gender,
          contactNumber: editingUser.phone,
          status: editingUser.status
        })
      });

      if (!response.ok) throw new Error('Failed to update user');
      
      toast.success('User updated successfully!');
      setIsEditModalOpen(false);
      setEditErrors({});
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- DELETE USER LOGIC ---
  const confirmDelete = (rawId, name) => {
    setUserToDelete({ rawId, name });
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    setIsSubmitting(true); 

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userToDelete.rawId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to deactivate user');
      
      toast.success(`${userToDelete.name} deactivated successfully!`);
      setIsDeleteModalOpen(false);
      setTimeout(() => window.location.reload(), 1000);
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
      { header: 'Hospital Number', key: 'id', width: 18 },
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'System Role', key: 'role', width: 15 },
      { header: 'Department/s', key: 'departments', width: 50 },
      { header: 'Job Position', key: 'position', width: 25 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Contact Number', key: 'phone', width: 20 },
      { header: 'Account Status', key: 'status', width: 18 },
      { header: 'Join Date', key: 'joinDate', width: 15 }
    ];

    filteredData.forEach(user => {
      worksheet.addRow({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departments: (user.departments && user.departments.length > 0) ? user.departments.join(', ') : 'N/A',
        position: user.position,
        gender: user.gender,
        phone: user.phone,
        status: user.status,
        joinDate: user.joinDate
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
  
  const { token } = useContext(AuthContext);

  const [filters, setFilters] = useState({
    sortKey: 'name',
    sortOrder: 'asc',
    emailFilter: '', 
    genders: ['Male', 'Female', 'N/A'], 
    statuses: ['Active', 'Offline', 'Inactive', 'Deactivated']
  });

  const itemsPerPage = 10;

  // --- FETCH USERS ON MOUNT ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/users`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsersData(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchUsers();
    }
  }, [token]);

  const filteredData = useMemo(() => {
    let result = usersData.filter(item => 
      (item.name && item.name.toLowerCase().includes(search.toLowerCase())) || 
      (item.id && String(item.id).toLowerCase().includes(search.toLowerCase()))
    );

    if (filters.genders.length > 0) result = result.filter(i => filters.genders.includes(i.gender));
    if (filters.statuses.length > 0) result = result.filter(i => filters.statuses.includes(i.status));

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

  // --- PAGINATION LOGIC ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const entryStart = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, filteredData.length);

  // --- TOGGLE SELECTION ---
  const toggleSelection = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue">Users List</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">Main Menu &gt; Users</p>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
        {/* LEFT GROUP */}
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
            onClick={() => { setAddErrors({}); setIsAddModalOpen(true); }}
            className="whitespace-nowrap flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gabay-teal text-white font-medium font-poppins text-sm hover:bg-opacity-90 transition shadow-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline"> New User</span><span className="sm:hidden">New User</span>
          </button>
        </div>

        {/* RIGHT GROUP */}
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
              <Funnel size={16} /> Filter ({filters.genders.length + filters.statuses.length})
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Sort By</p>
                  <div className="flex flex-col gap-2">
                    {/* FIRST DROPDOWN */}
                    <select 
                      value={filters.sortKey}
                      className="w-full text-sm font-poppins border rounded-lg p-2 outline-none"
                      onChange={(e) => setFilters({...filters, sortKey: e.target.value})}
                    >
                      <option value="name">Name</option>
                      <option value="id">Hospital Number</option>
                      <option value="joinDate">Date Joined</option>
                    </select>

                    {/* SECOND DROPDOWN */}
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
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Gender</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Male', 'Female'].map(g => (
                      <label key={g} className="flex items-center gap-2 text-sm text-gray-600 font-poppins cursor-pointer">
                        <input type="checkbox" checked={filters.genders.includes(g)} onChange={(e) => {
                          const newGenders = e.target.checked ? [...filters.genders, g] : filters.genders.filter(x => x !== g);
                          setFilters({...filters, genders: newGenders});
                        }} className="w-4 h-4 rounded accent-gabay-blue" /> {g}
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
                  <button onClick={() => 
                    setFilters({ sortKey: 'name', sortOrder: 'asc', genders: [], statuses: [] })} 
                    className="flex-1 py-2 text-xs border border-gray-400 rounded-lg font-poppins font-medium text-gray-400 hover:text-red-500">Reset All</button>
                  <button onClick={() => setShowFilterDropdown(false)} className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium hover:bg-opacity-90">Apply</button>
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
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Hospital Number</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Name</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Email</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Gender</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Phone Number</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Join Date</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedData.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(user.id) ? 'bg-blue-50/50' : ''}`} onClick={() => toggleSelection(user.id)}>
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700 font-medium">{user.id}</td>
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gabay-blue font-medium">{user.name}</td>
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700">{user.email}</td>
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700">{user.gender}</td>
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700">{user.phone}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-[12px] uppercase font-poppins font-medium text-gray-700">
                        <div className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-gabay-green' : user.status === 'Deactivated' ? 'bg-gabay-orange' : user.status === 'Offline' ? 'bg-gray-400' : 'bg-gabay-red'}`} />
                        {user.status}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700">{user.joinDate}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleOpenEdit(user)} className="p-1.5 text-gabay-teal hover:bg-teal-50 rounded-lg transition-colors" title="Edit User">
                          <Edit3 size={18}/>
                        </button>
                        {user.role !== 'Admin' && (
                          <button onClick={() => confirmDelete(user.raw_id, user.name)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Deactivate User">
                            <MinusCircle size={18}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table> 
          </div>)}

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

      {/* USER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden font-poppins">
            <div className="bg-gabay-blue px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold">Add New Personnel</h2>
              <button onClick={() => { setIsAddModalOpen(false); setAddErrors({}); }} className="hover:text-gray-300 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                  <input 
                    type="text" 
                    className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${addErrors.firstname ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                    value={newUser.firstname} 
                    onChange={e => { setNewUser({...newUser, firstname: e.target.value}); setAddErrors(p => ({...p, firstname: null})); }} 
                  />
                  {addErrors.firstname && <p className="text-red-500 text-[11px] mt-1 font-medium">{addErrors.firstname}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Surname</label>
                  <input 
                    type="text" 
                    className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${addErrors.surname ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                    value={newUser.surname} 
                    onChange={e => { setNewUser({...newUser, surname: e.target.value}); setAddErrors(p => ({...p, surname: null})); }} 
                  />
                  {addErrors.surname && <p className="text-red-500 text-[11px] mt-1 font-medium">{addErrors.surname}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${addErrors.email ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                    value={newUser.email} 
                    onChange={e => { setNewUser({...newUser, email: e.target.value}); setAddErrors(p => ({...p, email: null})); }} 
                  />
                  {addErrors.email && <p className="text-red-500 text-[11px] mt-1 font-medium">{addErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number</label>
                  <input type="text" className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-blue" value={newUser.contactNumber} onChange={e => setNewUser({...newUser, contactNumber: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">System Role</label>
                  <select className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-blue" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                
                {/* ADD MODAL - DEPARTMENT MULTI-SELECT */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Department/s</label>
                  <select 
                    className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${addErrors.departments ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                    value="" 
                    onChange={e => {
                      const selectedVal = e.target.value;
                      setAddErrors(p => ({...p, departments: null}));
                      if (selectedVal && !newUser.departments?.includes(selectedVal)) {
                        const updatedDeps = [...(newUser.departments || []), selectedVal];
                        setNewUser({...newUser, departments: updatedDeps});
                      }
                    }}
                  >
                    <option value="" disabled>+ Add Department</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dentistry">Dentistry</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                  </select>
                  {addErrors.departments && <p className="text-red-500 text-[11px] mt-1 font-medium">{addErrors.departments}</p>}

                  {/* VISUAL DISPLAY FOR ADDED DEPARTMENTS */}
                  {newUser.departments && newUser.departments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {newUser.departments.map((dep, index) => (
                        <span key={index} className="inline-flex items-center gap-1 bg-blue-50 text-gabay-blue border border-blue-200 px-2.5 py-1 rounded-md text-xs font-medium">
                          {dep}
                          <button 
                            type="button" 
                            className="hover:text-red-500 font-bold ml-1 transition"
                            onClick={() => {
                              const filteredDeps = newUser.departments.filter(d => d !== dep);
                              setNewUser({...newUser, departments: filteredDeps});
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Job Position</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Head Nurse" 
                    className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${addErrors.position ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                    value={newUser.position} 
                    onChange={e => { setNewUser({...newUser, position: e.target.value}); setAddErrors(p => ({...p, position: null})); }} 
                  />
                  {addErrors.position && <p className="text-red-500 text-[11px] mt-1 font-medium">{addErrors.position}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
                  <select className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-blue" value={newUser.gender} onChange={e => setNewUser({...newUser, gender: e.target.value})}>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button type="button" onClick={() => { setIsAddModalOpen(false); setAddErrors({}); }} className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-medium text-white bg-gabay-blue hover:bg-opacity-90 rounded-lg transition disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden font-poppins">
            <div className="bg-gabay-teal px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold">Edit Personnel Profile</h2>
              <button onClick={() => { setIsEditModalOpen(false); setEditErrors({}); }} className="hover:text-gray-200 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                  <input 
                    type="text" 
                    className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal ${editErrors.firstname ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                    value={editingUser.firstname} 
                    onChange={e => { setEditingUser({...editingUser, firstname: e.target.value}); setEditErrors(p => ({...p, firstname: null})); }} 
                  />
                  {editErrors.firstname && <p className="text-red-500 text-[11px] mt-1 font-medium">{editErrors.firstname}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Surname</label>
                  <input 
                    type="text" 
                    className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal ${editErrors.surname ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                    value={editingUser.surname} 
                    onChange={e => { setEditingUser({...editingUser, surname: e.target.value}); setEditErrors(p => ({...p, surname: null})); }} 
                  />
                  {editErrors.surname && <p className="text-red-500 text-[11px] mt-1 font-medium">{editErrors.surname}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number</label>
                  <input type="text" className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-teal" value={editingUser.phone} onChange={e => setEditingUser({...editingUser, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Account Status</label>
                  <select className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-teal" value={editingUser.status} onChange={e => setEditingUser({...editingUser, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">System Role</label>
                  <select className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-teal" value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}>
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                
                {/* EDIT MODAL - DEPARTMENT MULTI-SELECT */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Department/s</label>
                  <select 
                    className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal ${editErrors.departments ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                    value="" 
                    onChange={e => {
                      const selectedVal = e.target.value;
                      setEditErrors(p => ({...p, departments: null}));
                      if (selectedVal && !editingUser.departments?.includes(selectedVal)) {
                        const updatedDeps = [...(editingUser.departments || []), selectedVal];
                        setEditingUser({...editingUser, departments: updatedDeps});
                      }
                    }}
                  >
                    <option value="" disabled>+ Add Department</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Dentistry">Dentistry</option>
                    <option value="Internal Medicine">Internal Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                  </select>
                  {editErrors.departments && <p className="text-red-500 text-[11px] mt-1 font-medium">{editErrors.departments}</p>}

                  {/* VISUAL DISPLAY FOR EDITING DEPARTMENTS */}
                  {editingUser.departments && editingUser.departments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {editingUser.departments.map((dep, index) => (
                        <span key={index} className="inline-flex items-center gap-1 bg-teal-50 text-gabay-teal border border-teal-200 px-2.5 py-1 rounded-md text-xs font-medium">
                          {dep}
                          <button 
                            type="button" 
                            className="hover:text-red-500 font-bold ml-1 transition"
                            onClick={() => {
                              const filteredDeps = editingUser.departments.filter(d => d !== dep);
                              setEditingUser({...editingUser, departments: filteredDeps});
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Job Position</label>
                  <input 
                    type="text" 
                    className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal ${editErrors.position ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                    value={editingUser.position} 
                    onChange={e => { setEditingUser({...editingUser, position: e.target.value}); setEditErrors(p => ({...p, position: null})); }} 
                  />
                  {editErrors.position && <p className="text-red-500 text-[11px] mt-1 font-medium">{editErrors.position}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
                  <select className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-teal" value={editingUser.gender} onChange={e => setEditingUser({...editingUser, gender: e.target.value})}>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Email (Cannot be changed)</label>
                  <input type="text" disabled className="w-full border p-2 rounded-lg text-sm bg-gray-100 text-gray-400 border-gray-300" value={editingUser.email} />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button type="button" onClick={() => { setIsEditModalOpen(false); setEditErrors({}); }} className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-medium text-white bg-gabay-teal hover:bg-opacity-90 rounded-lg transition disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEACTIVATE CONFIRMATION MODAL */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 font-poppins scale-100 animate-fade-in-down">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-full bg-red-100 text-red-600 border border-red-200">
                <AlertTriangle size={24} strokeWidth={2.5}/>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Deactivate Personnel?</h2>
            </div>
            
            <div className="space-y-4 mb-8">
              <p className="text-sm text-gray-600 leading-relaxed">
                You are about to deactivate the account for <strong className="text-gabay-blue">{userToDelete.name}</strong>.
              </p>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-700 text-xs flex items-start gap-2.5">
                <AlertTriangle className="flex-shrink-0 mt-0.5" size={16}/>
                <span>The user will lose all access to the system immediately. This action can be reversed later via the 'Edit' panel.</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                type="button" 
                onClick={() => setIsDeleteModalOpen(false)} 
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition duration-200"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={executeDelete} 
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-gabay-red rounded-lg shadow hover:bg-opacity-90 transition duration-200 disabled:opacity-50"
              >
                {isSubmitting ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}