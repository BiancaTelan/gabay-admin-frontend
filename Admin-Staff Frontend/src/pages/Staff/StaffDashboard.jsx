import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarX, CalendarPlus, CalendarClock, 
  Plus, ChevronRightIcon, Filter, 
  Search, LayoutGrid, Table, Funnel, AlertTriangle } from 'lucide-react';
import StatCard from '../../components/StatCard';
import QueueStatusModal from '../../components/QueueStatusModal';
import AppointmentDetailsModal from '../../components/ApptDetailsModal';
import { AuthContext } from '../../authContext'; 
import { toast } from 'react-hot-toast';

// Dashboard Page
export default function StaffDashboard() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [stats, setStats] = useState({ approved: 0, cancelled: 0, slot: 0, forApproval: 0 });
  const [patients, setPatients] = useState([]);
  const [queueList, setQueueList] = useState([]);
  const [timeFilter, setTimeFilter] = useState('Month');
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const [apptSearch, setApptSearch] = useState('');
  const [apptViewMode, setApptViewMode] = useState('card');
  const [showApptFilter, setShowApptFilter] = useState(false);
  const [apptSort, setApptSort] = useState({ key: 'name', order: 'asc' });
  const [apptFilters, setApptFilters] = useState({ batch: 'All', department: 'All', doctor: 'All' });
  
  const filterOptions = useMemo(() => {
      return {
          batches: ['All', ...new Set(patients.map(p => p.time).filter(Boolean))],
          depts: ['All', ...new Set(patients.map(p => p.department).filter(Boolean))],
          docs: ['All', ...new Set(patients.map(p => p.assignedDoctor).filter(Boolean))]
      };
  }, [patients]);

  const processedPatients = useMemo(() => {
      return patients.filter(p => {
          const matchesSearch = (p.name || '').toLowerCase().includes(apptSearch.toLowerCase()) || 
                                (p.hospitalNumber || '').toLowerCase().includes(apptSearch.toLowerCase());
          const matchesBatch = apptFilters.batch === 'All' || p.time === apptFilters.batch;
          const matchesDept = apptFilters.department === 'All' || p.department === apptFilters.department;
          const matchesDoc = apptFilters.doctor === 'All' || p.assignedDoctor === apptFilters.doctor;
          return matchesSearch && matchesBatch && matchesDept && matchesDoc;
      }).sort((a, b) => {
          let valA = (a[apptSort.key] || '').toLowerCase();
          let valB = (b[apptSort.key] || '').toLowerCase();
          if (valA < valB) return apptSort.order === 'asc' ? -1 : 1;
          if (valA > valB) return apptSort.order === 'asc' ? 1 : -1;
          return 0;
      });
  }, [patients, apptSearch, apptFilters, apptSort]);

  // Fetch dashboard data 
  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${apiBase}/api/staff/overview?filter_time=${timeFilter.toLowerCase()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setPatients(data.scheduledList);
        setQueueList(data.queueList);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  }; 
  
  useEffect(() => {
    fetchDashboardData();
  }, [token, timeFilter]);

  // Handle status updates for queue items and appointments
  const handleUpdateAction = async (patient, actionString, newStatusDisplay) => {
    try {
      const response = await fetch(`${apiBase}/api/staff/queue/${patient.id}?action=${actionString}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Update failed");
      
      fetchDashboardData();
      toast.success(`Patient updated successfully`);
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  // Open modals and handle actions
  const handleQueueItemClick = (patient) => {
    setSelectedPatient(patient);
    setModalOpen(true);
  };

  // Status update handlers
  const handleStatusUpdate = (patient, newStatus) => {
    handleUpdateAction(patient, newStatus, newStatus);
    setModalOpen(false);
  };

  // Appointment action handlers
  const handleAddToQueue = (patient) => {
    handleUpdateAction(patient, 'add_to_queue', 'waiting');
    setAppointmentModalOpen(false);
  };

  // Appointment No Show handler
  const handleNoShow = (patient) => {
    handleUpdateAction(patient, 'no_show', 'No Show');
    setAppointmentModalOpen(false);
  };

  // Helper Function for Badge Styling
  const getStatusBadge = (status) => {
    if (status === 'Completed') {
      return { text: 'Completed', className: 'text-green-500 bg-green-100' };
    } else if (status === 'In Progress' || status === 'serving') {
      return { text: 'Currently Serving', className: 'text-blue-600 bg-blue-100' };
    } else {
      return { text: 'Waiting', className: 'text-gray-500 bg-gray-200' };
    }
  };

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gabay-blue px-6 py-6 mb-4 text-white rounded-xl shadow-sm">
        <div>
          <h1 className="font-montserrat text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="font-poppins text-sm text-white/90 mt-1">
            Dashboard Overview &gt; <span className="text-white font-medium underline underline-offset-4">Queue Management</span>
          </p>
        </div>
        <button 
          onClick={() => navigate('/staff/no-show-appointments')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gabay-blue font-bold font-poppins text-sm rounded-lg hover:bg-teal-50 transition-all shadow-lg active:scale-95 group"
        >
          View No Show Records
          <ChevronRightIcon size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="space-y-6">
        <div className="space-y-4">

          {/* FILTER HEADER ROW */}
          <div className="flex justify-between items-end w-full">
            <h2 className="font-montserrat text-lg font-bold text-gabay-navy">Overview Statistics</h2>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-500" />
              <select 
                value={timeFilter} 
                onChange={(e) => setTimeFilter(e.target.value)}
                className="bg-white border border-gray-200 text-sm font-poppins rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gabay-teal text-gray-700 shadow-sm cursor-pointer"
              >
                <option value="Today">Today</option>
                <option value="Week">This Week</option>
                <option value="Month">This Month</option>
              </select>
            </div>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full mb-6">
            <StatCard 
              title={`Appointments for Approval (${timeFilter})`} 
              value={stats.forApproval} 
              icon={CalendarClock} 
              color="gray" 
              onClick={() => navigate('/staff/appointments', { state: { activeTab: 'pending' } })} 
            />
            <StatCard 
              title={`Appointments Approved (${timeFilter})`} 
              value={stats.approved} 
              icon={CalendarCheck} 
              color="green" 
              onClick={() => navigate('/staff/appointments', { state: { activeTab: 'approved' } })} 
            />
            <StatCard 
              title={`Appointments Cancelled (${timeFilter})`} 
              value={stats.cancelled} 
              icon={CalendarX} 
              color="red" 
              onClick={() => navigate('/staff/appointments', { state: { activeTab: 'canceled' } })} 
            />

            <StatCard 
              title="Available Slots (Today)" 
              value={stats.slot} 
              icon={CalendarPlus} 
              color="blue" 
              onClick={() => navigate('/staff/no-show-appointments')} 
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 items-start">
            {/* TODAY'S APPOINTMENTS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 w-full relative">
              
              {/* HEADER WITH SEARCH, VIEW TOGGLES, AND FILTER */}
              <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-4 mb-6 relative">
                  <h2 className="font-montserrat text-lg font-bold text-gabay-blue">Today's Scheduled Appointments</h2>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full 2xl:w-auto">
                      <div className="relative flex-1 sm:flex-none">
                          <input 
                              type="text" 
                              placeholder="Search name or ID..." 
                              value={apptSearch} 
                              onChange={e => setApptSearch(e.target.value)} 
                              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm font-poppins focus:outline-none focus:ring-2 focus:ring-gabay-blue w-full sm:w-48"
                          />
                          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      
                      <div className="flex bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <button
                          onClick={() => setApptViewMode("card")}
                          className={`px-3 py-1.5 flex items-center gap-1 font-poppins text-xs transition-all ${
                            apptViewMode === "card" ? "bg-gabay-blue text-white shadow-inner" : "text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <LayoutGrid size={14} /> Card
                        </button>
                        <button
                          onClick={() => setApptViewMode("table")}
                          className={`px-3 py-1.5 flex items-center gap-1 font-poppins text-xs transition-all ${
                            apptViewMode === "table" ? "bg-gabay-blue text-white shadow-inner" : "text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          <Table size={14} /> Table
                        </button>
                      </div>

                      <button
                          onClick={() => setShowApptFilter(!showApptFilter)}
                          className="px-3 py-1.5 border border-gabay-teal text-gabay-teal hover:bg-teal-50 rounded-lg flex items-center gap-1 font-poppins text-xs transition-all font-semibold"
                      >
                          <Funnel size={14} /> Filter
                      </button>
                  </div>

                  {/* ABSOLUTE FILTER DROPDOWN */}
                  {showApptFilter && (
                      <div className="absolute right-0 top-full mt-2 w-64 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white border border-gray-200 rounded-xl shadow-2xl p-4 z-[100]">
                          <div className="space-y-4 font-poppins">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Sort By</label>
                              <select 
                                  value={`${apptSort.key}-${apptSort.order}`} 
                                  onChange={(e) => {
                                      const [key, order] = e.target.value.split('-');
                                      setApptSort({ key, order });
                                  }}
                                  className="w-full text-xs border border-gray-200 rounded-md p-2 outline-none focus:ring-1 focus:ring-gabay-blue"
                              >
                                  <option value="name-asc">Name (A-Z)</option>
                                  <option value="name-desc">Name (Z-A)</option>
                                  <option value="hospitalNumber-asc">Hospital No. (Asc)</option>
                                  <option value="hospitalNumber-desc">Hospital No. (Desc)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Batch</label>
                              <select value={apptFilters.batch} onChange={e => setApptFilters({...apptFilters, batch: e.target.value})} className="w-full text-xs border border-gray-200 rounded-md p-2">
                                  {filterOptions.batches.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Department</label>
                              <select value={apptFilters.department} onChange={e => setApptFilters({...apptFilters, department: e.target.value})} className="w-full text-xs border border-gray-200 rounded-md p-2">
                                  {filterOptions.depts.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Doctor</label>
                              <select value={apptFilters.doctor} onChange={e => setApptFilters({...apptFilters, doctor: e.target.value})} className="w-full text-xs border border-gray-200 rounded-md p-2">
                                  {filterOptions.docs.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <button 
                              onClick={() => { setApptSort({key:'name', order:'asc'}); setApptFilters({batch:'All', department:'All', doctor:'All'})}} 
                              className="w-full py-2 bg-gray-100 text-gray-600 rounded-md text-xs font-semibold hover:bg-gray-200 transition-colors"
                            >
                              Reset Filters
                            </button>
                          </div>
                      </div>
                  )}
              </div>

              {/* DYNAMIC RENDERING: TABLE OR CARD */}
              {apptViewMode === 'table' ? (
                 <div className="overflow-x-auto border border-gray-100 rounded-lg">
                   <table className="w-full text-left">
                     <thead className="bg-gray-50 border-b border-gray-100">
                       <tr className="font-poppins text-[11px] text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Patient</th>
                          <th className="px-4 py-3">Hospital No.</th>
                          <th className="px-4 py-3">Dept & Doctor</th>
                          <th className="px-4 py-3 text-center">Action</th>
                       </tr>
                     </thead>
                     <tbody>
                       {processedPatients.map(patient => (
                           <tr key={patient.id} className={`border-b border-gray-50 transition-colors ${patient.doctorUnavailable ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50/50'}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                   {patient.doctorUnavailable && <AlertTriangle size={14} className="text-red-500 shrink-0" title="Doctor Unavailable Today" />}
                                   <div>
                                      <p className="font-semibold text-sm text-gabay-navy">{patient.name}</p>
                                      <p className="text-[11px] text-gabay-teal font-medium mt-0.5">{patient.reason}</p>
                                   </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 font-poppins">{patient.hospitalNumber}</td>
                              <td className="px-4 py-3">
                                 <p className="text-xs text-gray-700 font-poppins font-medium">{patient.department}</p>
                                 <p className="text-[11px] text-gray-500 font-poppins mt-0.5">{patient.assignedDoctor} • {patient.time}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                  {patient.doctorUnavailable ? (
                                      <button
                                          onClick={() => navigate('/staff/reschedule', { state: { appointment: { ...patient, appointmentDate: new Date().toISOString() } } })}
                                          className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-100 rounded-md transition-colors"
                                          title="Reschedule Appointment"
                                      >
                                          <CalendarClock size={18} />
                                      </button>
                                  ) : (
                                      <button
                                          onClick={() => { setSelectedAppointment(patient); setAppointmentModalOpen(true); }}
                                          className="text-gabay-blue hover:text-gabay-navy p-1.5 hover:bg-blue-50 rounded-md transition-colors"
                                          title="Add to Queue"
                                      >
                                          <Plus size={18} strokeWidth={2.5} />
                                      </button>
                                  )}
                              </td>
                           </tr>
                       ))}
                       {processedPatients.length === 0 && (
                          <tr>
                             <td colSpan="4" className="py-8 text-center bg-gray-50 text-gray-500 font-poppins italic text-sm border-dashed">No scheduled appointments match your criteria.</td>
                          </tr>
                       )}
                     </tbody>
                   </table>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {processedPatients.map((patient) => (
                      <div key={patient.id} className={`relative py-4 px-6 rounded-xl shadow-sm border transition-colors overflow-hidden ${patient.doctorUnavailable ? 'bg-red-50/40 border-red-300 hover:border-red-400' : 'bg-gray-50 border-gray-200 hover:border-gabay-teal'}`}>
                          {/* Alert Banner */}
                          {patient.doctorUnavailable && (
                              <div className="absolute top-0 left-0 right-0 bg-red-100 text-red-700 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <AlertTriangle size={12} className="shrink-0" />
                                <span className="truncate">Doctor Unavailable Today</span>
                              </div>
                          )}
                          <div className={`space-y-1 pr-10 ${patient.doctorUnavailable ? 'pt-4' : ''}`}>
                            <h3 className="font-poppins font-bold text-md text-gabay-navy truncate" title={patient.name}>{patient.name}</h3>
                            <p className="font-poppins text-xs text-gray-500">{patient.hospitalNumber}</p>
                            
                            <div className="pt-2 pb-1 border-b border-gray-200/60 border-dashed">
                                <p className="font-poppins font-semibold text-xs text-gabay-teal truncate" title={patient.reason}>{patient.reason}</p>
                            </div>
                            
                            <p className="font-poppins text-[11px] text-gray-600 font-medium pt-1 truncate">{patient.department}</p>
                            <p className="font-poppins text-[11px] text-gray-500 truncate">{patient.assignedDoctor} • {patient.time}</p>
                          </div>
                          
                          {/* Conditional Actions */}
                          {patient.doctorUnavailable ? (
                              <button
                                onClick={() => navigate('/staff/reschedule', { state: { appointment: { ...patient, appointmentDate: new Date().toISOString() } } })}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white border border-red-300 text-red-500 rounded-lg p-2 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                                title="Reschedule Appointment"
                              >
                                <CalendarClock size={18} strokeWidth={2.5} />
                              </button>
                          ) : (
                              <button
                                onClick={() => { setSelectedAppointment(patient); setAppointmentModalOpen(true); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white border border-gray-300 text-gabay-blue rounded-lg p-2 hover:bg-gabay-blue hover:text-white hover:border-gabay-blue transition-all shadow-sm"
                                title="Add to Queue"
                              >
                                <Plus size={18} strokeWidth={2.5} />
                              </button>
                          )}
                      </div>
                    ))}
                    {processedPatients.length === 0 && (
                       <div className="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                         <p className="text-gray-500 font-poppins italic text-sm">No scheduled appointments match your criteria.</p>
                       </div>
                    )}
                 </div>
              )}
            </div>

              {/* LIVE QUEUE LIST */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-montserrat text-lg font-bold text-gabay-blue">Live Queue List</h2>
                <span className="text-xs bg-gabay-blue text-white px-2.5 py-1 rounded-full font-bold font-poppins">
                  {queueList.filter(p => {
                    const currentStatus = p.status?.toLowerCase() || '';
                    return currentStatus === 'waiting' || currentStatus === 'in progress';
                  }).length} ACTIVE
                </span>
              </div>
              <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto custom-scrollbar">
                {queueList.map((item) => {
                  const badge = getStatusBadge(item.status);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleQueueItemClick(item)}
                      className="flex items-center justify-between py-3 px-4 bg-gray-50 border border-gray-100 rounded-lg cursor-pointer hover:border-gabay-teal hover:bg-white transition-all shadow-sm"
                    >
                      <div className="truncate pr-2">
                        <p className="font-poppins font-bold text-md text-gabay-navy truncate">{item.name}</p>
                        <p className="font-poppins text-sm text-gray-400">{item.hospitalNumber}</p>
                      </div>
                      <span className={`font-poppins text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shrink-0 ${badge.className}`}>
                        {badge.text}
                      </span>
                    </div>
                  );
                })}
                {queueList.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4 italic">The queue is currently empty.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* QUEUE STATUS MODAL */}
      {selectedPatient && (
        <QueueStatusModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          patient={selectedPatient}
          onUpdate={handleStatusUpdate}
        />
      )}
      
      {/* APPOINTMENT DETAILS MODAL */}
      {selectedAppointment && (
        <AppointmentDetailsModal
          isOpen={appointmentModalOpen}
          onClose={() => setAppointmentModalOpen(false)}
          patient={selectedAppointment}
          onAddToQueue={handleAddToQueue}
          onNoShow={handleNoShow}
        />
      )}
    </div>
  );
}