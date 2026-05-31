import React, { useState, useMemo, useEffect, useContext } from 'react';
import { 
  Search, Download, Funnel, CheckCircle, 
  MinusCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { AuthContext } from '../../authContext'; 
import { toast } from 'react-hot-toast';
import ExcelJS from 'exceljs';
import UserStatusModal from '../../components/UserStatusModal';

export default function Patient() {
  const { token } = useContext(AuthContext);

  // --- STATE ---
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [patientsData, setPatientsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    patient: null,
    actionType: ''
  });

  const [filters, setFilters] = useState({
    sortKey: 'name', sortOrder: 'asc', genders: [], statuses: []
  });

  const itemsPerPage = 10;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; 
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}/${date.getFullYear()}`;
  };

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/patients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch patient accounts.');
      const data = await response.json();
      setPatientsData(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (token) fetchPatients(); }, [token]);

  const filteredData = useMemo(() => {
    let result = patientsData.filter(item => 
      (item.name && item.name.toLowerCase().includes(search.toLowerCase())) || 
      (item.id && String(item.id).toLowerCase().includes(search.toLowerCase())) ||
      (item.email && item.email.toLowerCase().includes(search.toLowerCase())) ||
      (item.phone && String(item.phone).toLowerCase().includes(search.toLowerCase()))
    );

    if (filters.genders.length > 0) result = result.filter(i => filters.genders.includes(i.gender));
    if (filters.statuses.length > 0) result = result.filter(i => filters.statuses.includes(i.status));

    result.sort((a, b) => {
      let valA = String(a[filters.sortKey] || '');
      let valB = String(b[filters.sortKey] || '');
      const comparison = valA.localeCompare(valB, 'en', { numeric: true, sensitivity: 'base' });
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [search, filters, patientsData]); 

  // --- MODAL TRIGGER & EXECUTION ---
  const confirmToggleStatus = (rawId, currentStatus, patientName) => {
    setStatusModal({
      isOpen: true,
      patient: { rawId, name: patientName },
      actionType: currentStatus === 'Active' ? 'deactivate' : 'reactivate'
    });
  };

  const executeStatusChange = async () => {
    if (!statusModal.patient) return;
    setIsSubmitting(true);
    
    const { rawId, name } = statusModal.patient;
    const nextStatus = statusModal.actionType === 'deactivate' ? 'Deactivated' : 'Active';

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/patients/${rawId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) throw new Error(`Failed to update status to ${nextStatus}`);
      
      toast.success(`${name} has been successfully ${nextStatus === 'Active' ? 'reactivated' : 'deactivated'}!`);
      setStatusModal({ isOpen: false, patient: null, actionType: '' });
      fetchPatients(); 
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      toast.error("No patient data available to export."); return;
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('GABAY Patients');

    worksheet.columns = [
      { header: 'Hospital Number', key: 'id', width: 20 },
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'Contact Number', key: 'phone', width: 20 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Account Status', key: 'status', width: 18 },
      { header: 'Join Date', key: 'joinDate', width: 15 }
    ];

    filteredData.forEach(p => {
      worksheet.addRow({
        id: p.id, name: p.name, email: p.email, phone: p.phone,
        gender: p.gender, status: p.status, joinDate: formatDate(p.joinDate)
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
    link.setAttribute('download', `GABAY_Patients_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast.success("Excel ledger downloaded successfully!");
  };

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const pagedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue">Patient List</h1>
        <p className="text-xs md:text-sm font-poppins text-gray-500">Main Menu &gt; Patients</p>
      </div>

      <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
        <div className="relative w-full lg:w-96">
          <input type="text" value={search} onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}} placeholder="Search Name, Email, Phone, or Hospital Number..." className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20 text-sm" />
          <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
        </div>

        <div className="flex flex-row gap-2 w-full lg:w-auto">
          <button onClick={handleExportExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors">
            <Download size={16} /> Export as Excel
          </button>
          
          <div className="relative flex-1 lg:flex-none">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium hover:bg-teal-50 transition-colors">
              <Funnel size={16} /> Filter ({filters.genders.length + filters.statuses.length})
            </button>
            
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-2">Sort Criteria</p>
                  <div className="flex flex-col gap-2">
                    <select value={filters.sortKey} className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:ring-2 focus:ring-gabay-blue/10" onChange={(e) => setFilters({...filters, sortKey: e.target.value})}>
                      <option value="name">Name</option><option value="id">Hospital Number</option><option value="joinDate">Join Date</option>
                    </select>
                    <select value={filters.sortOrder} className="w-full text-sm font-poppins border rounded-lg p-2 outline-none focus:ring-2 focus:ring-gabay-blue/10" onChange={(e) => setFilters({...filters, sortOrder: e.target.value})}>
                      <option value="asc">Ascending (A-Z / Oldest)</option><option value="desc">Descending (Z-A / Newest)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-2">Gender</p>
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
                  <button onClick={() => setFilters({ sortKey: 'name', sortOrder: 'asc', genders: [], statuses: [] })} className="flex-1 py-2 text-xs border border-gray-400 rounded-lg font-poppins font-medium text-gray-400 hover:text-red-500 transition-colors">Reset</button>
                  <button onClick={() => setShowFilterDropdown(false)} className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium hover:bg-opacity-90 transition">Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500 font-poppins">Loading system patient matrix...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-gabay-blue font-poppins text-white select-none">
                <tr>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Hospital Number</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Name</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Email</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Contact Number</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Gender</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider">Join Date</th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 cursor-default">
                {pagedData.map((patient) => (
                  <tr key={patient.patient_id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-sm font-poppins text-gray-700 font-semibold">{patient.id}</td>
                    <td className="px-4 py-4 text-sm font-poppins text-gabay-blue font-medium">{patient.name}</td>
                    <td className="px-4 py-4 text-sm font-poppins text-gray-600">{patient.email}</td>
                    <td className="px-4 py-4 text-sm font-poppins text-gray-600">{patient.phone}</td>
                    <td className="px-4 py-4 text-sm font-poppins text-gray-600">{patient.gender}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-[11px] md:text-xs uppercase font-poppins font-semibold">
                        <div className={`w-2 h-2 rounded-full ${patient.status === 'Active' ? 'bg-gabay-green' : 'bg-gabay-orange'}`} />
                        <span className={patient.status === 'Active' ? 'text-green-700' : 'text-gabay-orange'}>{patient.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs md:text-sm font-poppins text-gray-500">{formatDate(patient.joinDate)}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center items-center">
                        {patient.status === 'Active' ? (
                          <button disabled={isSubmitting} onClick={() => confirmToggleStatus(patient.raw_id, patient.status, patient.name)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                            <MinusCircle size={14}/> Deactivate
                          </button>
                        ) : (
                          <button disabled={isSubmitting} onClick={() => confirmToggleStatus(patient.raw_id, patient.status, patient.name)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gabay-green border border-green-200 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50">
                            <CheckCircle size={14}/> Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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

      <UserStatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ isOpen: false, patient: null, actionType: '' })}
        onConfirm={executeStatusChange}
        user={statusModal.patient} 
        actionType={statusModal.actionType}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}