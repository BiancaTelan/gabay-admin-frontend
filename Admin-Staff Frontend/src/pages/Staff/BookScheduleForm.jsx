import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Button from '../../components/button';
import { CalendarDays } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function BookScheduleForm({ onSuccess, token }) {
  const [hospitalNo, setHospitalNo] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [address, setAddress] = useState('');
  const [departmentId, setDepartmentId] = useState(''); 
  const [doctorId, setDoctorId] = useState(''); 
  const [date, setDate] = useState(null);
  const [batch, setBatch] = useState('Morning');
  const [reason, setReason] = useState('');
  const [departments, setDepartments] = useState([]);

  // --- FETCH DEPARTMENTS & DOCTORS ---
  useEffect(() => {
    const fetchDepartments = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff/departments-with-doctors`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Failed to fetch departments");
        
        const data = await response.json();
        setDepartments(data);
      } catch (error) {
        console.error("Error loading departments:", error);
        toast.error("Failed to load hospital departments.");
      }
    };

    fetchDepartments();
  }, [token]);

  const [loading, setLoading] = useState(false);
  const [allowedDays, setAllowedDays] = useState([]);

  // --- FETCH WORKING DAYS FOR SELECTED DOCTOR ---
  useEffect(() => {
    const fetchWorkingDays = async () => {
      if (!doctorId || !token) {
        setAllowedDays([]);
        return;
      }
      
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff/doctors/${doctorId}/working-days`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setAllowedDays(data.working_days || []);
      } catch (error) {
        console.error("Failed to fetch working days:", error);
      }
    };

    fetchWorkingDays();
    setDate(null); 
  }, [doctorId, token]);

  // --- WORKING DAYS FILTER FOR DATEPICKER ---
  const isWorkingDay = (d) => {
    return allowedDays.includes(d.getDay());
  };

  // --- DEPARTMENT CHANGE HANDLER ---
  const handleDepartmentChange = (e) => {
    setDepartmentId(e.target.value); 
    setDoctorId('');
  };

  const selectedDept = departments.find(d => d.id === parseInt(departmentId));
  const doctorOptions = selectedDept ? selectedDept.doctors : [];

  // --- FORM SUBMISSION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      toast.error('Please select a consultation date.');
      return;
    }
    if (!doctorId) {
      toast.error('Please select a doctor.');
      return;
    }

    setLoading(true);

    const formattedDate = date.toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric'
    });

    const payload = {
      hospitalNo, firstName, lastName, email, contactNo, address,
      department_id: parseInt(departmentId), 
      doctor_id: parseInt(doctorId), 
      date: formattedDate, reason
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff/appointments/staff-book`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to book appointment');
      }

      toast.success('Appointment Booked & Email Sent!', { duration: 4000 });
      handleCancel();
      if (onSuccess) onSuccess();

    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- CANCEL HANDLER TO RESET FORM ---
  const handleCancel = () => {
    setHospitalNo(''); setFirstName(''); setLastName('');
    setEmail(''); setContactNo(''); setAddress('');
    setDepartmentId(''); setDoctorId(''); setDate(null);
    setBatch('Morning'); setReason('');
  };  

  // --- MAIN RENDER ---
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 relative">
      <Toaster />
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* PATIENT INFORMATION */}
          <div className="space-y-4">
            <h3 className="font-montserrat text-lg font-semibold text-gabay-teal mb-4 uppercase tracking-wide">Patient Information</h3>
            <div>
              <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Hospital Number</label>
              <input type="text" value={hospitalNo} onChange={(e) => setHospitalNo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gabay-blue" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gabay-blue" required />
              </div>
              <div>
                <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gabay-blue" required />
              </div>
            </div>
            <div>
              <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gabay-blue" required />
            </div>
            <div>
              <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Contact Number</label>
              <input type="tel" value={contactNo} onChange={(e) => setContactNo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gabay-blue" required />
            </div>
            <div>
              <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Address</label>
              <textarea rows="3" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gabay-blue" required />
            </div>
          </div>

          {/* SCHEDULE DETAILS */}
          <div className="space-y-5">
            <h3 className="font-montserrat text-lg font-semibold text-gabay-teal mb-4 uppercase tracking-wide">Schedule Details</h3>

            <div>
              <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Department</label>
              <select value={departmentId} onChange={handleDepartmentChange} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white" required>
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option> 
                ))}
              </select>
            </div>

            <div>
              <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Assigned Doctor</label>
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} disabled={!departmentId} className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 bg-white" required>
                <option value="">Select Doctor</option>
                {doctorOptions.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name}</option> 
                ))}
              </select>
            </div>

            <div>
              <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Date</label>
              <div className="relative w-full">
                <DatePicker
                  selected={date}
                  onChange={(d) => setDate(d)}
                  filterDate={isWorkingDay} 
                  minDate={new Date()}
                  
                  disabled={!doctorId || allowedDays.length === 0} 
                  
                  dateFormat="MM/dd/yyyy"
                  wrapperClassName="w-full"
                  
                  className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10 cursor-pointer bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                  
                  placeholderText={
                    !doctorId ? "Select a doctor first" : 
                    allowedDays.length === 0 ? "No schedule available" : 
                    "Select a date"
                  }
                />
                
                <CalendarDays 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
                  size={20} 
                />
              </div>
            </div>

            <div>
              <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Batch</label>
              <div className="flex flex-wrap gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="batch" value="Morning" checked={batch === 'Morning'} onChange={() => setBatch('Morning')} className="w-4 h-4 text-gabay-teal" /> Morning (8:00 - 12:00)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="batch" value="Afternoon" checked={batch === 'Afternoon'} onChange={() => setBatch('Afternoon')} className="w-4 h-4 text-gabay-teal" /> Afternoon (1:00 - 5:00)
                </label>
              </div>
            </div>

            <div>
              <label className="block font-poppins font-medium text-gabay-navy text-md mb-1">Reason for Booking</label>
              <textarea rows="3" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
          </div>
        </div>

        {/* FORM ACTIONS */}
        <div className="flex justify-center gap-4 mt-10 pt-6 border-t border-gray-100">
          <Button variant="teal" type="submit" disabled={loading} className="py-2 px-10 min-w-[180px]">
            {loading ? 'Processing...' : 'Confirm Appointment'}
          </Button>
          <Button variant="teal-outline" onClick={handleCancel} type="button" className="py-2 px-10">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}