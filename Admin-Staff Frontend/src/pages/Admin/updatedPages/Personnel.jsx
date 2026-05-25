import React, { useState, useMemo, useEffect, useContext } from 'react';
import { Search, Download, Funnel, Plus, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthContext } from '../../authContext';
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import DoctorModal from './DoctorModal';

export default function Personnel() {
  const { token } = useContext(AuthContext);

  // --- STATE ---
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [personnelData, setPersonnelData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [doctorModal, setDoctorModal] = useState({
    isOpen: false,
    selectedDoctor: null 
  });

  const [filters, setFilters] = useState({
    sortKey: 'name',
    sortOrder: 'asc',
    deptType: ['General', 'Specialty']
  });

  const itemsPerPage = 10;

  const fetchPersonnelData = async () => {
    setIsLoading(true);
    try {
      const personnelRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/personnel`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!personnelRes.ok) throw new Error('Failed to fetch personnel data');
      const pData = await personnelRes.json();
      setPersonnelData(pData);

      const deptRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/departments`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!deptRes.ok) throw new Error('Failed to fetch departments reference metadata');
      const dData = await deptRes.json();
      setDepartments(dData);

    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPersonnelData();
  }, [token]);

  // --- FILTER & SORT LOGIC ---
  const filteredData = useMemo(() => {
    let result = personnelData.filter(item => 
      (item.name && item.name.toLowerCase().includes(search.toLowerCase())) || 
      (item.id && String(item.id).toLowerCase().includes(search.toLowerCase())) ||
      (item.dept && item.dept.toLowerCase().includes(search.toLowerCase()))
    );

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
      { header: 'Department Type', key: 'deptType', width: 20 },
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'Department', key: 'dept', width: 30 },
      { header: 'Schedule', key: 'schedule', width: 20 },
      { header: 'Working Hours', key: 'time', width: 25 }
    ];

    filteredData.forEach(person => {
      worksheet.addRow({
        id: person.id,
        deptType: person.isSpecialty ? 'SPECIALTY' : 'GENERAL',
        name: person.name,
        dept: person.dept,
        schedule: person.schedule,
        time: person.time
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

  // --- PAGINATION CALCULATIONS ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const entryStart = filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, filteredData.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue">Doctor List</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">Main Menu &gt; Doctors</p>
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
          <button 
            onClick={() => setDoctorModal({ isOpen: true, selectedDoctor: null })} 
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-gabay-teal text-white font-medium font-poppins text-sm hover:bg-gabay-teal2 transition"
          >
            <Plus size={16} /> 
            <span className="hidden sm:inline">New Doctor</span>
            <span className="sm:hidden">Doctor</span> 
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
              <Funnel size={16} /> Filter ({filters.deptType.length})
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5 max-h-[500px] overflow-y-auto scrollbar-thin">
                {/* SORTING SECTION */}
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Sort By</p>
                  <div className="space-y-3">
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

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-1">Department reference</p>
                  <select 
                    className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 mt-1 outline-none focus:ring-2 focus:ring-gabay-blue/10"
                    defaultValue=""
                  >
                    <option value="" disabled>Choose Department</option>
                    {departments.map(d => (
                      <option key={d.deptID || d.id} value={d.deptID || d.id}>{d.department || d.name}</option>
                    ))}
                  </select>
                </div>

                {/* DEPARTMENT TYPE */}
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Department Type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {['General', 'Specialty'].map(t => (
                      <label key={t} className="flex items-center gap-2 text-sm cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded accent-gabay-blue"
                          checked={filters.deptType.includes(t)}
                          onChange={(e) => {
                            const newTypes = e.target.checked ? [...filters.deptType, t] : filters.deptType.filter(x => x !== t);
                            setFilters({...filters, deptType: newTypes});
                          }}
                        /> 
                        <span className="text-gray-600 font-poppins group-hover:text-gabay-blue transition-colors">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button 
                    onClick={() => setFilters({ sortKey: 'name', sortOrder: 'asc', deptType: [] })}
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

      {/* DATA TABLE */}
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
                  <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Department Type</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Name</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Department</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Schedule</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider">Time</th>
                  <th className="px-4 py-4 text-[12px] md:text-xs font-poppins font-bold uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedData.map((person) => (
                  <tr 
                    key={person.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-700 font-medium">{person.id}</td>
                    <td className="px-4 py-4">
                      {person.isSpecialty ? (
                        <span className="px-3 py-0.5 rounded-full text-[12px] md:text-[11px] font-poppins font-bold bg-orange-100 text-gabay-orange">
                          SPECIALTY
                        </span>
                      ) : (
                        <span className="px-3 py-0.5 rounded-full text-[12px] md:text-[11px] font-poppins font-bold bg-blue-100 text-blue-700">
                          GENERAL
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gabay-blue font-medium">{person.name}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-700">{person.dept}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-700">{person.schedule}</td>
                    <td className="px-4 py-4 text-xs font-poppins md:text-sm text-gray-500">{person.time}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => setDoctorModal({ isOpen: true, selectedDoctor: person })} 
                          className="p-1.5 text-gabay-teal hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <Edit3 size={18}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION INTERFACE CONTROLS */}
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

      <DoctorModal 
        isOpen={doctorModal.isOpen}
        selectedDoctor={doctorModal.selectedDoctor}
        onClose={() => setDoctorModal({ isOpen: false, selectedDoctor: null })}
        onRefresh={fetchPersonnelData}
        token={token}
        departments={departments}
      />
    </div>
  );
}