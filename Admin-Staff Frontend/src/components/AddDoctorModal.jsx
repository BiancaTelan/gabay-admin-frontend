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
  const [errors, setErrors] = useState({}); 

  const [schedules, setSchedules] = useState([
    { id: Date.now(), days: [], startTime: '08:00', endTime: '17:00', slot: 20 }
  ]);
  
  const [formData, setFormData] = useState({
    employeeID: '',
    firstname: '',
    middlename: '',
    surname: '', 
    licenseNumber: '',
    email: '',
    contact: '',
    deptID: ''
  });

  useEffect(() => {
    // Fetch departments
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/departments`, { headers: { 'Authorization': `Bearer ${token}` }})
    .then(res => res.json())
    .then(data => {
      setDepartmentsList(data);
      if (isEditing && editData) {
        const matchedDept = data.find(d => d.department === editData.dept);
        if (matchedDept && !formData.deptID) {
          setFormData(prev => ({ ...prev, deptID: matchedDept.deptID }));
        }
      }
    })
    .catch(() => toast.error("Failed to load departments."));

    // Pre-fill form data safely
    if (isEditing && editData) {
      let fName = editData.firstname || '';
      let sName = editData.surname || '';
      if (!fName && !sName && editData.name) {
          const parts = editData.name.split(' ');
          sName = parts.length > 1 ? parts.pop() : '';
          fName = parts.join(' ');
      }

      setFormData(prev => ({
        ...prev,
        employeeID: editData.id && editData.id !== 'Unassigned' ? editData.id : '',
        firstname: fName,
        middlename: editData.middlename || '',
        surname: sName,
        licenseNumber: editData.licenseNumber || editData.license_number || '',
        email: editData.email || '',
        contact: editData.phone !== 'N/A' ? editData.phone : '',
        deptID: editData.deptID || prev.deptID
      }));
      setShowSensitive(false);
      setErrors({}); // Reset errors
    } else {
      setFormData({ employeeID: '', firstname: '', middlename: '', surname: '', licenseNumber: '', email: '', contact: '', deptID: '' });
      setSchedules([{ id: Date.now(), days: [], startTime: '08:00', endTime: '17:00', slot: 20 }]);
      setErrors({}); // Reset errors
    }
  }, [editData, isOpen, token]);

  // --- NEW: INLINE VALIDATION LOGIC ---
  const validate = () => {
    const newErrors = {};
    if (!formData.firstname.trim()) newErrors.firstname = "Required";
    if (!formData.surname.trim()) newErrors.surname = "Required";
    if (!formData.employeeID.trim()) newErrors.employeeID = "Required";
    if (!formData.licenseNumber.trim()) newErrors.licenseNumber = "Required";
    if (!formData.deptID) newErrors.deptID = "Required";
    
    if (!isEditing && !formData.email.trim()) newErrors.email = "Required";
    
    if (!isEditing && schedules.some(s => s.days.length === 0)) {
      newErrors.schedules = "Select duty days for all blocks";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Wrapper for rendering inputs with inline errors
  const ErrorWrapper = ({ label, name, children }) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
        {errors[name] && <span className="text-[10px] text-red-500 font-bold">{errors[name]}</span>}
      </div>
      {children}
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Trigger inline validation
    if (!validate()) {
      toast.error("Please fix the errors highlighted in red.");
      return;
    }

    setIsSubmitting(true);
    
    const url = isEditing 
      ? `${import.meta.env.VITE_API_BASE_URL}/api/admin/doctors/${editData.raw_id}`
      : `${import.meta.env.VITE_API_BASE_URL}/api/admin/doctors`;
      
    const payload = {
      employeeID: formData.employeeID.trim(),
      licenseNumber: formData.licenseNumber.trim(),
      firstname: formData.firstname.trim(),
      middlename: formData.middlename.trim(),
      surname: formData.surname.trim(),
      contactNumber: formData.contact,
      deptID: parseInt(formData.deptID)
    };

    if (showSensitive && formData.email) {
        payload.email = formData.email.trim();
    }

    if (!isEditing) {
        payload.schedules = schedules;
        payload.email = formData.email.trim();
    }

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

            <ErrorWrapper label="First Name" name="firstname">
              <input type="text" className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal ${errors.firstname ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.firstname} onChange={e => setFormData({...formData, firstname: e.target.value})} />
            </ErrorWrapper>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Middle Name <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="text" className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={formData.middlename} onChange={e => setFormData({...formData, middlename: e.target.value})} />
            </div>

            <ErrorWrapper label="Surname" name="surname">
              <input type="text" className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal ${errors.surname ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} />
            </ErrorWrapper>

            <div className="md:col-span-3 pb-2 pt-4 border-b text-sm font-bold text-gabay-teal uppercase tracking-wide">System Assignment</div>

            <ErrorWrapper label="Employee ID" name="employeeID">
              <input type="text" placeholder="e.g., DOC-001" className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal ${errors.employeeID ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.employeeID} onChange={e => setFormData({...formData, employeeID: e.target.value})} />
            </ErrorWrapper>

            <ErrorWrapper label="PRC License Number" name="licenseNumber">
              <input type="text" className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal ${errors.licenseNumber ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} />
            </ErrorWrapper>

            <ErrorWrapper label="Assigned Department" name="deptID">
              <select className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal bg-white ${errors.deptID ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.deptID} onChange={e => setFormData({...formData, deptID: e.target.value})}>
                <option value="" disabled>Select department...</option>
                {departmentsList.map(d => <option key={d.deptID} value={d.deptID}>{d.department} ({d.type})</option>)}
              </select>
            </ErrorWrapper>

            {!isEditing && (
              <ErrorWrapper label="Email Address" name="email">
                <input type="email" className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal ${errors.email ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </ErrorWrapper>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="tel" className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            </div>

            {/* DYNAMIC SCHEDULE CAPTURE FOR NEW DOCTORS ONLY */}
            {!isEditing && (
                <>
                  <div className="md:col-span-3 pb-2 pt-4 border-b flex justify-between items-center text-sm font-bold text-gabay-teal uppercase tracking-wide">
                    <div className="flex items-center gap-3">
                      <span>Initial Schedules</span>
                      {errors.schedules && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full">{errors.schedules}</span>}
                    </div>
                    <button type="button" onClick={() => setSchedules([...schedules, { id: Date.now(), days: [], startTime: '08:00', endTime: '17:00', slot: 20 }])} className="text-xs flex items-center gap-1 text-gabay-teal hover:underline"><Plus size={14}/> Add Block</button>
                  </div>

                  {schedules.map((block, index) => (
                    <div key={block.id} className={`md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border bg-gray-50 rounded-xl relative ${errors.schedules && block.days.length === 0 ? 'border-red-400' : 'border-gray-100'}`}>
                        {schedules.length > 1 && <button type="button" onClick={() => setSchedules(schedules.filter(s => s.id !== block.id))} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><X size={16}/></button>}
                        
                        <div className="md:col-span-4">
                            <label className={`block text-[10px] font-bold uppercase mb-2 ${errors.schedules && block.days.length === 0 ? 'text-red-500' : 'text-gray-400'}`}>Duty Days</label>
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
                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <p className="text-xs text-red-600 font-medium">Modifying these fields will trigger an email notification to the doctor with their updated credentials/assignments.</p>
                    
                    <div>
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