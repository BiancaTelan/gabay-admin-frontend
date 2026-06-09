import { useState, useMemo, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, SquarePen, Funnel, Bell } from 'lucide-react';
import ApproveScheduleModal from '../../components/ApproveSchedModal';
import BookScheduleForm from './BookScheduleForm';
import ConfirmationModal from '../../components/confirmModal'; 
import { AuthContext } from '../../authContext';
import toast from 'react-hot-toast';

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
  const [sortConfig, setSortConfig] = useState({ key: 'date', order: 'desc' });
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const itemsPerPage = 6;
  const { token, userRole } = useContext(AuthContext);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [approvedAppointments, setApprovedAppointments] = useState([]);
  const [bookedAppointments, setBookedAppointments] = useState([]);
  const [canceledAppointments, setCanceledAppointments] = useState([]);
  const [confirmedAppointments, setConfirmedAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const apiBase = userRole?.toUpperCase() === 'ADMIN' ? '/api/admin' : '/api/staff';

  // --- FETCH APPOINTMENTS FUNCTION ---
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
      
      setPendingAppointments(data.filter(app => app.status === 'pending'));
      setConfirmedAppointments(data.filter(app => app.status === 'approved' || app.status === 'rescheduled'));
      setApprovedAppointments(data.filter(app => app.status === 'confirmed' || app.status === 'book'));
      setCanceledAppointments(data.filter(app => ['canceled', 'denied'].includes(app.status)));
      
    } catch (error) {
      console.error("Error fetching appointments:", error);
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
      case 'approved': return confirmedAppointments; 
      case 'book': return bookedAppointments;
      case 'canceled': return canceledAppointments;
      default: return [];
    }
  };

  // --- GET UNIQUE DOCTORS FOR FILTERING ---
  const availableDoctors = useMemo(() => {
    const doctors = new Set();
    const allData = [...pendingAppointments, ...approvedAppointments, ...confirmedAppointments, ...canceledAppointments];
    
    allData.forEach(a => {
      if (a.assignedDoctor) doctors.add(a.assignedDoctor);
    });
    return Array.from(doctors).sort();
  }, [pendingAppointments, approvedAppointments, confirmedAppointments, canceledAppointments]);

  // --- RESET FILTERS WHEN CHANGING TABS ---
  useEffect(() => {
    setSelectedDoctors([]);
    setShowNewPatient(false);
    setCurrentPage(1);
  }, [activeTab]);

  // --- GET FILTERED, SORTED, AND PAGINATED APPOINTMENTS ---
  const getFilteredAppointments = () => {
    let filtered = [...getCurrentData()];
    
    if (activeTab === 'pending' || activeTab === 'approved' || activeTab === 'canceled') {
      if (selectedDoctors.length > 0 && !showNewPatient) {
        filtered = filtered.filter(app => selectedDoctors.includes(app.assignedDoctor));
      } else if (selectedDoctors.length === 0 && showNewPatient) {
        filtered = filtered.filter(app => !app.assignedDoctor);
      } else if (selectedDoctors.length > 0 && showNewPatient) {
        filtered = filtered.filter(app => selectedDoctors.includes(app.assignedDoctor) || !app.assignedDoctor);
      }
    }
    if (searchTerm) {
      filtered = filtered.filter(app => app.name.toLowerCase().includes(searchTerm.toLowerCase()) || app.hospitalNo.includes(searchTerm));
    }
    filtered.sort((a, b) => {
      let valA, valB;
      if (sortConfig.key === 'date') {
        const dateStrA = activeTab === 'pending' ? a.submissionDate : a.appointmentDate;
        const dateStrB = activeTab === 'pending' ? b.submissionDate : b.appointmentDate;
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

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // --- HANDLE APPROVE APPOINTMENT ---
  const handleApprove = async (approvedData) => {
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

  // --- HANDLE DENY APPOINTMENT ---
  const handleDeny = async (appointmentId, reason) => {
    const targetId = appointmentId || selectedAppointment?.id;
    const reasonText = reason;
    
    if (!reasonText || typeof reasonText !== 'string' || !reasonText.trim()) {
      toast.error("Please provide a reason for denying this appointment.");
      return;
    }

    const loadingToast = toast.loading("Denying appointment and notifying patient...");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments/${appointmentId}/deny`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reason }) 
      });

      if (!response.ok) throw new Error("Failed to deny appointment");

      await fetchAppointments(); 
      setModalOpen(false);
      
      toast.success("Appointment denied and patient notified.", { id: loadingToast });
    } catch (error) {
      console.error("Deny error:", error);
      toast.error("Failed to deny appointment.", { id: loadingToast });
    }
  };

  // --- HANDLE NOTIFY PATIENT ---
  const handleNotifyPatient = async (appointment) => {
    const loadingToast = toast.loading("Sending reminder to patient...");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/appointments/${appointment.id}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to notify patient");
      }

      toast.success("Reminder successfully sent to the patient's email!", { id: loadingToast });
    } catch (error) {
      console.error("Notify error:", error);
      toast.error(error.message, { id: loadingToast });
    }
  };

  const tabs = [
    { id: 'pending', label: 'PENDING APPROVAL' },
    { id: 'approved', label: 'APPROVED SCHEDULES' },
    { id: 'book', label: 'BOOK SCHEDULES' },
    { id: 'canceled', label: 'CANCELED SCHEDULES' },
  ];

  // --- FILTER & SORT HANDLERS ---
  const openFilter = () => {
    setTempSortKey(sortConfig.key);
    setTempSortOrder(sortConfig.order);
    setTempSelectedDoctors([...selectedDoctors]);
    setTempShowNewPatient(showNewPatient);
    setShowFilterDropdown(true);
  };

  const applyFilters = () => {
    setSortConfig({ key: tempSortKey, order: tempSortOrder });
    setSelectedDoctors([...tempSelectedDoctors]);
    setShowNewPatient(tempShowNewPatient);
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  const resetFilters = () => {
    setTempSortKey('date');
    setTempSortOrder('asc');
    setTempSelectedDoctors([]);
    setTempShowNewPatient(false);
    setSortConfig({ key: 'date', order: 'asc' });
    setSelectedDoctors([]);
    setShowNewPatient(false);
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gabay-blue px-6 py-6 mb-4">
        <div>
          <h1 className="font-montserrat text-3xl font-bold text-white tracking-tight">
            Appointment Management
          </h1>
          <p className="font-poppins text-sm text-white/90 mt-1">
            Appointment Management &gt; <span className="text-white font-medium underline underline-offset-4">
              {tabs.find(t => t.id === activeTab)?.label || 'Pending Approval'}
            </span>
          </p>
        </div>
      </div>

      <div className="w-full border border-gabay-blue overflow-hidden mb-6">
        <div className="grid grid-cols-5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`py-2 text-md font-poppins font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gabay-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

       {activeTab !== 'book' && (
        <>
          <div className="flex flex-col lg:flex-row justify-between gap-4 items-center">
            <div className="relative w-full lg:w-96">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search Patient..."
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg font-poppins outline-none focus:ring-2 focus:ring-gabay-blue/20"
              />
              <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            </div>
            <button onClick={openFilter} className="flex items-center gap-2 px-4 py-2 bg-white border border-gabay-teal text-gabay-teal rounded-lg text-sm font-poppins font-medium">
              <Funnel size={16} /> Filter & Sort
            </button>
          </div>

          {showFilterDropdown && (
            <div className="relative">
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] p-5 space-y-5">
                <div>
                  <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Sort By</p>
                  <div className="space-y-3">
                    <select value={tempSortKey} onChange={(e) => setTempSortKey(e.target.value)} className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-gabay-blue/10">
                      <option value="name">Name</option>
                      <option value="date">Date</option>
                    </select>
                    <select value={tempSortOrder} onChange={(e) => setTempSortOrder(e.target.value)} className="w-full text-sm font-poppins border border-gray-200 rounded-lg p-2 outline-none focus:ring-2 focus:ring-gabay-blue/10">
                      <option value="asc">Ascending (A-Z / Oldest first)</option>
                      <option value="desc">Descending (Z-A / Newest first)</option>
                    </select>
                  </div>
                </div>

                {(activeTab === 'pending' || activeTab === 'approved' || activeTab === 'canceled') && (
                  <div>
                    <p className="text-[10px] font-bold font-poppins text-gray-400 uppercase tracking-widest mb-3">Filter by Doctor</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      <label className="flex items-center gap-2 text-sm font-poppins cursor-pointer group">
                        <input type="checkbox" checked={tempShowNewPatient} onChange={(e) => setTempShowNewPatient(e.target.checked)} className="w-4 h-4 rounded accent-gabay-blue" />
                        <span className="text-gray-600 group-hover:text-gabay-blue transition-colors">New Patient (No Doctor)</span>
                      </label>
                      {availableDoctors.map(doctor => (
                        <label key={doctor} className="flex items-center gap-2 text-sm font-poppins cursor-pointer group">
                          <input type="checkbox" checked={tempSelectedDoctors.includes(doctor)} onChange={(e) => {
                            if (e.target.checked) setTempSelectedDoctors([...tempSelectedDoctors, doctor]);
                            else setTempSelectedDoctors(tempSelectedDoctors.filter(d => d !== doctor));
                          }} className="w-4 h-4 rounded accent-gabay-blue" />
                          <span className="text-gray-600 group-hover:text-gabay-blue transition-colors">{doctor}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={resetFilters} className="flex-1 py-2 text-xs font-poppins font-medium border border-gray-400 rounded-lg text-gray-400 hover:text-red-500 transition-colors">Reset All</button>
                  <button onClick={applyFilters} className="flex-1 py-2 bg-gabay-blue text-white rounded-lg text-xs font-poppins font-medium shadow-md hover:bg-opacity-90 transition-all">Apply</button>
                </div>
              </div>
            </div>
          )}

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
                        </div>
                        <div className="flex items-center gap-2">
                          
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-poppins tracking-wide ${
                            app.status?.toLowerCase() === 'pending' ? 'bg-gray-100 text-gray-600 font-medium' :
                            app.status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-800 font-bold' : 
                            app.status?.toLowerCase() === 'rescheduled' ? 'bg-yellow-100 text-yellow-800 font-bold border border-yellow-200' :
                            app.status?.toLowerCase() === 'booked' ? 'bg-blue-100 text-blue-800 font-bold' :
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
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="font-poppins text-sm text-gray-700 mb-2"><span className="font-semibold">Reason:</span> {app.reason}</p>
                        {activeTab === 'pending' && (
                          <p className="font-poppins text-sm text-gray-700 mb-2"><span className="font-semibold">Requested Dates:</span> {app.requestedStartDate} - {app.requestedEndDate}</p>
                        )}
                        
                        {(activeTab === 'approved' || activeTab === 'canceled') && (
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
                              <span className="font-semibold">Batch:</span> {app.batch}
                            </p>
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
        token={token}/>
      )}

      <ConfirmationModal 
        {...confirmConfig} 
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}