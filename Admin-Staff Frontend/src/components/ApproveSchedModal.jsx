import { useState, useEffect } from 'react';
import { X, CalendarDays } from 'lucide-react'; 
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Button from '../components/button';
import toast from 'react-hot-toast';

export default function ApproveScheduleModal({ isOpen, onClose, appointment, onApprove, token, onDeny, apiBase = "/api/staff" }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(appointment?.docID || '');
  const [allowedDays, setAllowedDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState('Morning');
  const [denyReason, setDenyReason] = useState('');

  const [showFileViewer, setShowFileViewer] = useState(false);
  const [secureFileUrl, setSecureFileUrl] = useState(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  useEffect(() => {
    if (isOpen && appointment) {
      setSelectedDocId(appointment.docID || '');
      setSelectedDate(null);
      setDenyReason('');
      setSelectedBatch('Morning');
    }
  }, [appointment, isOpen]);

  // --- FETCH DOCTORS LIST ---
  useEffect(() => {
    if (!token || !isOpen) return;
    
    fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/doctors/list`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setDoctors(data))
    .catch(err => console.error("Failed to fetch doctors", err));
  }, [token, isOpen, apiBase]);

  // --- FETCH DOCTOR WORKING DAYS ---
  useEffect(() => {
    if (!selectedDocId || !token || !isOpen) {
        setAllowedDays([]);
        return;
    }
    fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/doctors/${selectedDocId}/working-days`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    })
    .then(res => res.json())
    .then(data => setAllowedDays(data.working_days || []))
    .catch(err => console.error("Failed to fetch working days:", err));
  }, [selectedDocId, token, isOpen, apiBase]);

  const isWorkingDay = (date) => {
    return allowedDays.includes(date.getDay()); 
  };

  const startDate = appointment?.requestedStartDate ? new Date(appointment.requestedStartDate) : new Date();

  // --- SMART INLINE FILE VIEWER ---
  const handleViewFile = () => {
    const documentUrl = appointment?.attachedFile;
    if (!documentUrl) {
      toast.error("No document attached.");
      return;
    }
    
    // Force HTTPS to prevent mixed-content blocking by modern browsers
    const httpsUrl = documentUrl.replace(/^http:\/\//i, 'https://');
    setSecureFileUrl(httpsUrl);
    setShowFileViewer(true);
  };

  // --- CLEANUP FUNCTION ---
  const closeFileViewer = () => {
    setShowFileViewer(false);
    setSecureFileUrl(null);
  };

  const filteredDoctors = doctors.filter(
    (doc) => doc.department === (appointment?.department || "General")
  );

  const handleApprove = () => {
    if (!selectedDate) return alert('Please select a date.');
    if (!selectedDocId) return alert('Please assign a doctor.');
    if (!selectedBatch) return alert('Please select a batch.');

    const formattedDate = selectedDate.toLocaleDateString('en-US', {
      month: '2-digit', day: '2-digit', year: 'numeric',
    });

    const docObj = doctors.find(d => String(d.id) === String(selectedDocId));
    const docName = docObj ? docObj.name : appointment.assignedDoctor;

    onApprove({
      ...appointment,
      docID: selectedDocId,
      assignedDoctor: docName,
      appointmentDate: formattedDate,
      batch: selectedBatch
    });
  };

  if (!isOpen || !appointment) return null;

  // --- CHECK FILE TYPE FOR RENDER LOGIC ---
  const isImage = secureFileUrl?.match(/\.(jpeg|jpg|gif|png|webp)$/i);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 sm:p-6 backdrop-blur-sm">
      
      {/* MAIN MODAL CONTAINER*/}
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col relative max-h-[95vh] overflow-hidden border border-gray-100">
        
        {/* STICKY HEADER */}
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white z-20 shrink-0">
          <h3 className="font-montserrat text-xl font-bold text-gabay-blue">
            Approve Schedule
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 p-2 rounded-full transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="px-8 py-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          
          {/* Patient Details Card */}
          <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100/50 space-y-3">
            <div>
              <label className="block font-poppins text-[11px] font-bold text-gray-400 uppercase tracking-widest">Patient Name</label>
              <p className="font-poppins font-semibold text-gabay-navy text-lg">{appointment.name}</p>
            </div>
            <div>
              <label className="block font-poppins text-[11px] font-bold text-gray-400 uppercase tracking-widest">Department</label>
              <p className="font-poppins font-medium text-gabay-teal">{appointment.department || "General"}</p>
            </div>
          </div>

          <div>
            <label className="block font-poppins font-medium text-[15px] text-gabay-navy mb-1.5">Assigned Doctor:</label>
            <select
              value={selectedDocId}
              onChange={(e) => {
                setSelectedDocId(e.target.value);
                setSelectedDate(null); 
              }}
              className="w-full p-2.5 border border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:ring-2 focus:ring-gabay-blue bg-white"
              required
            >
              <option value="">Select a doctor</option>
              {filteredDoctors.length > 0 ? (
                filteredDoctors.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.name}</option>
                ))
              ) : (
                <option value="" disabled>No doctors available in this department</option>
              )}
            </select>
          </div>

          <div>
            <label className="block font-poppins font-medium text-[15px] text-gabay-navy mb-1">Schedule Date:</label>
            <p className="font-poppins text-xs text-gray-500 mb-2">
              Requested range: <span className="font-medium text-gray-700">{appointment.requestedStartDate} - {appointment.requestedEndDate}</span>
            </p>
            <div className="relative">
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                filterDate={isWorkingDay}
                minDate={startDate}
                disabled={!selectedDocId || allowedDays.length === 0}
                placeholderText={!selectedDocId ? "Select doctor first" : "Select date within range"}
                className="w-full p-2.5 border border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:ring-2 focus:ring-gabay-blue pr-10 cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                wrapperClassName="w-full"
              />
              <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div>
            <label className="block font-poppins font-medium text-[15px] text-gabay-navy mb-2">Batch Timing:</label>
            <div className="flex flex-col sm:flex-row gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="radio"
                  name="batch"
                  value="Morning"
                  checked={selectedBatch === 'Morning'}
                  onChange={() => setSelectedBatch('Morning')}
                  className="text-gabay-blue focus:ring-gabay-blue accent-gabay-blue w-4 h-4"
                />
                <span className="font-poppins text-sm font-medium text-gray-700">Morning (8 AM - 12 PM)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer flex-1">
                <input
                  type="radio"
                  name="batch"
                  value="Afternoon"
                  checked={selectedBatch === 'Afternoon'}
                  onChange={() => setSelectedBatch('Afternoon')}
                  className="text-gabay-blue focus:ring-gabay-blue accent-gabay-blue w-4 h-4"
                />
                <span className="font-poppins text-sm font-medium text-gray-700">Afternoon (1 PM - 5 PM)</span>
              </label>
            </div>
          </div>

          {appointment.attachedFile && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="font-poppins font-medium text-sm text-gabay-navy">Attached Document (Specialty Form)</p>
              <button 
                onClick={handleViewFile}
                disabled={isLoadingFile}
                className="text-white bg-gabay-blue hover:bg-gabay-navy px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors disabled:bg-gray-300 whitespace-nowrap"
                type="button"
              >
                View File
              </button>
            </div>
          )}

          <p className="font-poppins text-xs text-gray-400 text-center italic pt-2 pb-2">
            An automated alert will be sent via Email.
          </p>
        </div>

        {/* STICKY FOOTER */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 shrink-0 z-20">
          <label className="block font-poppins font-medium text-gabay-navy text-sm mb-2">
            Denial Remarks <span className="text-gray-400 font-normal text-xs">(Required if denying)</span>
          </label>
          <textarea
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder="Explain why this cannot be approved..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg font-poppins text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4 resize-none"
            rows="2"
          />
          
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button 
              onClick={() => onDeny(appointment.id, denyReason)}
              className="px-5 py-2.5 bg-white text-red-600 border border-red-200 rounded-lg font-poppins text-sm font-bold hover:bg-red-50 transition-colors sm:w-auto w-full"
            >
              Deny Appointment
            </button>
            <Button variant="teal" onClick={handleApprove} className="px-8 py-2.5 sm:w-auto w-full">
              Approve & Notify
            </Button>
          </div>
        </div>

      </div>
      
      {/* FILE VIEWER MODAL */}
      {showFileViewer && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 sm:p-10">
          <div className="absolute inset-0 bg-black/80" onClick={closeFileViewer}></div>
          <div className="bg-gray-100 rounded-xl shadow-2xl w-full h-[85vh] flex flex-col relative z-10 border border-gray-300">
            <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200 rounded-t-xl shrink-0">
              <h3 className="font-montserrat text-xl font-bold text-gabay-navy">
                Document Viewer
              </h3>
              <button 
                onClick={closeFileViewer} 
                className="text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-red-50 p-2 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 w-full h-full p-4 overflow-auto flex items-center justify-center bg-gray-50/50">
              {isImage ? (
                <img 
                  src={secureFileUrl} 
                  alt="Attached Document" 
                  className="max-w-full max-h-full rounded-lg shadow-md border border-gray-200 object-contain"
                />
              ) : (
                <iframe 
                  src={secureFileUrl} 
                  className="w-full h-full rounded-lg bg-white shadow-inner border border-gray-200" 
                  title="Secure Attachment Viewer" 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}