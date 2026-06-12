import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CalendarDays } from 'lucide-react';
import Button from '../../components/button';
import ConfirmRescheduleModal from '../../components/ConfirmRescheduleModal';
import { AuthContext } from '../../authContext';
import toast from 'react-hot-toast'; 

export default function RescheduleAppointmentPage() {
  const { token } = useContext(AuthContext);
  const [allowedDays, setAllowedDays] = useState([]);
  const [scheduleDetails, setScheduleDetails] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const rawData = location.state?.appointment || location.state?.patientData;
  const appointment = rawData ? {
    id: rawData.id,
    ...rawData,
    name: rawData.name || rawData.patientName,
    appointmentDate: rawData.appointmentDate || rawData.previousDate || new Date().toISOString(),
    hospitalNo: rawData.hospitalNo || rawData.hospitalNumber || 'N/A'
  } : null;
  const nameParts = appointment?.name?.split(' ') || ['N/A'];
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';
  const [selectedBatch, setSelectedBatch] = useState(appointment?.batch || 'Morning');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (!appointment?.appointmentDate) return null;
    const parsed = new Date(appointment.appointmentDate);
    return isNaN(parsed.getTime()) ? null : parsed;
  });

  // --- FETCH WORKING DAYS FOR THE ASSIGNED DOCTOR ---
  useEffect(() => {
    const fetchWorkingDays = async () => {
      const doctorId = appointment?.docID; 
      if (!doctorId || !token) return;
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff/doctors/${doctorId}/working-days`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to load");
        const data = await response.json();
        setAllowedDays(data.working_days || []);
        setScheduleDetails(data.schedule_details || {}); 
        
      } catch (error) {
        console.error("Failed to fetch working days:", error);
        toast.error("Could not load the doctor's available working days."); 
      }
    };

    fetchWorkingDays();
  }, [appointment?.docID, token]);

  useEffect(() => {
    if (selectedDate) {
      const dayIndex = selectedDate.getDay();
      const availableBatches = scheduleDetails[dayIndex] || [];
      if (availableBatches.length > 0 && !availableBatches.includes(selectedBatch)) {
        setSelectedBatch(availableBatches[0]);
      }
    }
  }, [selectedDate, scheduleDetails]);

  // --- VALIDATION FUNCTION ---
  const isWorkingDay = (d) => {
    return allowedDays.includes(d.getDay());
  };

  // --- HANDLE RESCHEDULE SUBMISSION ---
  const handleOpenModal = (e) => {
    e.preventDefault();

    const parsedOriginal = new Date(appointment?.appointmentDate);
    const originalDate = isNaN(parsedOriginal.getTime()) ? null : new Date(parsedOriginal).setHours(0, 0, 0, 0);
    const newDate = selectedDate ? new Date(selectedDate).setHours(0, 0, 0, 0) : null;
    const today = new Date().setHours(0, 0, 0, 0);

    const hasNotChanged = newDate === originalDate && selectedBatch === appointment?.batch;

    if (!selectedDate) return setError('Please select a new appointment date.');
    
    if (newDate < today) {
      return setError('The new appointment date cannot be in the past.');
    }

    if (hasNotChanged) {
      return setError('No changes detected. Please select a different date or batch to reschedule.');
    }

    if (!reason.trim()) return setError('Please provide a reason for rescheduling.');

    setError('');
    setShowConfirmModal(true);
  };

  // --- CONFIRM RESCHEDULE ACTION ---
  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      const formattedDate = selectedDate.toLocaleDateString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric'
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff/appointments/${appointment.id}/reschedule`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          new_date: formattedDate,
          batch: selectedBatch,
          reason: reason
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to reschedule appointment');
      }

      setShowConfirmModal(false);
      
      const isNoShow = location.state?.patientData?.source === 'no-show';
      const destination = isNoShow ? '/staff/no-show-appointments' : '/staff/appointments';
      const navigationState = isNoShow 
        ? { updatedId: appointment?.id, newStatus: 'Rescheduled' } 
        : { tab: 'approved' };

      navigate(destination, { state: navigationState });

    } catch (err) {
      console.error("Reschedule error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formattedPreviewDate = selectedDate?.toLocaleDateString('en-US', {
    month: '2-digit', day: '2-digit', year: 'numeric',
  });
  const previewTime = selectedBatch === 'Morning' ? '8:00 AM - 12:00 PM' : '1:00 PM - 5:00 PM';
  const dateTimeString = `${formattedPreviewDate || 'No date selected'} (${previewTime})`;

  // --- READ-ONLY FIELD COMPONENT ---
  const ReadOnlyField = ({ label, value }) => (
    <div>
      <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">{label}</label>
      <input
        type="text"
        value={value}
        readOnly
        className="w-full px-3 py-2 border border-gray-200 rounded-md font-poppins text-md bg-gray-50 text-gray-500 cursor-not-allowed outline-none"
      />
    </div>
  );

  // --- MAIN RENDER ---
  return (
    <>
      <div className="space-y-6">
        <div className="bg-gabay-blue px-6 py-4 mb-6">
          <h1 className="font-montserrat text-3xl font-bold text-white">Appointment Management</h1>
          <p className="font-poppins text-sm text-white mt-1">
            Appointment Management &gt; 
            {location.state?.patientData?.source === 'no-show' ? ' No Show Records ' : ' Approved Schedules '} 
            &gt; Reschedule
          </p>
        </div>

        {/* --- APPOINTMENT DETAILS & RESCHEDULE FORM --- */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <form onSubmit={handleOpenModal}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="font-montserrat text-lg font-semibold text-gabay-teal mb-4 uppercase tracking-wide">Patient Information</h3>
                  <ReadOnlyField label="Hospital Number" value={appointment?.hospitalNo || 'N/A'} />
                  <div className="grid grid-cols-2 gap-4">
                    <ReadOnlyField label="First Name" value={firstName} />
                    <ReadOnlyField label="Last Name" value={lastName} />
                  </div>
                  <ReadOnlyField label="Email" value={appointment?.email || 'N/A'} />
                  <div>
                    <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Assigned Doctor</label>
                    <input
                      type="text"
                      value={appointment?.assignedDoctor || 'N/A'}
                      readOnly
                      className="w-full px-3 py-2 border border-gabay-navy/30 rounded-md font-poppins text-md bg-gabay-navy/5 text-gabay-navy font-semibold cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <h3 className="font-montserrat text-lg font-semibold text-gabay-teal mb-4 uppercase tracking-wide">Update Schedule Details</h3>
                  <div>
                    <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Date</label>
                    <div className="relative w-full">
                      <DatePicker
                        selected={selectedDate}
                        onChange={(d) => setSelectedDate(d)}
                        filterDate={isWorkingDay}
                        minDate={new Date()}
                        disabled={allowedDays.length === 0}
                        dateFormat="MM/dd/yyyy"
                        wrapperClassName="w-full"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-poppins text-md focus:outline-none focus:ring-2 focus:ring-gabay-blue pr-10 cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                        placeholderText={allowedDays.length === 0 ? "Loading schedule..." : "Select a date"}
                      />
                      <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                    </div>
                  </div>

                  <div>
                    <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Batch</label>
                    <div className="flex flex-wrap gap-6 mt-2">
                      {['Morning', 'Afternoon'].map((b) => {
                        const dayIndex = selectedDate ? selectedDate.getDay() : null;
                        const isAvailable = selectedDate ? (scheduleDetails[dayIndex] || []).includes(b) : true;
                        
                        return (
                          <label key={b} className={`flex items-center gap-2 font-poppins text-md ${!isAvailable ? 'text-gray-400 cursor-not-allowed' : 'text-gabay-navy cursor-pointer'}`}>
                            <input
                              type="radio"
                              value={b}
                              checked={selectedBatch === b}
                              onChange={() => setSelectedBatch(b)}
                              disabled={!isAvailable}
                              className="w-4 h-4 text-gabay-teal focus:ring-gabay-teal disabled:opacity-50"
                            />
                            {b === 'Morning' ? 'Morning (8:00 - 12:00)' : 'Afternoon (1:00 - 5:00)'}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Reason for Rescheduling</label>
                    <textarea
                      rows="4"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for change..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-poppins text-md focus:outline-none focus:ring-2 focus:ring-gabay-blue"
                      required
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm font-poppins font-medium">{error}</p>}
                </div>
              </div>

              <div className="flex justify-center gap-3 mt-10 pt-6 border-t border-gray-100">
                <Button variant="teal" type="submit" disabled={loading} className="py-2 px-10 min-w-[200px]">
                  {loading ? 'Processing...' : 'Reschedule Appointment'}
                </Button>
                <Button variant="teal-outline" type="button" onClick={() => navigate(-1)} className="py-2 px-10">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* --- CONFIRM RESCHEDULE MODAL --- */}                
      <ConfirmRescheduleModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        patientName={appointment?.name}
        dateTime={dateTimeString}
        reason={reason}
        onConfirm={handleConfirm}
        loading={loading}
      />
    </>
  );
}