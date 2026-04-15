import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Search, Download, Funnel, Plus, Edit3, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AuthContext } from '../../authContext';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';

export default function Personnel() {
  const { token } = useContext(AuthContext);

  // --- SCHEDULE UI HELPERS ---
  const DAYS_OF_WEEK = ['M', 'T', 'W', 'TH', 'F', 'S', 'SU'];

  const generateTimeOptions = () => {
    const times = [];
    for (let i = 6; i <= 20; i++) { // From 6:00 AM to 8:00 PM
      const hour = i > 12 ? i - 12 : i;
      const ampm = i >= 12 ? 'PM' : 'AM';
      times.push(`${hour}:00 ${ampm}`);
      times.push(`${hour}:30 ${ampm}`);
    }
    return times;
  };
  const TIME_OPTIONS = generateTimeOptions();
  
  // --- STATE ---
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [personnelData, setPersonnelData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- EDIT MODAL STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);

  // --- ADD DOCTOR MODAL STATE ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    firstname: '', surname: '', deptID: '',
    schedule: '', time: ''
  });

  const handleAddDoctor = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        // Fixed: Mapping the React state to the Python Pydantic Schema!
        body: JSON.stringify({
          firstname: newDoctor.firstname,
          surname: newDoctor.surname,
          deptID: newDoctor.deptID,
          workingDays: newDoctor.schedule || "Unassigned",
          workingHours: newDoctor.time || "Unassigned"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(JSON.parse(errorText).detail || 'Failed to add doctor');
      }
      
      toast.success('Doctor added successfully!');
      setIsAddModalOpen(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [filters, setFilters] = useState({
    sortKey: 'name',
    sortOrder: 'asc',
    deptType: ['General', 'Specialty'],  
    roles: ['STAFF', 'DOCTOR', 'ADMIN'], 
    statuses: ['Active', 'Offline', 'Inactive', 'Deactivated']
  });

  const itemsPerPage = 10;

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        
        const personnelRes = await fetch(`http://127.0.0.1:8000/api/admin/personnel`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!personnelRes.ok) throw new Error('Failed to fetch personnel');
        const pData = await personnelRes.json();
        setPersonnelData(pData);

        const deptRes = await fetch(`http://127.0.0.1:8000/api/admin/departments`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!deptRes.ok) throw new Error('Failed to fetch departments');
        const dData = await deptRes.json();
        setDepartments(dData);

      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchData();
  }, [token]);

  // --- UPDATE DATA ---
  const handleOpenEdit = (person) => {
    let fName = person.firstname || '';
    let sName = person.surname || '';
    
    if (!fName && !sName && person.name) {
      const nameParts = person.name.split(' ');
      fName = nameParts[0];
      sName = nameParts.slice(1).join(' ');
    }

    setEditingPerson({
      ...person,
      firstname: fName,
      surname: sName,
      deptID: person.deptID || '' 
    });
    
    setIsEditModalOpen(true);
  };

  const handleUpdatePersonnel = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/personnel/${editingPerson.raw_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          role: editingPerson.role,
          deptID: editingPerson.deptID ? parseInt(editingPerson.deptID) : null, 
          workingDays: editingPerson.schedule,
          workingHours: editingPerson.time,
          firstname: editingPerson.firstname, 
          surname: editingPerson.surname
        })
      });

      if (!response.ok) throw new Error('Failed to update assignment');
      
      toast.success('Assignment updated successfully!');
      setIsEditModalOpen(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FILTER LOGIC ---
  const filteredData = useMemo(() => {
    let result = personnelData.filter(item => 
      (item.name && item.name.toLowerCase().includes(search.toLowerCase())) || 
      (item.id && String(item.id).toLowerCase().includes(search.toLowerCase()))
    );

    if (filters.roles.length > 0) result = result.filter(i => filters.roles.includes(i.role));
    if (filters.statuses.length > 0) result = result.filter(i => filters.statuses.includes(i.status));
    if (filters.deptType.length > 0) {
      result = result.filter(i => {
        const type = i.isSpecialty ? 'Specialty' : 'General';
        return filters.deptType.includes(type);
      });
    }

    result.sort((a, b) => {
      const valA = String(a[filters.sortKey] || '');
      const valB = String(b[filters.sortKey] || '');
      const comparison = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [search, filters, personnelData]);

  // --- EXPORT TO EXCEL LOGIC ---
  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      toast.error("No personnel data to export.");
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Personnel Assignments');
    worksheet.columns = [
      { header: 'Employee ID', key: 'id', width: 15 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'Department', key: 'dept', width: 30 },
      { header: 'Schedule', key: 'schedule', width: 20 },
      { header: 'Working Hours', key: 'time', width: 25 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    filteredData.forEach(person => {
      worksheet.addRow({
        id: person.id,
        role: person.role,
        name: person.name,
        dept: person.dept,
        schedule: person.schedule,
        time: person.time,
        status: person.status
      });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0b3b60' } };
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
    link.setAttribute('download', `GABAY_Personnel_Assignments_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success("Excel report generated successfully!");
  };

  // --- PAGINATION LOGIC ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const entryStart = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, filteredData.length);

  const handleSelectAll = (e) => e.target.checked ? setSelectedIds(pagedData.map(i => i.id)) : setSelectedIds([]);
  const toggleSelection = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue">Personnel List</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">Main Menu &gt; Personnel</p>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
        <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
        <div className="relative w-full lg:w-96">
          <input 
            type="text" 
            value={search}
            onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}}
            placeholder="Search Personnel..." 
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20"
          />
          <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gabay-teal text-white font-medium font-poppins text-sm hover:bg-gabay-teal2 transition">
            <Plus size={16} /> <span className="hidden sm:inline">New Personnel</span><span className="sm:hidden">Personnel</span> 
          </button>
        </div>

        <div className="flex flex-row gap-2 w-full lg:w-auto">
          <button 
            onClick={handleExportExcel}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors"
          >
            <Download size={16} /> Export as Excel
          </button>
          
          {/* MULTI-FILTER DROPDOWN */}
          <div className="relative flex-1 lg:flex-none">
            <button 
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors"
            >
              <Funnel size={16} /> Filter ({filters.roles.length + filters.statuses.length + filters.deptType.length})
            </button>
            
            {showFilterDropdown && (
          <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5 max-h-[500px] overflow-y-auto scrollbar-thin">
    
          {/* SORTING SECTION */}
          <div>
            <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Sort By</p>
            <div className="space-y-3">
              {/* FIRST DROPDOWN */}
              <div>
                <select 
                  value={filters.sortKey}
                  className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-gabay-blue/10"
                  onChange={(e) => setFilters({...filters, sortKey: e.target.value})}
                >
                  <option value="name">Name</option>
                  <option value="id">Employee ID</option>
                </select>
              </div>

              {/* SECOND DROPDOWN */}
              <div>
                <select 
                  value={filters.sortOrder}
                  className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-gabay-blue/10"
                  onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}
                >
                  <option value="asc">Ascending (A-Z / 0-9)</option>
                  <option value="desc">Descending (Z-A / 9-0)</option>
                </select>
              </div>
            </div>
          </div>

          {/* DEPARTMENT */}
          {/* DYNAMIC DEPARTMENT DROPDOWN */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                <select 
                  className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal bg-white" 
                  
                  value={editingPerson?.deptID || newDoctor?.deptID || ''} 
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (isEditModalOpen) setEditingPerson({...editingPerson, deptID: val});
                    if (isAddModalOpen) setNewDoctor({...newDoctor, deptID: val});
                  }}
                >
                  <option value="" disabled>Select a Department...</option>
                  {departments.map(dept => (
                    <option key={dept.deptID} value={dept.deptID}>
                      {dept.department} ({dept.type})
                    </option>
                  ))}
                </select>
              </div>

          {/* ROLES */}
          <div>
            <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Role</p>
            <div className="grid grid-cols-2 gap-2">
              {['DOCTOR', 'STAFF', 'ADMIN'].map(r => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded accent-gabay-blue"
                    checked={filters.roles.includes(r)}
                    onChange={(e) => {
                      const newRoles = e.target.checked ? [...filters.roles, r] : filters.roles.filter(x => x !== r);
                      setFilters({...filters, roles: newRoles});
                    }}
                  /> 
                  <span className="text-gray-600 font-poppins group-hover:text-gabay-blue transition-colors">{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* STATUS SECTION */}
          <div>
            <p className="text-[10px] font-poppins font-bold text-gray-400 uppercase tracking-widest mb-3">Status</p>
            <div className="grid grid-cols-2 gap-2">
              {['Active', 'Offline', 'Inactive', 'Deactivated'].map(s => (
                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded accent-gabay-blue"
                    checked={filters.statuses.includes(s)}
                    onChange={(e) => {
                      const newStatus = e.target.checked ? [...filters.statuses, s] : filters.statuses.filter(x => x !== s);
                      setFilters({...filters, statuses: newStatus});
                    }}
                  /> 
                  <span className="text-gray-600 font-poppins group-hover:text-gabay-blue transition-colors">{s}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button 
              onClick={() => setFilters({ sortKey: 'name', sortOrder: 'asc', deptType: [], roles: [], statuses: [] })}
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

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 font-poppins">
            Loading personnel data...
          </div>
        ) : (
        <div className="overflow-x-auto cursor-default">
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
                <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Employee ID</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Role</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Name</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Department</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Schedule</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Time</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Status</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedData.map((person) => (
                <tr 
                  key={person.id} 
                  className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(person.id) ? 'bg-blue-50/50' : ''}`}
                  onClick={() => toggleSelection(person.id)}
                >
                  <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(person.id)}
                      onChange={() => toggleSelection(person.id)}
                      className="w-4 h-4 bg-gabay-blue"
                    />
                  </td>
                  <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700 font-medium">{person.id}</td>
                  <td className="px-4 py-4">
                     <span className={`px-3 py-0.5 rounded-full text-[12px] md:text-[11px] font-poppins font-bold ${
                       person.role === 'DOCTOR' ? 'bg-orange-100 text-gabay-orange' : 
                       person.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'
                     }`}>
                       {person.role}
                     </span>
                  </td>
                  <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gabay-blue font-medium">{person.name}</td>
                  <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-700">{person.dept}</td>
                  <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-700">{person.schedule}</td>
                  <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-500">{person.time}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-[11px] uppercase md:text-[12px] font-poppins font-medium text-gray-700">
                      <div className={`w-2 h-2 rounded-full ${
                        person.status === 'Active' ? 'bg-gabay-green' : 
                        person.status === 'Deactivated' ? 'bg-gabay-orange' :
                        person.status === 'Offline' ? 'bg-gray-outline' : 'bg-gabay-red'
                      }`} />
                      {person.status}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleOpenEdit(person)} className="p-1.5 text-gabay-teal hover:bg-teal-50 rounded-lg transition-colors"><Edit3 size={18}/></button>
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
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={20} />
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
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 font-poppins font-medium">
            Showing {entryStart} - {entryEnd} of {filteredData.length} entries
          </p>
        </div>
      </div>

      {/* EDIT ASSIGNMENT MODAL */}
      {isEditModalOpen && editingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden font-poppins">
            <div className="bg-gabay-blue px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold">Edit Personnel Assignment</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="hover:text-gray-300 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleUpdatePersonnel} className="p-6 space-y-4">
              <div>
                {/* --- CONDITIONAL HEADER & NAME EDITING --- */}
                {editingPerson.role === 'DOCTOR' ? (
                  // DOCTOR VIEW: Allow Name Editing, Hide System Role
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                      <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue" value={editingPerson.firstname} onChange={e => setEditingPerson({...editingPerson, firstname: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Surname</label>
                      <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue" value={editingPerson.surname} onChange={e => setEditingPerson({...editingPerson, surname: e.target.value})} />
                    </div>
                  </div>
                ) : (
                  // STAFF VIEW: Read-Only Header & Editable System Role
                  <>
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex justify-between items-center mb-6">
                      <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Employee</p>
                          <p className="font-bold text-gray-700">{editingPerson.name}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Status</p>
                          <p className={`font-bold ${editingPerson.status === 'Active' ? 'text-gabay-green' : 'text-red-500'}`}>{editingPerson.status}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">System Role</label>
                      <select className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue" value={editingPerson.role} onChange={e => setEditingPerson({...editingPerson, role: e.target.value})}>
                        <option value="STAFF">Staff</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </>
                )}

                {/* DYNAMIC DEPARTMENT DROPDOWN */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                <select 
                  className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal bg-white" 
                  
                  value={editingPerson?.deptID || newDoctor?.deptID || ''} 
                  onChange={e => {
                    const val = Number(e.target.value);
                    // Update the correct state depending on which modal is open
                    if (isEditModalOpen) setEditingPerson({...editingPerson, deptID: val});
                    if (isAddModalOpen) setNewDoctor({...newDoctor, deptID: val});
                  }}
                >
                  <option value="" disabled>Select a Department...</option>
                  {departments.map(dept => (
                    <option key={dept.deptID} value={dept.deptID}>
                      {dept.department} ({dept.type})
                    </option>
                  ))}
                </select>
              </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Working Days</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => {
                      // Parse the current string into an array safely
                      const currentDays = editingPerson.schedule && editingPerson.schedule !== 'Unassigned' 
                        ? editingPerson.schedule.split(',').map(d => d.trim()) 
                        : [];
                      
                      const isSelected = currentDays.includes(day);

                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => {
                            let newDays = [...currentDays];
                            if (isSelected) newDays = newDays.filter(d => d !== day);
                            else newDays.push(day);
                            
                            newDays.sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
                            
                            setEditingPerson({...editingPerson, schedule: newDays.join(', ') || 'Unassigned'});
                          }}
                          className={`w-10 h-10 rounded-full text-xs font-bold transition-all duration-200 shadow-sm ${
                            isSelected 
                              ? 'bg-gabay-blue text-white ring-2 ring-gabay-blue ring-offset-1' 
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Working Hours</label>
                  <div className="flex items-center gap-3">
                    {/* Start Time Dropdown */}
                    <select 
                      className="flex-1 border p-2.5 rounded-lg text-sm outline-none focus:border-gabay-blue bg-white"
                      value={editingPerson.time && editingPerson.time !== 'Unassigned' ? editingPerson.time.split(' - ')[0] : ''}
                      onChange={(e) => {
                        const currentEnd = editingPerson.time && editingPerson.time !== 'Unassigned' ? editingPerson.time.split(' - ')[1] : '5:00 PM';
                        setEditingPerson({...editingPerson, time: `${e.target.value} - ${currentEnd}`});
                      }}
                    >
                      <option value="" disabled>Start Time</option>
                      {TIME_OPTIONS.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                    </select>

                    <span className="text-gray-400 font-bold px-1">to</span>
                    
                    {/* End Time Dropdown */}
                    <select 
                      className="flex-1 border p-2.5 rounded-lg text-sm outline-none focus:border-gabay-blue bg-white"
                      value={editingPerson.time && editingPerson.time !== 'Unassigned' ? editingPerson.time.split(' - ')[1] : ''}
                      onChange={(e) => {
                        const currentStart = editingPerson.time && editingPerson.time !== 'Unassigned' ? editingPerson.time.split(' - ')[0] : '8:00 AM';
                        setEditingPerson({...editingPerson, time: `${currentStart} - ${e.target.value}`});
                      }}
                    >
                      <option value="" disabled>End Time</option>
                      {TIME_OPTIONS.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-medium text-white bg-gabay-blue hover:bg-opacity-90 rounded-lg transition disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DOCTOR MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden font-poppins">
            <div className="bg-gabay-teal px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold">Add New Doctor</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="hover:text-gray-200 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddDoctor} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
                  <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={newDoctor.firstname} onChange={e => setNewDoctor({...newDoctor, firstname: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Surname</label>
                  <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={newDoctor.surname} onChange={e => setNewDoctor({...newDoctor, surname: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Department</label>
                <select className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={newDoctor.deptID} onChange={e => setNewDoctor({...newDoctor, deptID: Number(e.target.value)})}>
                  <option value={1}>General Internal Medicine</option>
                  <option value={2}>Pediatrics</option>
                  <option value={3}>Dermatology</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const currentDays = newDoctor.schedule ? newDoctor.schedule.split(',').map(d => d.trim()) : [];
                    const isSelected = currentDays.includes(day);

                    return (
                      <button
                        type="button" key={day}
                        onClick={() => {
                          let newDays = [...currentDays];
                          if (isSelected) newDays = newDays.filter(d => d !== day);
                          else newDays.push(day);
                          newDays.sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
                          setNewDoctor({...newDoctor, schedule: newDays.join(', ')});
                        }}
                        className={`w-10 h-10 rounded-full text-xs font-bold transition-all duration-200 shadow-sm ${
                          isSelected ? 'bg-gabay-teal text-white ring-2 ring-gabay-teal ring-offset-1' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* --- TIME PICKERS --- */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Working Hours</label>
                <div className="flex items-center gap-3">
                  <select 
                    className="flex-1 border p-2.5 rounded-lg text-sm outline-none focus:border-gabay-teal"
                    value={newDoctor.time ? newDoctor.time.split(' - ')[0] : ''}
                    onChange={(e) => {
                      const currentEnd = newDoctor.time ? newDoctor.time.split(' - ')[1] || '5:00 PM' : '5:00 PM';
                      setNewDoctor({...newDoctor, time: `${e.target.value} - ${currentEnd}`});
                    }}
                  >
                    <option value="" disabled>Start</option>
                    {TIME_OPTIONS.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                  </select>
                  <span className="text-gray-400 font-bold px-1">to</span>
                  <select 
                    className="flex-1 border p-2.5 rounded-lg text-sm outline-none focus:border-gabay-teal"
                    value={newDoctor.time ? newDoctor.time.split(' - ')[1] : ''}
                    onChange={(e) => {
                      const currentStart = newDoctor.time ? newDoctor.time.split(' - ')[0] || '8:00 AM' : '8:00 AM';
                      setNewDoctor({...newDoctor, time: `${currentStart} - ${e.target.value}`});
                    }}
                  >
                    <option value="" disabled>End</option>
                    {TIME_OPTIONS.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-medium text-white bg-gabay-teal hover:bg-opacity-90 rounded-lg transition disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}