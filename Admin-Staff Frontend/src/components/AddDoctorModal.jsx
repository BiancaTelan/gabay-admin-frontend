import React, { useState, useEffect } from 'react';
import { X, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AddDoctorModal({ isOpen, onClose, onSuccess, editData = null }) {
  if (!isOpen) return null;

  const isEditing = !!editData;
  const token = localStorage.getItem('gabay_admin_token'); 
  const DAYS_OF_WEEK = ['M', 'T', 'W', 'TH', 'F', 'S', 'SU'];

  const [departmentsList, setDepartmentsList] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);

  const [schedules, setSchedules] = useState([
    { id: Date.now(), days: [], startTime: '08:00', endTime: '17:00', slot: 20 }
  ]);
  
  const [formData, setFormData] = useState({
    id: '',
    firstname: '',
    middlename: '',
    surname: '', 
    licenseNumber: '',
    email: '',
    contact: '',
    deptID: ''
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/departments`, { headers: { 'Authorization': `Bearer ${token}` }})
    .then(res => res.json())
    .then(data => setDepartmentsList(data))
    .catch(() => toast.error("Failed to load departments."));

    if (isEditing && editData) {
      setFormData({
        id: editData.id && editData.id !== 'Unassigned' ? editData.id : '',
        firstname: editData.firstname || '',
        middlename: editData.middlename || '',
        surname: editData.surname || '',
        licenseNumber: editData.licenseNumber || editData.license_number || '',
        email: editData.email || '',
        contact: editData.phone !== 'N/A' ? editData.phone : '',
        deptID: editData.deptID || ''
      });
      setShowSensitive(false);
    } else {
      setSchedules([{ id: Date.now(), days: [], startTime: '08:00', endTime: '17:00', slot: 20 }]);
    }
  }, [editData, isOpen, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.id.trim() || !formData.firstname.trim() || !formData.surname.trim() || !formData.licenseNumber.trim() || !formData.deptID) {
      toast.error("Employee ID, Name, License No., and Department are strictly required.");
      return;
    }

    if (!isEditing && schedules.some(s => s.days.length === 0)) {
        toast.error("Please assign duty days to all created schedule blocks.");
        return;
    }

    setIsSubmitting(true);
    
    const url = isEditing 
      ? `${import.meta.env.VITE_API_BASE_URL}/api/admin/doctors/${editData.raw_id}`
      : `${import.meta.env.VITE_API_BASE_URL}/api/admin/doctors`;
      
    const payload = isEditing ? {
      firstname: formData.firstname.trim(),
      middlename: formData.middlename.trim(),
      surname: formData.surname.trim(),
      contactNumber: formData.contact,
      deptID: parseInt(formData.deptID),
      id: showSensitive && formData.id ? formData.id : undefined,
      email: showSensitive && formData.email ? formData.email : undefined,
      licenseNumber: showSensitive && formData.licenseNumber ? formData.licenseNumber : undefined,
    } : {
      id: formData.id.trim(),
      firstname: formData.firstname.trim(),
      middlename: formData.middlename.trim(),
      surname: formData.surname.trim(),
      licenseNumber: formData.licenseNumber.trim(),
      email: formData.email.trim(),
      contactNumber: formData.contact,
      deptID: parseInt(formData.deptID),
      schedules: schedules
    };

    try {
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.json();
        throw new Error(errorText.detail || `Failed to ${isEditing ? 'update' : 'add'} doctor.`);
      }

      toast.success(isEditing ? `Updated record for Dr. ${formData.surname}` : `Dr. ${formData.surname} registered successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.message); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-full overflow-y-auto font-poppins text-left">
        <div className="bg-gabay-teal px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10">
          <h2 className="text-lg font-bold">{isEditing ? 'Update Doctor Details' : 'Register New Doctor'}</h2>
          <button onClick={onClose} className="hover:text-gray-200 transition"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="md:col-span-3 pb-2 border-b text-sm font-bold text-gabay-teal uppercase tracking-wide">Professional Profile</div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
              <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={formData.firstname} onChange={e => setFormData({...formData, firstname: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Middle Name <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="text" className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={formData.middlename} onChange={e => setFormData({...formData, middlename: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Surname</label>
              <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} />
            </div>

            <div className="md:col-span-3 pb-2 pt-4 border-b text-sm font-bold text-gabay-teal uppercase tracking-wide">System Assignment</div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Employee ID</label>
              <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" placeholder="e.g., DOC-001" value={formData.id} onChange={e => setFormData({...formData, idD: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">PRC License Number</label>
              <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Department</label>
              <select required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal bg-white" value={formData.deptID} onChange={e => setFormData({...formData, deptID: e.target.value})}>
                <option value="" disabled>Select department...</option>
                {departmentsList.map(d => <option key={d.deptID} value={d.deptID}>{d.department} ({d.type})</option>)}
              </select>
            </div>
            {!isEditing && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                <input type="email" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
            )}
            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number</label>
                <input type="tel" className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            </div>

            {/* DYNAMIC SCHEDULE CAPTURE FOR NEW DOCTORS ONLY */}
            {!isEditing && (
                <>
                  <div className="md:col-span-3 pb-2 pt-4 border-b flex justify-between items-center text-sm font-bold text-gabay-teal uppercase tracking-wide">
                    <span>Initial Schedules</span>
                    <button type="button" onClick={() => setSchedules([...schedules, { id: Date.now(), days: [], startTime: '08:00', endTime: '17:00', slot: 20 }])} className="text-xs flex items-center gap-1 text-gabay-teal hover:underline"><Plus size={14}/> Add Block</button>
                  </div>

                  {schedules.map((block, index) => (
                    <div key={block.id} className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-100 bg-gray-50 rounded-xl relative">
                        {schedules.length > 1 && <button type="button" onClick={() => setSchedules(schedules.filter(s => s.id !== block.id))} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><X size={16}/></button>}
                        
                        <div className="md:col-span-4">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Duty Days</label>
                            <div className="flex gap-2 flex-wrap">
                                {DAYS_OF_WEEK.map(day => (
                                    <button type="button" key={day} onClick={() => {
                                        const newDays = block.days.includes(day) ? block.days.filter(d => d !== day) : [...block.days, day];
                                        const newScheds = [...schedules];
                                        newScheds[index].days = newDays;
                                        setSchedules(newScheds);
                                    }} className={`w-8 h-8 rounded-full text-xs font-bold transition-all border ${block.days.includes(day) ? 'bg-gabay-teal border-gabay-teal text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>{day}</button>
                                ))}
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Start Time</label>
                            <input type="time" value={block.startTime} onChange={e => { const s = [...schedules]; s[index].startTime = e.target.value; setSchedules(s); }} className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal bg-white" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">End Time</label>
                            <input type="time" value={block.endTime} onChange={e => { const s = [...schedules]; s[index].endTime = e.target.value; setSchedules(s); }} className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal bg-white" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Patient Capacity (Slots)</label>
                            <input type="number" min="1" value={block.slot} onChange={e => { const s = [...schedules]; s[index].slot = parseInt(e.target.value); setSchedules(s); }} className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal bg-white" />
                        </div>
                    </div>
                  ))}
                </>
            )}

            {/* SENSITIVE DATA TOGGLE FOR EDIT */}
            {isEditing && (
              <div className="md:col-span-3 mt-4 border border-red-200 bg-red-50 rounded-xl p-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowSensitive(!showSensitive)}>
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle size={18} />
                    <span className="text-sm font-bold">Advanced Account Settings (Sensitive)</span>
                  </div>
                  <button type="button" className="text-xs bg-white border border-red-200 text-red-700 px-3 py-1 rounded-full font-bold hover:bg-red-100">
                    {showSensitive ? 'Hide' : 'Expand'}
                  </button>
                </div>
                
                {showSensitive && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <p className="md:col-span-2 text-xs text-red-600 font-medium">Modifying these fields will trigger an email notification to the doctor with their updated credentials/assignments.</p>
                    
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Change Employee ID</label>
                      <input type="text" className="w-full border border-red-300 p-2 rounded-lg text-sm outline-none focus:border-red-500" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Change License Number</label>
                      <input type="text" className="w-full border border-red-300 p-2 rounded-lg text-sm outline-none focus:border-red-500" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">New Email Address</label>
                      <input type="email" className="w-full border border-red-300 p-2 rounded-lg text-sm outline-none focus:border-red-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Change email..." />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-medium text-white bg-gabay-teal hover:bg-opacity-90 rounded-lg transition disabled:opacity-50">
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Register Doctor')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}