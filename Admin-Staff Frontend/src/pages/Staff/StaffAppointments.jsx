import { useState, useMemo, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, SquarePen, Funnel, Bell, Download } from 'lucide-react';
import ApproveScheduleModal from '../../components/ApproveSchedModal';
import BookScheduleForm from './BookScheduleForm';
import ConfirmationModal from '../../components/confirmModal'; 
import { AuthContext } from '../../authContext';
import Button from '../../components/button';
import toast from 'react-hot-toast';
import ExcelJS from 'exceljs';

export default function StaffAppointments() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(location.state?.tab || location.state?.activeTab || 'pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('approve');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const [tempSortKey, setTempSortKey] = useState('date');
  const [tempSortOrder, setTempSortOrder] = useState('desc');
  const [tempSelectedDoctors, setTempSelectedDoctors] = useState([]);
  const [tempShowNewPatient, setTempShowNewPatient] = useState(false);
  const [tempSelectedDepartments, setTempSelectedDepartments] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'date', order: 'desc' });
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const itemsPerPage = 6;
  const { token, userRole } = useContext(AuthContext);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [approvedAppointments, setApprovedAppointments] = useState([]);
  const [rescheduledAppointments, setRescheduledAppointments] = useState([]);
  const [canceledAppointments, setCanceledAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const apiBase = userRole?.toUpperCase() === 'ADMIN' ? '/api/admin' : '/api/staff';

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache' 
        }
      });
      
      if (!response.ok) throw new Error("Failed to fetch appointments");
      
      const data = await response.json();
      
      // Updated status filtering for new workflow
      setPendingAppointments(data.filter(app => app.status === 'pending'));
      
      //"approved" is now the final status (no separate "confirmed" or "book" states)
      setApprovedAppointments(data.filter(app => app.status === 'approved'));
      
      // Rescheduled appointments
      setRescheduledAppointments(data.filter(app => app.status === 'rescheduled'));
      
      // Canceled and denied
      setCanceledAppointments(data.filter(app => ['canceled', 'denied'].includes(app.status)));
      
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAppointments();
  }, [token, apiBase]);

  // --- GET CURRENT TAB DATA FUNCTION ---
  const getCurrentData = () => {
    switch (activeTab) {
      case 'pending': return pendingAppointments;
      case 'approved': return approvedAppointments;  // CHANGED: Now shows finalized appointments
      case 'rescheduled': return rescheduledAppointments;
      case 'canceled': return canceledAppointments;
      default: return [];
    }
  };

  // --- GET UNIQUE DOCTORS FOR FILTERING ---
  const availableDoctors = useMemo(() => {
    const doctors = new Set();
    const allData = [...pendingAppointments, ...approvedAppointments, ...rescheduledAppointments, ...canceledAppointments];
    allData.forEach(a => {
      if (a.assignedDoctor) doctors.add(a.assignedDoctor);
    });
    return Array.from(doctors).sort();
  }, [pendingAppointments, approvedAppointments, rescheduledAppointments, canceledAppointments]);

  // --- GET UNIQUE DEPARTMENTS FOR FILTERING ---
  // UPDATED: Now shows ALL departments (not just assigned ones)
  const availableDepartments = useMemo(() => {
    const depts = new Set();
    const allData = [...pendingAppointments, ...approvedAppointments, ...rescheduledAppointments, ...canceledAppointments];
    allData.forEach(a => {
      if (a.department) depts.add(a.department);
    });
    return Array.from(depts).sort();
  }, [pendingAppointments, approvedAppointments, rescheduledAppointments, canceledAppointments]);

  // --- RESET FILTERS WHEN CHANGING TABS ---
  useEffect(() => {
    setSelectedDoctors([]);
    setShowNewPatient(false);
    setSelectedDepartments([]);
    setCurrentPage(1);
  }, [activeTab]);

  // --- HANDLE APPROVE ---
  const handleApprove = async (appointment) => {
    try {
      const selectedDate = approvedData.appointmentDate; 
      const doctorId = approvedData?.docID || selectedAppointment?.docID;
      
      if (!doctorId) {
        toast.error("You must assign a doctor before approving this date!");
        return; 
      }

      const checkRes = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments/check-availability?doctor_id=${doctorId}&date=${selectedDate}`, 
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      const availability = await checkRes.json();

      if (!availability.is_available) {
        toast.error(`Cannot schedule: ${availability.reason || "Slot is full!"}`);
        return; 
      }

      if (availability.slots_left === 1) {
        toast.success("Warning: This is the last available slot for this day!");
      }

      const payload = {
        assigned_date: selectedDate, 
        assigned_doctor_id: doctorId
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments/${approvedData.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload) 
      });

      if (!response.ok) throw new Error("Failed to approve appointment");

      await fetchAppointments(); 
      setModalOpen(false);
      toast.success("Appointment successfully approved & scheduled!");

    } catch (error) {
      console.error("Approval error:", error);
      toast.error("Failed to approve appointment.");
    }
  };

  // --- HANDLE DENY ---
  const handleDeny = (appointment) => {
    fetchAppointments();
    setModalOpen(false);
    toast.success('Appointment denied.');
  };

  // --- HANDLE NOTIFY PATIENT (REMINDER) ---
  const handleNotifyPatient = async (appointment) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments/${appointment.id}/send-reminder`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        toast.success('Reminder email sent to patient.');
      } else {
        toast.error('Failed to send reminder.');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Error sending reminder.');
    }
  };

  // --- GET FILTERED, SORTED, AND PAGINATED APPOINTMENTS ---
  const getFilteredAppointments = () => {
    let filtered = [...getCurrentData()];
    
    // Filter by selected departments
    if (selectedDepartments.length > 0) {
      filtered = filtered.filter(app => selectedDepartments.includes(app.department));
    }
    
    // Filter by doctors and new patient status
    if (activeTab === 'pending' || activeTab === 'approved' || activeTab === 'rescheduled' || activeTab === 'canceled') {
      if (selectedDoctors.length > 0 && !showNewPatient) {
        filtered = filtered.filter(app => selectedDoctors.includes(app.assignedDoctor));
      } else if (selectedDoctors.length === 0 && showNewPatient) {
        filtered = filtered.filter(app => !app.assignedDoctor);
      } else if (selectedDoctors.length > 0 && showNewPatient) {
        filtered = filtered.filter(app => selectedDoctors.includes(app.assignedDoctor) || !app.assignedDoctor);
      }
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(app => app.name.toLowerCase().includes(searchTerm.toLowerCase()) || app.hospitalNo.includes(searchTerm));
    }
    
    // Sort
    filtered.sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === 'date') {
        const dateStrA = activeTab === 'pending' ? a.requestedStartDate : a.appointmentDate;
        const dateStrB = activeTab === 'pending' ? b.requestedStartDate : b.appointmentDate;
        const dateA = new Date(dateStrA);
        const dateB = new Date(dateStrB);
        valA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        valB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      } else {
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
      }
      if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  };

  const filtered = getFilteredAppointments();
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const goToPage = (page) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  // --- RESET FILTERS ---
  const resetFilters = () => {
    setSortConfig({ key: 'date', order: 'desc' });
    setSelectedDoctors([]);
    setShowNewPatient(false);
    setSelectedDepartments([]);
    setCurrentPage(1);
    setTempSortKey('date');
    setTempSortOrder('desc');
    setTempSelectedDoctors([]);
    setTempShowNewPatient(false);
    setTempSelectedDepartments([]);
    toast.success('Filters reset.');
  };

  // --- APPLY FILTERS ---
  const applyFilters = () => {
    setSortConfig({ key: tempSortKey, order: tempSortOrder });
    setSelectedDoctors(tempSelectedDoctors);
    setShowNewPatient(tempShowNewPatient);
    setSelectedDepartments(tempSelectedDepartments);
    setCurrentPage(1);
    setShowFilterDropdown(false);
    toast.success('Filters applied.');
  };

  // --- EXPORT TO EXCEL ---
  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Appointments');
      
      const headers = ['Patient Name', 'Hospital No', 'Department', 'Reason', 'Status', 'Assigned Doctor', 'Appointment Date', 'Batch Time'];
      worksheet.addRow(headers);
      
      filtered.forEach(app => {
        worksheet.addRow([
          app.name,
          app.hospitalNo,
          app.department || 'N/A',
          app.reason,
          app.status.toUpperCase(),
          app.assignedDoctor || 'TBD',
          app.appointmentDate,
          app.batch
        ]);
      });

      worksheet.columns.forEach(column => { column.width = 18; });
      
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointments_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export.');
    }
  };

  // --- TAB CONFIGURATION ---
  const tabs = [
    { key: 'pending', label: 'Pending Approval', count: pendingAppointments.length, color: 'text-gray-600' },
    { key: 'approved', label: 'Approved', count: approvedAppointments.length, color: 'text-green-600' },
    { key: 'rescheduled', label: 'Rescheduled', count: rescheduledAppointments.length, color: 'text-yellow-600' },
    { key: 'canceled', label: 'Canceled/Denied', count: canceledAppointments.length, color: 'text-red-600' }
  ];

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gabay-blue px-6 py-6 mb-4 text-white rounded-xl shadow-sm">
        <div>
          <h1 className="font-montserrat text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="font-poppins text-sm text-white/90 mt-1">
            Manage All Hospital Appointments &gt; <span className="text-white font-medium underline underline-offset-4">All Departments</span>
          </p>
        </div>
        <button 
          onClick={exportToExcel}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gabay-blue font-bold font-poppins text-sm rounded-lg hover:bg-teal-50 transition-all shadow-lg active:scale-95 disabled:opacity-50 group"
        >
          <Download size={18} />
          Export to Excel
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <p className="font-poppins text-gray-500">Loading appointments...</p>
        </div>
      ) : (
        <>
          {/* TABS */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 rounded-lg font-poppins font-medium text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-gabay-blue text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                <span className={`ml-2 font-bold ${tab.color}`}>({tab.count})</span>
              </button>
            ))}
          </div>

          {/* SEARCH & FILTER */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by patient name or hospital number..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gabay-blue"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
              >
                <Funnel size={18} />
                Filters
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-6 z-20 w-80 max-h-[500px] overflow-y-auto">
                  {/* Sort Options */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
                    <div className="flex gap-2">
                      <select
                        value={tempSortKey}
                        onChange={(e) => setTempSortKey(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="date">Date</option>
                        <option value="name">Patient Name</option>
                      </select>
                      <select
                        value={tempSortOrder}
                        onChange={(e) => setTempSortOrder(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </div>
                  </div>

                  {/* Doctor Filter */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Doctors</label>
                    <div className="space-y-2">
                      {availableDoctors.map(doctor => (
                        <label key={doctor} className="flex items-center gap-2 group cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSelectedDoctors.includes(doctor)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempSelectedDoctors([...tempSelectedDoctors, doctor]);
                              } else {
                                setTempSelectedDoctors(tempSelectedDoctors.filter(d => d !== doctor));
                              }
                            }}
                            className="w-4 h-4 rounded accent-gabay-blue"
                          />
                          <span className="text-gray-600 group-hover:text-gabay-blue transition-colors">{doctor}</span>
                        </label>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 mt-3 group cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempShowNewPatient}
                        onChange={(e) => setTempShowNewPatient(e.target.checked)}
                        className="w-4 h-4 rounded accent-gabay-blue"
                      />
                      <span className="text-gray-600 group-hover:text-gabay-blue transition-colors">New Patients (No Doctor)</span>
                    </label>
                  </div>

                  {/* UPDATED: Department Filter - Now shows ALL departments */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Departments (All Hospital)</label>
                    <div className="space-y-2">
                      {availableDepartments.map(dept => (
                        <label key={dept} className="flex items-center gap-2 group cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tempSelectedDepartments.includes(dept)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTempSelectedDepartments([...tempSelectedDepartments, dept]);
                              } else {
                                setTempSelectedDepartments(tempSelectedDepartments.filter(d => d !== dept));
                              }
                            }}
                            className="w-4 h-4 rounded accent-gabay-blue"
                          />
                          <span className="text-gray-600 group-hover:text-gabay-blue transition-colors">{dept}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={resetFilters} className="flex-1 py-2 text-xs font-poppins font-medium border border-gray-400 rounded-lg text-gray-400 hover:text-red-500 transition-colors">Reset All</button>
                    <button onClick={applyFilters} className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium shadow-md hover:bg-opacity-90 transition-all">Apply</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Appointments List (cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginated.length === 0 ? (
              <div className="col-span-2 bg-white rounded-md shadow-sm border border-gray-100 p-6 text-center">
                <p className="font-poppins text-gray-500">No appointments found.</p>
              </div>
            ) : (
              paginated.map(app => (
                <div key={app.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition">
                  <div className="flex flex-col md:flex-row justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-montserrat text-xl font-semibold text-gabay-navy">{app.name}</p>
                          <p className="font-poppins text-md text-gabay-navy">{app.hospitalNo}</p>
                          <p className="font-poppins text-sm text-gray-500">{app.department}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-poppins tracking-wide ${
                            app.status?.toLowerCase() === 'pending' ? 'bg-gray-100 text-gray-600 font-medium' :
                            app.status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-800 font-bold' : 
                            app.status?.toLowerCase() === 'rescheduled' ? 'bg-yellow-100 text-yellow-800 font-bold border border-yellow-200' :
                            (app.status?.toLowerCase() === 'canceled' || app.status?.toLowerCase() === 'denied') ? 'bg-red-100 text-red-800 font-medium' :
                            'bg-gray-100 text-gray-800 font-medium'
                          }`}>
                            {app.status ? app.status.toUpperCase() : 'UNKNOWN'}
                          </span>

                          {activeTab === 'pending' && (
                            <button onClick={() => { setSelectedAppointment(app); setModalMode('approve'); setModalOpen(true); }}
                              className="text-gabay-blue hover:text-gabay-navy transition" title="Approve">
                              <SquarePen size={24} />
                            </button>
                          )}

                          {activeTab === 'approved' && (
                            <button onClick={() => {
                              navigate('/staff/reschedule', { state: { appointment: app } });
                            }}
                              className="text-gabay-blue hover:text-gabay-navy transition" title="Reschedule">
                              <SquarePen size={24} />
                            </button>
                          )}

                          {activeTab === 'rescheduled' && (
                            <button onClick={() => {
                                setConfirmConfig({
                                  isOpen: true,
                                  type: 'info',
                                  title: 'Send Patient Reminder',
                                  message: `Send a reminder email to ${app.name} about their rescheduled appointment?`,
                                  onConfirm: () => {
                                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                                    handleNotifyPatient(app);
                                  }
                                });
                              }}
                              className="text-orange-500 hover:text-orange-700 transition" title="Send Reminder to Patient">
                              <Bell size={24} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="font-poppins text-sm text-gray-700 mb-2"><span className="font-semibold">Reason:</span> {app.reason}</p>
                        {activeTab === 'pending' && (
                          <p className="font-poppins text-sm text-gray-700 mb-2"><span className="font-semibold">Requested Dates:</span> {app.requestedStartDate} - {app.requestedEndDate}</p>
                        )}
                        {(activeTab === 'approved' || activeTab === 'rescheduled' || activeTab === 'canceled') && (
                          <>
                            <p className="font-poppins text-sm text-gray-700 mb-2">
                              <span className="font-semibold">Appointment Date:</span>{' '}
                              {app.appointmentDate
                                ? typeof app.appointmentDate === 'string'
                                  ? app.appointmentDate
                                  : app.appointmentDate.toLocaleDateString()
                                : 'Not set'}
                            </p>
                            <p className="font-poppins text-sm text-gray-700 mb-2">
                              <span className="font-semibold">Batch Time:</span> {app.batch}
                            </p>
                            {/* UPDATED: Show approving staff name for validated appointments */}
                            {app.approvingStaffName && (
                              <p className="font-poppins text-sm text-gabay-teal border-t pt-2 mt-2">
                                <span className="font-semibold">Approved by:</span> {app.approvingStaffName}
                              </p>
                            )}
                          </>
                        )}
                        {app.assignedDoctor && <p className="font-poppins text-sm text-gray-700"><span className="font-semibold">Doctor:</span> {app.assignedDoctor}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center py-5 bg-gray-50 border-t border-gray-200 mt-6">
              <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 text-gabay-blue hover:bg-gray-200 rounded-full disabled:text-gray-300 disabled:bg-transparent disabled:cursor-not-allowed focus:outline-none transition-all"><ChevronLeft size={20} /></button>
              <span className="mx-6 font-poppins text-sm text-gabay-navy font-semibold">Page {currentPage} of {totalPages}</span>
              <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 text-gabay-blue hover:bg-gray-200 rounded-full disabled:text-gray-300 disabled:bg-transparent disabled:cursor-not-allowed focus:outline-none transition-all"><ChevronRight size={20} /></button>
            </div>
          )}
        </>
      )}

      {activeTab === 'book' && (
        <BookScheduleForm 
          onSuccess={() => {
            fetchAppointments();
            setActiveTab('approved');
            setCurrentPage(1);
          }} 
          token={token} 
        />
      )}

      {selectedAppointment && modalMode === 'approve' && (
        <ApproveScheduleModal 
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
          appointment={selectedAppointment} 
          onApprove={handleApprove} 
          onDeny={handleDeny}
          token={token}
        />
      )}

      <ConfirmationModal 
        {...confirmConfig} 
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}
