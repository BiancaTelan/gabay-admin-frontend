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
  const [activeStatusDropdown, setActiveStatusDropdown] = useState(null);

  const itemsPerPage = 10;

  //Department Filter States
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const availableDepartments = useMemo(() => {
    const depts = new Set(doctors.map(doc => doc.department || 'General'));
    return ['All', ...Array.from(depts).sort()];
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.department || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDepartment === 'All' || doc.department === selectedDepartment;
      
      return matchesSearch && matchesDept;
    });
  }, [searchTerm, selectedDepartment, doctors]);

  const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
  const paginatedDoctors = filteredDoctors.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- COUNTING ENTRIES FOR PAGINATION DISPLAY ---
  const entryStart = filteredDoctors.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const entryEnd = Math.min(currentPage * itemsPerPage, filteredDoctors.length);

  const handleDailyStatusChange = async (id, newStatus) => {
    setActiveStatusDropdown(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/doctors/${id}/daily-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error("Update failed");
      fetchDoctors();
      toast.success("Doctor's daily status updated.");
    } catch (error) {
      toast.error("Failed to update daily status.");
    }
  };

  const DailyStatusPicker = ({ doc, isLast, total }) => {
    const isOpen = activeStatusDropdown === doc.id;
    
    if (doc.todayStatus === 'Not Scheduled Today' || doc.todayStatus === 'Inactive') {
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-poppins font-medium whitespace-nowrap bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed">
                <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-gray-400"></span>
                {doc.todayStatus}
            </span>
        );
    }

    const isAvailable = doc.todayStatus === 'Available';
    const dropUp = isLast && total > 1;

    return (
        <div className="relative inline-block text-left">
            <button
              onClick={() => setActiveStatusDropdown(isOpen ? null : doc.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-poppins font-bold rounded-full shadow-sm transition-all active:scale-95 border ${
                isAvailable 
                  ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
              {isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
              <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveStatusDropdown(null)}></div>
                
                <div className={`absolute left-0 w-36 rounded-md bg-white shadow-xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden border border-gray-100 ${dropUp ? 'bottom-full mb-2 origin-bottom-left' : 'top-full mt-2 origin-top-left'}`}>
                  <div className="py-1">
                    <button onClick={() => handleDailyStatusChange(doc.id, 'Available')} className="flex items-center justify-between w-full px-3 py-2 text-xs text-gray-700 hover:bg-green-50 transition-colors font-poppins">
                      <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>Available</span>
                      {isAvailable && <Check size={12} className="text-green-600" />}
                    </button>
                    <button onClick={() => handleDailyStatusChange(doc.id, 'Unavailable')} className="flex items-center justify-between w-full px-3 py-2 text-xs text-gray-700 hover:bg-red-50 transition-colors font-poppins">
                      <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>Unavailable</span>
                      {!isAvailable && <Check size={12} className="text-red-600" />}
                    </button>
                  </div>
                </div>
              </>
            )}
        </div>
    );
  };

  const handleUpdateSchedule = async (doctorId, newDays, newTime, maxPatients, existingScheduleId) => {
    try {
      const endpoint = existingScheduleId 
        ? `/doctors/schedule/${existingScheduleId}` 
        : `/doctors/${doctorId}/schedule/add`;      
        
      const method = existingScheduleId ? 'PUT' : 'POST';

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}${endpoint}`, { 
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ schedule: newDays, timePeriod: newTime, maxPatients: parseInt(maxPatients, 10) }) // NEW: Passing maxPatients
      });
      
      if (!response.ok) throw new Error("Failed to save schedule");
      
      await fetchDoctors(); 
      return true; 
    } catch (error) {
      console.error(error);
      toast.error("Failed to update schedule.");
      return false;
    }
  };

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
  

  const paginated = useMemo(() => {
    const startIndex = (currentPage - 1) * 5;
    const endIndex = startIndex + 5;
    return filteredDoctors.slice(startIndex, endIndex);
  }, [filteredDoctors, currentPage]);

  const groupedDoctors = useMemo(() => {
    return paginated.reduce((groups, doctor) => {
      const dept = doctor.department || 'Uncategorized';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(doctor);
      return groups;
    }, {});
  }, [paginated]);

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

  useEffect(() => {
    if (selectedDoctor && doctors.length > 0) {
      const updatedDoc = doctors.find(d => d.id === selectedDoctor.id);
      // Only trigger state update if the schedule data actually changed to prevent infinite loops
      if (updatedDoc && JSON.stringify(updatedDoc.schedules) !== JSON.stringify(selectedDoctor.schedules)) {
         setSelectedDoctor(updatedDoc);
      }
    }
  }, [doctors]);
  
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
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-gabay-blue font-bold text-sm rounded-lg hover:bg-teal-50 transition-all shadow-lg active:scale-95 group w-full sm:w-auto"
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
            
            {/* Filter and Search Container */}
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex items-center w-full md:w-auto">
                 <select
                  value={selectedDepartment}
                  onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
                  className="border border-gray-300 rounded-md pl-3 pr-8 py-2 md:py-1.5 focus:ring-2 focus:ring-gabay-teal/20 outline-none text-sm font-poppins bg-white appearance-none w-full cursor-pointer"
                >
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <ChevronDown size={14} />
                </div>
              </div>
              
              <div className="relative w-full md:w-auto">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Search doctor..."
                  className="border border-gray-300 rounded-md px-3 py-2 md:py-1.5 w-full md:w-64 pr-10 focus:ring-2 focus:ring-gabay-teal/20 outline-none text-sm"
                />
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* CATEGORIZED DOCTORS LIST */}
            <div className="space-y-6 mb-6">
              {Object.keys(groupedDoctors).length > 0 ? (
                Object.entries(groupedDoctors).map(([departmentName, departmentDoctors]) => (
                  <div key={departmentName} className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
                    
                    {/* Department Header */}
                    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 rounded-t-xl">
                      <h3 className="text-sm font-bold text-gabay-navy uppercase tracking-widest">
                        {departmentName}
                      </h3>
                    </div>
                    
                    <div className="w-full overflow-x-auto pb-24 custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className="bg-white border-b border-gray-100">
                          <tr>
                            <th className="p-4 font-poppins text-xs font-semibold text-gray-400 uppercase tracking-wider">Doctor Name</th>
                            <th className="p-4 font-poppins text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Contact No.</th>
                            <th className="p-4 font-poppins text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Email</th>
                            <th className="p-4 font-poppins text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Schedule</th>
                            <th className="p-4 font-poppins text-xs font-semibold text-gray-400 uppercase tracking-wider">Today's Status</th>
                            <th className="p-4 font-poppins text-xs font-semibold text-gray-400 uppercase tracking-wider">Available Slot</th>
                            <th className="p-4 font-poppins text-xs font-semibold text-gray-400 uppercase tracking-wider text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departmentDoctors.map((doc, index) => (
                            <tr key={doc.id || index} className="border-b border-gray-50 hover:bg-gray-50/50 transition relative">
                              <td className="p-4 font-poppins text-sm text-gabay-navy font-semibold whitespace-nowrap">
                                {doc.name}
                              </td>
                              <td className="p-4 font-poppins text-sm text-gray-600 hidden lg:table-cell">
                                {doc.contactNumber || 'N/A'}
                              </td>
                              <td className="p-4 font-poppins text-sm text-gray-600 hidden lg:table-cell">
                                {doc.email || 'N/A'}
                              </td>
                              <td className="p-4 font-poppins text-sm text-gray-600 hidden md:table-cell">
                                {doc.schedule && doc.timePeriod ? `${doc.schedule} (${doc.timePeriod})` : 'TBD'}
                              </td>
                              
                              {/* Dynamic Status Badge based on Backend Data */}
                              <td className="p-4">
                                <DailyStatusPicker 
                                  doc={doc} 
                                  isLast={index === departmentDoctors.length - 1} 
                                  total={departmentDoctors.length} 
                                />
                              </td>

                              {/* Available Slot Column */}
                              <td className="p-4 font-poppins text-sm text-center">
                                {(doc.todayStatus === 'Not Scheduled Today' || doc.todayStatus === 'On Leave / Unavailable' || doc.todayStatus === 'Inactive') ? (
                                    <span className="text-gray-300 font-medium cursor-not-allowed">-</span>
                                ) : (
                                    <span className={`font-bold ${doc.availableSlot > 0 ? 'text-gabay-teal' : 'text-red-500'}`}>
                                        {doc.availableSlot}
                                    </span>
                                )}
                              </td>

                              <td className="p-4 flex items-center justify-center gap-2">
                                <button
                                  onClick={() => { setSelectedDoctor(doc); setIsScheduleModalOpen(true); }}
                                  className="p-1.5 text-gabay-blue hover:bg-blue-50 rounded-md transition-colors"
                                  title="Manage Schedule"
                                >
                                  <CalendarDays size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Search className="text-gray-300" size={32} />
                  </div>
                  <p className="font-poppins text-gabay-navy font-semibold text-lg">No doctors found</p>
                  <p className="font-poppins text-gray-500 text-sm mt-1">Try adjusting your search or filters.</p>
                </div>
              )}
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
        onSave={handleUpdateSchedule}
        onDelete={confirmDeleteSchedule}
      />
      {/* CONFIRMATION MODAL */}
      <ConfirmationModal {...modalConfig} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />
    </div>
  );
}