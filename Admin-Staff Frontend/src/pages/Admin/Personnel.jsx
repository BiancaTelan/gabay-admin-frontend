import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Search, Download, Funnel, Plus, Edit3, Trash2, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { AuthContext } from '../../authContext';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import AddDoctorModal from '../../components/AddDoctorModal';

export default function Personnel() {
  const { token } = useContext(AuthContext);

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [doctorsData, setDoctorsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorToDelete, setDoctorToDelete] = useState(null);

  const [filters, setFilters] = useState({
    sortKey: 'name', sortOrder: 'asc', availabilities: ['Available', 'Unavailable']
  });

  const itemsPerPage = 10;

  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/personnel`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch personnel');
      const data = await response.json();
      
      const onlyDoctors = data.filter(person => person.role === 'DOCTOR');
      setDoctorsData(onlyDoctors);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (token) fetchDoctors(); }, [token]);

  const handleDeleteDoctor = async () => {
    if (!doctorToDelete) return;
    const loadingToast = toast.loading("Removing doctor...");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/doctors/${doctorToDelete.raw_id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to remove doctor.');
      toast.dismiss(loadingToast);
      toast.success('Doctor removed successfully.');
      setDoctorToDelete(null);
      fetchDoctors();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.message);
    }
  };

  const filteredData = useMemo(() => {
    let result = doctorsData.filter(item => 
      (item.name && item.name.toLowerCase().includes(search.toLowerCase())) || 
      (item.id && String(item.id).toLowerCase().includes(search.toLowerCase()))
    );

    if (filters.availabilities.length > 0) {
      result = result.filter(i => filters.availabilities.includes(i.status === 'Active' ? 'Available' : 'Unavailable'));
    }

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
      { header: 'Doctor ID', key: 'id', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Department', key: 'dept', width: 25 },
      { header: 'Schedule', key: 'schedule', width: 25 },
      { header: 'Time', key: 'time', width: 20 },
      { header: 'Availability', key: 'status', width: 15 }
    ];

    filteredData.forEach(doc => {
      worksheet.addRow({
        id: doc.id, name: doc.name, dept: doc.dept, schedule: doc.schedule,
        time: doc.time, status: doc.status === 'Active' ? 'Available' : 'Unavailable'
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
            <Download size={16} /> Export
          </button>

          <div className="relative flex-1 lg:flex-none">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors">
              <Funnel size={16} /> Filter ({filters.availabilities.length})
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-2">Sort By</p>
                  <div className="flex flex-col gap-2">
                    <select value={filters.sortKey} className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:ring-2 focus:ring-gabay-blue/10" onChange={(e) => setFilters({...filters, sortKey: e.target.value})}>
                      <option value="name">Name</option><option value="id">Doctor ID</option>
                    </select>
                    <select value={filters.sortOrder} className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:ring-2 focus:ring-gabay-blue/10" onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}>
                      <option value="asc">Ascending (A-Z)</option><option value="desc">Descending (Z-A)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-2">Availability</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['Available', 'Unavailable'].map(a => (
                      <label key={a} className="flex items-center gap-2 text-sm text-gray-600 font-poppins cursor-pointer">
                        <input type="checkbox" checked={filters.availabilities.includes(a)} onChange={(e) => {
                            const newAvails = e.target.checked ? [...filters.availabilities, a] : filters.availabilities.filter(x => x !== a);
                            setFilters({...filters, availabilities: newAvails});
                          }} className="w-4 h-4 rounded accent-gabay-blue" /> {a}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2"> 
                  <button onClick={() => setFilters({ sortKey: 'name', sortOrder: 'asc', availabilities: [] })} className="flex-1 py-2 text-xs border border-gray-400 rounded-lg font-poppins font-medium text-gray-400 hover:text-red-500 transition-colors">Reset</button>
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
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-gabay-blue font-poppins text-white select-none">
              <tr>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Doctor ID</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Name</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Department</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Schedule</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Time</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider">Availability</th>
                <th className="px-4 py-4 text-[12px] md:text-xs font-bold uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedData.map((doc) => {
                const isAvailable = doc.status === 'Active';
                return (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700 font-medium">{doc.id}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gabay-blue font-medium">{doc.name}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-700">{doc.dept}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-700">{doc.schedule}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-500">{doc.time}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-[11px] uppercase md:text-[12px] font-poppins font-medium text-gray-700">
                        <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-gabay-green' : 'bg-red-500'}`} />
                        {isAvailable ? 'Available' : 'Unavailable'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setEditingDoctor(doc); setIsAddModalOpen(true); }} className="p-1.5 text-gabay-teal hover:bg-teal-50 rounded-lg transition-colors" title="Edit Doctor"><Edit3 size={18}/></button>
                        <button onClick={() => setDoctorToDelete(doc)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Remove Doctor"><Trash2 size={18}/></button>
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

      {doctorToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 font-poppins text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4"><AlertTriangle size={32} className="text-red-500" /></div>
            <h3 className="text-lg font-bold text-gabay-blue mb-2">Remove Doctor Record?</h3>
            <p className="text-sm text-gray-500 mb-6">You are about to permanently remove <strong>{doctorToDelete.name}</strong> from the system. This action cannot be undone. Are you sure you want to proceed?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDoctorToDelete(null)} className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleDeleteDoctor} className="px-5 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg">Yes, Remove Doctor</button>
            </div>
          </div>
        </div>
      )}

      <AddDoctorModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchDoctors} editData={editingDoctor} />
    </div>
  );
}