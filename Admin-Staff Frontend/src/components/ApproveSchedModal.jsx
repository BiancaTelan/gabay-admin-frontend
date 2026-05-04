import { useState, useEffect } from 'react';
import { X, CalendarDays } from 'lucide-react'; 
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Button from '../components/button';

export default function ApproveScheduleModal({ isOpen, onClose, appointment, onApprove, token }) {
  const [selectedDoctor, setSelectedDoctor] = useState(appointment.assignedDoctor || '');
  const apiBase = '/api/staff';
  const [allowedDays, setAllowedDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBatch, setSelectedBatch] = useState('Morning');
  const [denyReason, setDenyReason] = useState('');

  const [showFileViewer, setShowFileViewer] = useState(false);
  const [secureFileUrl, setSecureFileUrl] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
 

  useEffect(() => {
    const fetchWorkingDays = async () => {
      const doctorId = appointment?.docID; 
      if (!doctorId) return;

      if (!token) {
        console.error("No token provided to modal");
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff/doctors/${doctorId}/working-days`, {
          
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' 
          }
        });
        
        if (!response.ok) throw new Error("Failed to fetch schedule");
        
        const data = await response.json();
        setAllowedDays(data.working_days || []);
      } catch (error) {
        console.error("Failed to fetch working days:", error);
      }
    };

    fetchWorkingDays();
  }, [appointment]);

  const isWorkingDay = (date) => {
    const day = date.getDay(); 
    return allowedDays.includes(day); 
  };

  const doctors = [
    'Dr. Diane Marie Mendoza',
    'Dr. Joseph Nieto',
    'Dr. Ritchie Cruz',
    'Dr. Vinhcent Sandoval'
  ];

  
  const startDate = appointment.requestedStartDate ? new Date(appointment.requestedStartDate) : null;

  const handleViewFile = async (e) => {
    e.preventDefault(); 

    if (secureFileUrl) {
      setShowFileViewer(true);
      return;
    }

    setIsLoadingFile(true);
    try {
      let targetUrl = appointment.attachedFile;
      
      if (!targetUrl.startsWith('http')) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, ''); 
        const path = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`; 
        targetUrl = `${baseUrl}${path}`;
      }

      const response = await fetch(targetUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const blob = await response.blob();
      
      if (blob.type.includes('text/html')) {
        throw new Error("The server returned an HTML webpage instead of a document.");
      }

      const objectUrl = URL.createObjectURL(blob);
      setSecureFileUrl(objectUrl);
      setShowFileViewer(true);
    } catch (error) {
      console.error("Error loading file:", error);
      alert(`Could not load the attached file: ${error.message}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleApprove = () => {
    if (!selectedDate) {
      alert('Please select a date.');
      return;
    }
    if (!selectedDoctor) {
      alert('Please assign a doctor.');
      return;
    }
    if (!selectedBatch) {
      alert('Please select a batch.');
      return;
    }

    const formattedDate = selectedDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });

    onApprove({
      ...appointment,
      assignedDoctor: selectedDoctor,
      appointmentDate: formattedDate,
      batch: selectedBatch
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-10 relative">
        <div className="relative mb-4">
          <h3 className="font-montserrat text-xl font-bold text-gabay-blue text-center">
            Approve Schedule
          </h3>
          <button
            onClick={onClose}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block font-poppins font-medium text-lg text-gabay-navy">Patient:</label>
            <p className="font-poppins mt-1 text-gray-700">{appointment.name}</p>
          </div>

          {/* Doctor assignment */}
          <div>
            <label className="block font-poppins font-medium text-lg text-gabay-navy">Assigned Doctor:</label>
            {appointment.assignedDoctor ? (
              <p className="font-poppins text-gray-800 mt-1">{appointment.assignedDoctor}</p>
            ) : (
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="mt-1 w-full p-2 border border-gray-200 rounded-md font-poppins text-md focus:outline-none focus:ring-2 focus:ring-gabay-blue"
                required
              >
                <option value="">Select a doctor</option>
                {doctors.map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            )}
          </div>

          {/* Date selection with Icon inside */}
          <div>
            <label className="block font-poppins font-medium text-lg text-gabay-navy">Date:</label>
            <p className="font-poppins text-sm text-gray-500 mb-1">
              Requested range: {appointment.requestedStartDate} - {appointment.requestedEndDate}
            </p>
            <div className="relative">
              <DatePicker
                selected={selectedDate}
                onChange={(date) => {
                  setSelectedDate(date);
                  // Format the date to MM/DD/YYYY for your backend payload
                  const formattedDate = date.toLocaleDateString('en-US', {
                    month: '2-digit', day: '2-digit', year: 'numeric'
                  });
                  // Pass this formattedDate to whatever state manages your form submission!
                }}
                filterDate={isWorkingDay}
                minDate={startDate}
                placeholderText="Select date within range"
                className="w-full p-2 border border-gray-200 rounded-md font-poppins text-md focus:outline-none focus:ring-2 focus:ring-gabay-blue pr-10 cursor-pointer"
                wrapperClassName="w-full"
              />
              <CalendarDays 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
                size={20} 
              />
            </div>
          </div>

          {/* Batch */}
          <div>
            <label className="block font-poppins font-medium text-lg text-gabay-navy">Batch:</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="batch"
                  value="Morning"
                  checked={selectedBatch === 'Morning'}
                  onChange={() => setSelectedBatch('Morning')}
                  className="text-gabay-blue focus:ring-gabay-blue"
                />
                <span className="font-poppins text-md">Morning (8:00 - 12:00)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="batch"
                  value="Afternoon"
                  checked={selectedBatch === 'Afternoon'}
                  onChange={() => setSelectedBatch('Afternoon')}
                  className="text-gabay-blue focus:ring-gabay-blue"
                />
                <span className="font-poppins text-md">Afternoon (1:00 - 5:00)</span>
              </label>
            </div>
          </div>

          {/* Specialty Form Attachment */}
        {appointment.attachedFile && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="font-poppins font-medium text-sm text-gabay-navy mb-1">Attached Document (Specialty Form):</p>
            <button 
              onClick={handleViewFile}
              disabled={isLoadingFile}
              className="text-gabay-blue hover:text-gabay-teal text-sm font-medium underline flex items-center gap-1 disabled:text-gray-400"
              type="button"
            >
              {isLoadingFile ? "⏳ Loading File securely..." : "📄 View Uploaded File"}
            </button>
          </div>
        )}

          <p className="font-poppins text-sm text-gray-500 text-center italic mt-4">
            An automated alert will be sent via Email.
          </p>
        </div>

        
          {/* Deny Action Section */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <label className="block font-poppins font-medium text-gabay-navy text-sm mb-2">
            Denial Remarks (Required if denying):
          </label>
          <textarea
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder="Please explain why this appointment cannot be approved..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-poppins text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
            rows="2"
          />
          
          <div className="flex justify-end gap-3">
            <Button variant="teal" onClick={handleApprove} className="flex-1 py-2">
            Approve & Notify
          </Button>
            <button 
              onClick={() => onDeny(appointment.id, denyReason)}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md font-poppins text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Deny Appointment
            </button>
            
          </div>
        </div>
      </div>
      {/* 👇 THE SECURE FILE VIEWER MODAL 👇 */}
      {showFileViewer && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 sm:p-10">
          {/* Dark backdrop specifically for the file viewer */}
          <div className="absolute inset-0 bg-black/80" onClick={() => setShowFileViewer(false)}></div>
          
          <div className="bg-gray-100 rounded-xl shadow-2xl w-full h-[85vh] flex flex-col relative z-10 border border-gray-300">
            {/* Viewer Header */}
            <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200 rounded-t-xl">
              <h3 className="font-montserrat text-xl font-bold text-gabay-navy">
                Document Viewer
              </h3>
              <button 
                onClick={() => setShowFileViewer(false)} 
                className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-full transition-colors"
                title="Close Viewer"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Viewer Iframe */}
            <div className="flex-1 w-full h-full p-2">
              <iframe 
                src={secureFileUrl} 
                className="w-full h-full rounded-lg bg-white shadow-inner" 
                title="Secure Attachment Viewer" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}