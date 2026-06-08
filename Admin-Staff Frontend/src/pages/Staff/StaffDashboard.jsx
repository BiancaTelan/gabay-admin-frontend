import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarX, CalendarPlus, CalendarClock, Plus, ChevronRightIcon } from 'lucide-react';
import StatCard from '../../components/StatCard';
import QueueStatusModal from '../../components/QueueStatusModal';
import AppointmentDetailsModal from '../../components/ApptDetailsModal';
import { AuthContext } from '../../authContext'; 
import { toast } from 'react-hot-toast';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [stats, setStats] = useState({ 
    forApproval: 0,     
    approved: 0,        
    cancelled: 0, 
    rescheduled: 0,     
    slot: 0 
  });
  const [patients, setPatients] = useState([]);
  const [queueList, setQueueList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const apiBase = import.meta.env.VITE_API_BASE_URL;

  // Fetch dashboard data 
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${apiBase}/api/staff/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setPatients(data.scheduledList);
        setQueueList(data.queueList);
      } else {
        toast.error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error('Error loading dashboard');
    } finally {
      setIsLoading(false);
    }
  }; 
  
  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

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
      {/* HEADER - UPDATED: Now shows all hospital data */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gabay-blue px-6 py-6 mb-4 text-white rounded-xl shadow-sm">
        <div>
          <h1 className="font-montserrat text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="font-poppins text-sm text-white/90 mt-1">
            Hospital Overview &gt; <span className="text-white font-medium underline underline-offset-4">All Departments</span>
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

      {/* LOADING STATE */}
      {isLoading ? (
        <div className="text-center py-20 bg-white rounded-xl">
          <p className="font-poppins text-gray-500">Loading dashboard data...</p>
        </div>
      ) : (
        <>
          {/* MAIN CONTENT GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-[5fr_2fr] gap-6">
            <div className="space-y-6">
              {/* STATS CARDS - UPDATED: New status labels */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <StatCard 
                  title="Pending Approval" 
                  value={stats.forApproval} 
                  icon={CalendarClock} 
                  color="gray" 
                  onClick={() => navigate('/staff/appointments', { state: { activeTab: 'pending' } })} 
                />
                <StatCard 
                  title="Confirmed Appointments" 
                  value={stats.approved} 
                  icon={CalendarCheck} 
                  color="green" 
                  onClick={() => navigate('/staff/appointments', { state: { activeTab: 'approved' } })} 
                />
                <StatCard 
                  title="Cancelled/Denied" 
                  value={stats.cancelled} 
                  icon={CalendarX} 
                  color="red" 
                  onClick={() => navigate('/staff/appointments', { state: { activeTab: 'canceled' } })} 
                />
                <StatCard 
                  title="Rescheduled" 
                  value={stats.rescheduled || 0} 
                  icon={CalendarPlus} 
                  color="blue" 
                  onClick={() => navigate('/staff/appointments', { state: { activeTab: 'rescheduled' } })} 
                />
              </div>

              {/* TODAY'S APPOINTMENTS - UPDATED: Now from all departments */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-montserrat text-xl font-bold text-gabay-blue mb-6">Today's Confirmed Appointments</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {patients && patients.length > 0 ? (
                    patients.map((patient) => (
                      <div key={patient.id} className="relative bg-gray-50 py-4 px-6 rounded-xl shadow-sm border border-gray-200 hover:border-gabay-teal transition-colors">
                        <div className="space-y-1 pr-8">
                          <h3 className="font-poppins font-bold text-md text-gabay-navy">{patient.name}</h3>
                          <p className="font-poppins text-sm text-gray-600">{patient.hospitalNumber}</p>
                          {patient.department && (
                            <p className="font-poppins text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded w-fit">
                              {patient.department}
                            </p>
                          )}
                          <p className="font-poppins font-medium text-sm mt-2 text-gabay-teal">{patient.reason}</p>
                          <p className="font-poppins text-sm text-gray-500 italic">{patient.assignedDoctor} • {patient.time}</p>
                        </div>
                        <button
                          onClick={() => { setSelectedAppointment(patient); setAppointmentModalOpen(true); }}
                          className="absolute right-5 top-1/2 -translate-y-1/2 bg-white border-2 border-gabay-blue rounded-lg p-1.5 hover:bg-gabay-blue hover:text-white transition-all shadow-sm"
                          title="Mark as checked in or no-show"
                        >
                          <Plus size={20} strokeWidth={3} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <p className="text-gray-500 font-poppins italic">No confirmed appointments scheduled for today.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* LIVE QUEUE LIST - UPDATED: Shows hospital-wide queue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-montserrat text-lg font-bold text-gabay-blue">Hospital Queue</h2>
                <span className="text-xs bg-gabay-blue text-white px-2.5 py-1 rounded-full font-bold font-poppins">
                  {queueList && queueList.filter(p => p.status === 'waiting' || p.status === 'serving').length} ACTIVE
                </span>
              </div>
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {queueList && queueList.length > 0 ? (
                  queueList.map((item) => {
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
                          {item.department && (
                            <p className="font-poppins text-xs text-gray-500 mt-1">{item.department}</p>
                          )}
                        </div>
                        <span className={`font-poppins text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shrink-0 ${badge.className}`}>
                          {badge.text}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-gray-400 text-sm py-4 italic">The queue is currently empty.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      
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
