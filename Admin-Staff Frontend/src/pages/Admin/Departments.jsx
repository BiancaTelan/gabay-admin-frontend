import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Search, Download, Funnel, Plus, Edit3, MinusCircle, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { AuthContext } from '../../authContext';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';

export default function Departments() {
  const { token } = useContext(AuthContext);

  // --- STATE ---
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const [deptData, setDeptData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- MODAL STATES ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ department: '', type: 'GENERAL', slotCapacity: 25 });
  const [editingDept, setEditingDept] = useState(null);
  
  // Secure Delete State
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const [filters, setFilters] = useState({
    sortKey: 'name', 
    sortOrder: 'asc',
    deptType: ['GENERAL', 'SPECIALTY']
  });

  const itemsPerPage = 10;

  // --- 1. FETCH DATA ---
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/admin/departments/stats`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch departments');
        
        const data = await response.json();
        setDeptData(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) fetchDepts();
  }, [token]);

  // --- 2. CREATE DEPARTMENT ---
  const handleAddDept = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to add department');
      
      toast.success('Department created successfully!');
      setIsAddModalOpen(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 3. EDIT DEPARTMENT ---
  const handleOpenEdit = (dept) => {
    setEditingDept({...dept, department: dept.name, slotCapacity: dept.totalSlots});
    setIsEditModalOpen(true);
  };

  const handleUpdateDept = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/departments/${editingDept.raw_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          department: editingDept.department,
          type: editingDept.type,
          slotCapacity: Number(editingDept.slotCapacity)
        })
      });
      if (!response.ok) throw new Error('Failed to update department');
      
      toast.success('Department and Schedules updated!');
      setIsEditModalOpen(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 4. SECURE DELETE DEPARTMENT ---
  const handleOpenDelete = (dept) => {
    setDeptToDelete(dept);
    setDeleteConfirmationText('');
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (deleteConfirmationText !== deptToDelete.name) return; // Final safety check
    setIsSubmitting(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/admin/departments/${deptToDelete.raw_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to deactivate department');
      
      toast.success('Department deactivated successfully!');
      setIsDeleteModalOpen(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LOGIC: FILTERING & SORTING ---
  const filteredData = useMemo(() => {
    let result = deptData.filter(item => 
      (item.name && item.name.toLowerCase().includes(search.toLowerCase())) || 
      (item.id && item.id.toLowerCase().includes(search.toLowerCase()))
    );

    if (filters.deptType.length > 0) result = result.filter(i => filters.deptType.includes(i.type));

    result.sort((a, b) => {
      const valA = a[filters.sortKey];
      const valB = b[filters.sortKey];
      const comparison = typeof valA === 'string' 
        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
        : valA - valB;
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [search, filters, deptData]);

  // --- EXPORT TO EXCEL ---
  const handleExportExcel = async () => {
    if (filteredData.length === 0) return toast.error("No data to export.");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Departments');
    worksheet.columns = [
      { header: 'Department ID', key: 'id', width: 15 },
      { header: 'Department Name', key: 'name', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Doctors Assigned', key: 'doctors', width: 18 },
      { header: 'Staff Assigned', key: 'staff', width: 15 },
      { header: 'Used Slots', key: 'used', width: 15 },
      { header: 'Total Capacity', key: 'total', width: 15 }
    ];

    filteredData.forEach(d => {
      worksheet.addRow({ id: d.id, name: d.name, type: d.type, doctors: d.doctors, staff: d.staff, used: d.usedSlots, total: d.totalSlots });
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0b3b60' } };
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GABAY_Departments_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- PAGINATION ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const entryStart = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, filteredData.length);

  const handleSelectAll = (e) => e.target.checked ? setSelectedIds(pagedData.map(i => i.id)) : setSelectedIds([]);
  const toggleSelection = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue tracking-tight">Departments Management</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">Main Menu &gt; Departments</p>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
        <div className="flex flex-row items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-96">
            <input 
              type="text" value={search} onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}}
              placeholder="Search Departments..." 
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
          </div>
          <button onClick={() => {setFormData({department: '', type: 'GENERAL', slotCapacity: 25}); setIsAddModalOpen(true);}} className="whitespace-nowrap flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gabay-teal text-white font-medium font-poppins text-sm hover:bg-opacity-90 transition shadow-sm">
            <Plus size={16} /><span className="hidden sm:inline">New Department</span><span className="sm:hidden">Department</span> 
          </button>
        </div>

        <div className="flex flex-row gap-2 w-full lg:w-auto">
          <button onClick={handleExportExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors">
            <Download size={16} /> Export as Excel
          </button>
          
          <div className="relative flex-1 lg:flex-none">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors">
              <Funnel size={16} /> Filter ({filters.deptType.length})
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Sort By</p>
                  <div className="space-y-3">
                    <select value={filters.sortKey} onChange={(e) => setFilters({...filters, sortKey: e.target.value})} className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:border-gabay-blue">
                      <option value="name">Department Name</option>
                      <option value="id">Department ID</option>
                      <option value="totalSlots">Slot Capacity</option>
                    </select>
                    <select value={filters.sortOrder} onChange={(e) => setFilters({...filters, sortOrder: e.target.value})} className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:border-gabay-blue">
                      <option value="asc">Ascending (A-Z / 0-9)</option>
                      <option value="desc">Descending (Z-A / 9-0)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Department Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['GENERAL', 'SPECIALTY'].map(type => (
                      <label key={type} className="flex items-center text-gray-600 gap-2 text-sm font-poppins cursor-pointer group">
                        <input 
                          type="checkbox" checked={filters.deptType.includes(type)}
                          onChange={(e) => {
                            const newTypes = e.target.checked ? [...filters.deptType, type] : filters.deptType.filter(x => x !== type);
                            setFilters({...filters, deptType: newTypes});
                          }} className="w-4 h-4 rounded accent-gabay-blue"
                        /> 
                        <span className="group-hover:text-gabay-blue transition-colors">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button onClick={() => setFilters({ sortKey: 'name', sortOrder: 'asc', deptType: [] })} className="flex-1 py-2 text-xs font-poppins font-medium border border-gray-400 rounded-lg text-gray-400 hover:text-red-500 transition-colors">Reset All</button>
                  <button onClick={() => setShowFilterDropdown(false)} className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium shadow-md hover:bg-opacity-90 transition-all">Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 font-poppins">Loading department statistics...</div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-gabay-blue font-poppins text-white select-none">
              <tr>
                <th className="px-4 py-4 text-center">
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === pagedData.length && pagedData.length > 0} className="w-4 h-4 bg-gabay-blue" />
                </th>
                <th className="px-4 py-4 text-[12px] font-bold uppercase tracking-wider">Department ID</th>
                <th className="px-4 py-4 text-[12px] font-bold uppercase tracking-wider">Department Name</th>
                <th className="px-4 py-4 text-[12px] font-bold uppercase tracking-wider text-center">Department Type</th>
                <th className="px-4 py-4 text-[12px] font-bold uppercase tracking-wider text-center">Doctors</th>
                <th className="px-4 py-4 text-[12px] font-bold uppercase tracking-wider text-center">Staff</th>
                <th className="px-4 py-4 text-[12px] font-bold uppercase tracking-wider text-center">Slot Capacity</th>
                <th className="px-4 py-4 text-[12px] font-bold uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedData.map((dept) => (
                <tr key={dept.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(dept.id) ? 'bg-blue-50/50' : ''}`} onClick={() => toggleSelection(dept.id)}>
                  <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.includes(dept.id)} onChange={() => toggleSelection(dept.id)} className="w-4 h-4 bg-gabay-blue" />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 font-medium font-poppins">{dept.id}</td>
                  <td className="px-4 py-4 text-sm font-poppins font-medium text-gabay-blue">{dept.name}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-3 py-0.5 rounded-full text-[11px] font-poppins font-bold tracking-wider ${dept.type === 'SPECIALTY' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {dept.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-700 font-poppins">{dept.doctors}</td>
                  <td className="px-4 py-4 text-center text-sm text-gray-700 font-poppins">{dept.staff}</td>
                  <td className="px-4 py-4 text-center text-sm font-poppins font-semibold text-gray-600">
                    {dept.usedSlots} / {dept.totalSlots}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(dept); }} className="text-gabay-teal hover:scale-110 transition-transform"><Edit3 size={18}/></button>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenDelete(dept); }} className="text-red-400 hover:scale-110 transition-transform"><MinusCircle size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>)}

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

      {/* --- ADD/EDIT MODAL --- */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden font-poppins">
            <div className="bg-gabay-blue px-6 py-4 flex justify-between items-center text-white">
              <h2 className="text-lg font-bold">{isEditModalOpen ? 'Edit Department' : 'Add New Department'}</h2>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="hover:text-gray-300 transition"><X size={20}/></button>
            </div>
            
            <form onSubmit={isEditModalOpen ? handleUpdateDept : handleAddDept} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Department Name</label>
                <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue" 
                  value={isEditModalOpen ? editingDept.department : formData.department} 
                  onChange={e => isEditModalOpen ? setEditingDept({...editingDept, department: e.target.value}) : setFormData({...formData, department: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue"
                    value={isEditModalOpen ? editingDept.type : formData.type} 
                    onChange={e => isEditModalOpen ? setEditingDept({...editingDept, type: e.target.value}) : setFormData({...formData, type: e.target.value})}
                  >
                    <option value="GENERAL">General</option>
                    <option value="SPECIALTY">Specialty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Daily Slot Capacity</label>
                  <input type="number" min="1" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue" 
                    value={isEditModalOpen ? editingDept.slotCapacity : formData.slotCapacity} 
                    onChange={e => isEditModalOpen ? setEditingDept({...editingDept, slotCapacity: e.target.value}) : setFormData({...formData, slotCapacity: e.target.value})} 
                  />
                </div>
              </div>
              
              {isEditModalOpen && (
                <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-[11px] rounded-lg border border-blue-100">
                  <p><strong>Note:</strong> Changing the Daily Slot Capacity will automatically update the schedules of all {editingDept.doctors} doctor(s) assigned to this department.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-medium text-white bg-gabay-blue hover:bg-opacity-90 rounded-lg transition disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SECURE DELETE MODAL --- */}
      {isDeleteModalOpen && deptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden font-poppins">
            <div className="p-6 pt-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Deactivate Department</h3>
              <p className="text-sm text-gray-500 mb-6">
                You are about to deactivate the <strong className="text-gray-800">{deptToDelete.name}</strong> department. 
                This will prevent new appointments from being scheduled here.
              </p>
              
              <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  To confirm, type <strong>{deptToDelete.name}</strong> below:
                </label>
                <input 
                  type="text" 
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="w-full border border-gray-300 p-2 rounded-md text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  placeholder={deptToDelete.name}
                />
              </div>
            </div>

            <div className="flex justify-center gap-3 p-6 pt-0 mt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border hover:bg-gray-50 rounded-lg transition">
                Cancel
              </button>
              <button 
                onClick={executeDelete} 
                disabled={isSubmitting || deleteConfirmationText !== deptToDelete.name} 
                className="px-6 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Deactivating...' : 'Confirm Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}