import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  PlusCircle, Search, ChevronLeft, ChevronRight,
  ChevronDown, CalendarDays, ChevronRight as ChevronRightIcon,
  Check, SquarePen, Trash2
} from 'lucide-react';
import Button from '../../components/button';
import SchedulePickerModal from '../../components/SchedulePickerModal';
import AddDoctorModal from '../../components/AddDoctorModal';
import ConfirmationModal from '../../components/confirmModal';
import { AuthContext } from '../../authContext';
import toast from 'react-hot-toast'; 

export default function StaffDoctors() {
  const navigate = useNavigate();
  const { token, userRole } = useContext(AuthContext);
  const apiBase = userRole?.toUpperCase() === 'ADMIN' ? '/api/admin' : '/api/staff';
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });

  const itemsPerPage = 10;

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, doctors]);

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
  const paginatedDoctors = filteredDoctors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- COUNTING ENTRIES FOR PAGINATION DISPLAY ---
  const entryStart = filteredDoctors.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, filteredDoctors.length);

  const [scheduleToEdit, setScheduleToEdit] = useState(null);

  const handleUpdateSchedule = async (doctorId, newDays, newTime, existingScheduleId) => {
    try {
      const endpoint = existingScheduleId 
        ? `/doctors/schedule/${existingScheduleId}` 
        : `/doctors/${doctorId}/schedule/add`;      
        
      const method = existingScheduleId ? 'PUT' : 'POST';

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}${endpoint}`, { 
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ schedule: newDays, timePeriod: newTime })
      });
      
      if (!response.ok) throw new Error("Failed to save schedule");
      
      fetchDoctors(); 
      setIsScheduleModalOpen(false);
      setScheduleToEdit(null);
      toast.success(existingScheduleId ? "Schedule updated!" : "Schedule added!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update schedule.");
    }
  };

  // REPLACED: window.confirm with Custom Modal
  const confirmDeleteSchedule = (scheduleId) => {
    setModalConfig({
      isOpen: true,
      type: 'danger',
      title: 'Delete Schedule Block',
      message: 'Are you sure you want to delete this specific schedule block? This action cannot be undone.',
      onConfirm: () => handleDeleteSchedule(scheduleId)
    });
  };

  const handleDeleteSchedule = async (scheduleId) => {
    setModalConfig({ ...modalConfig, isOpen: false }); // Close modal
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/doctors/schedule/${scheduleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to delete");
      fetchDoctors();
      toast.success("Schedule deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete schedule.");
    }
  };

  // --- FETCH DOCTORS ---
  const fetchDoctors = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/doctors/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch doctors");
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error("Error loading doctors:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- INITIAL FETCH ---
  useEffect(() => {
    if (token) fetchDoctors();
  }, [token]);

  // --- ADD NEW DOCTOR (LOCAL STATE UPDATE) ---
  const handleAddNewDoctor = (newDoctorData) => {
    const newDoctor = {
      id: Date.now(),
      ...newDoctorData,
      schedule: 'TBD',
      timePeriod: 'TBD',
      availability: 'Available'
    };
    setDoctors([newDoctor, ...doctors]);
  };

  /// --- STATUS CHANGE HANDLER ---
  const handleStatusChange = async (id, newStatus) => {
    setDoctors(prev => prev.map(doc => doc.id === id ? { ...doc, availability: newStatus } : doc));
    setActiveDropdown(null);

    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/doctors/${id}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ availability: newStatus })
      });
      toast.success("Doctor status updated.");
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status.");
      fetchDoctors(); 
    }
  };

  /// --- STATUS PICKER COMPONENT ---
  const StatusPicker = ({ doctor }) => {
    const isOpen = activeDropdown === doctor.id;
    const isAvailable = doctor.availability === 'Available';

    return (
      <div className="relative inline-block text-left">
        <button
          onClick={() => setActiveDropdown(isOpen ? null : doctor.id)}
          className={`inline-flex items-center gap-2 px-4 py-1 text-xs font-bold text-white rounded-full shadow-sm transition-all active:scale-95 ${isAvailable ? "bg-gabay-teal" : "bg-red-500"
            }`}
        >
          {doctor.availability.toUpperCase()}
          <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)}></div>
            <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white shadow-xl ring-1 ring-black ring-opacity-5 z-20 overflow-hidden border border-gray-100">
              <div className="py-1">
                <button onClick={() => handleStatusChange(doctor.id, 'Available')} className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <span className="flex items-center gap-2 font-poppins"><div className="w-2 h-2 rounded-full bg-gabay-teal"></div>Available</span>
                  {isAvailable && <Check size={14} className="text-gabay-teal" />}
                </button>
                <button onClick={() => handleStatusChange(doctor.id, 'Not Available')} className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <span className="flex items-center gap-2 font-poppins"><div className="w-2 h-2 rounded-full bg-red-500"></div>Not Available</span>
                  {!isAvailable && <Check size={14} className="text-red-500" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // --- MAIN RENDER ---
  return (
    <div className="space-y-6">
      {/* HEADER & NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gabay-blue px-6 py-6 mb-4 font-poppins">
        <div className="text-left">
          <h1 className="font-montserrat text-3xl font-bold text-white tracking-tight">Doctor List & Schedule</h1>
          <p className="text-sm text-white/90 mt-1">
            Doctors &gt; <span className="text-white font-medium underline underline-offset-4">Doctor List</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/staff/doctor-schedule')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gabay-blue font-bold text-sm rounded-lg hover:bg-teal-50 transition-all shadow-lg active:scale-95 group"
        >
          View Doctor Schedules
          <ChevronRightIcon size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* DOCTOR LIST */}
      <div className="w-full pb-8">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-visible font-poppins">

          <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <h2 className="font-montserrat text-2xl font-bold text-gabay-blue text-left">Doctor List</h2>
            </div>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder="Search doctor..."
                className="border border-gray-300 rounded-md px-3 py-1.5 w-64 pr-10 focus:ring-2 focus:ring-gabay-teal/20 outline-none text-sm"
              />
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className='sticky top-0 z-10 bg-gray-50'>
                <tr className="text-gabay-teal font-bold border-b border-gray-100 text-sm uppercase tracking-wider">
                  <th className="px-6 py-5">Name</th>
                  <th className="px-6 py-5">Schedule</th>
                  <th className="px-6 py-5">Time Period</th>
                  <th className="px-6 py-5">Department</th>
                  <th className="px-6 py-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedDoctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gabay-navy">{doctor.name}</div>
                      <div className="text-[10px] text-gray-400 font-normal uppercase">{doctor.role}</div>
                    </td>

                    <td className="px-6 py-4 text-gabay-navy font-medium">
                      {doctor.schedules && doctor.schedules.length > 0 ? (
                        <div className="space-y-1">
                          {doctor.schedules.map((s) => (
                            <div key={s.id} className="whitespace-nowrap h-8 flex items-center">{s.day}</div>
                          ))}
                        </div>
                      ) : ( <span className="text-gray-400 italic">No schedule set</span> )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-start justify-between text-gabay-navy font-medium">
                        {doctor.schedules && doctor.schedules.length > 0 ? (
                          <div className="space-y-1 w-full pr-4">
                            {doctor.schedules.map((s) => (
                              <div key={s.id} className="whitespace-nowrap h-8 flex items-center justify-between group/item">
                                <span>{s.time}</span>

                                <div className="flex gap-3 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  <button onClick={() => { setSelectedDoctor(doctor); setScheduleToEdit(s); setIsScheduleModalOpen(true); }} className="text-gabay-blue hover:text-gabay-teal"><SquarePen size={16}/></button>
                                  <button onClick={() => confirmDeleteSchedule(s.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : ( <span className="text-gray-400 italic">TBD</span> )}
                        
                        <button 
                          onClick={() => { setSelectedDoctor(doctor); setScheduleToEdit(null); setIsScheduleModalOpen(true); }}
                          className="p-1 text-gabay-teal opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shrink-0"
                          title="Add New Schedule Block"
                        >
                          <PlusCircle size={22} /> 
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gabay-navy">{doctor.department}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <StatusPicker doctor={doctor} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-poppins font-bold transition-all ${currentPage === i + 1 ? 'bg-gabay-blue text-white shadow-md' : 'hover:bg-white border border-transparent hover:border-gray-200 text-gray-500'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <p className="text-[10px] md:text-xs text-gray-400 font-poppins font-medium">
              Showing {entryStart} - {entryEnd} of {filteredDoctors.length} entries
            </p>
          </div>
        </div>
      </div>

      {/* SCHEDULE PICKER MODAL */}          
      <SchedulePickerModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        doctor={selectedDoctor}
        editingSchedule={scheduleToEdit}
        onSave={handleUpdateSchedule}
      />
      {/* CONFIRMATION MODAL */}
      <ConfirmationModal {...modalConfig} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />
    </div>
  );
}