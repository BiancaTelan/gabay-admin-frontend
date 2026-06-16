import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ErrorWrapper = ({ label, name, children }) => (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
        {errors[name] && <span className="text-[10px] text-red-500 font-bold">{errors[name]}</span>}
      </div>
      {children}
    </div>
  );

export default function AddPersonnelModal({ isOpen, onClose, onSuccess, editData = null }) {
  if (!isOpen) return null;

  const isEditing = !!editData;
  const token = localStorage.getItem('gabay_admin_token');

  const DAYS_OF_WEEK = ['M', 'T', 'W', 'TH', 'F', 'S', 'SU'];
  const TIME_OPTIONS = [];
  for (let i = 6; i <= 20; i++) {
    const hour = i > 12 ? i - 12 : i;
    const ampm = i >= 12 ? 'PM' : 'AM';
    TIME_OPTIONS.push(`${hour}:00 ${ampm}`);
    TIME_OPTIONS.push(`${hour}:30 ${ampm}`);
  }

  const [formData, setFormData] = useState({
    employeeID: '',
    firstname: '', 
    middlename: '',
    surname: '', 
    email: '', 
    password: '',
    contact: '',
    gender: 'Female',
    role: 'Staff', 
    schedule: '', 
    time: '', 
    position: 'Staff'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  const [errors, setErrors] = useState({}); 

  useEffect(() => {
    if (isEditing && editData) {
      setFormData({
        employeeID: editData.id && editData.id !== 'Unassigned' ? editData.id : '',
        firstname: editData.firstname || '',
        middlename: editData.middlename || '',
        surname: editData.surname || '',
        gender: editData.gender || 'Female',
        email: editData.email || '', 
        password: '', 
        contact: editData.phone !== 'N/A' ? editData.phone : '',
        role: editData.role === 'ADMIN' ? 'Admin' : 'Staff',
        schedule: editData.schedule && editData.schedule !== 'Unassigned' ? editData.schedule : '',
        time: editData.time && editData.time !== 'Unassigned' ? editData.time : '',
        position: 'Staff'
      });
      setShowSensitive(false);
      setShowPassword(false); 
      setErrors({});
    } else {
      setErrors({});
    }
  }, [editData, isOpen, token]);

  // --- NEW: INLINE VALIDATION LOGIC ---
  const validate = () => {
    const newErrors = {};
    if (!formData.firstname.trim()) newErrors.firstname = "Required";
    if (!formData.surname.trim()) newErrors.surname = "Required";
    if (!formData.employeeID.trim()) newErrors.employeeID = "Required";
    if (!formData.contact.trim()) newErrors.contact = "Required";
    
    if (!isEditing && !formData.email.trim()) newErrors.email = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
        toast.error("Please fix the errors highlighted in red.");
        return;
    }

    setIsSubmitting(true);
    
    const url = isEditing 
      ? `${import.meta.env.VITE_API_BASE_URL}/api/admin/personnel/${editData.raw_id}`
      : `${import.meta.env.VITE_API_BASE_URL}/api/admin/addusers`;
      
    const method = isEditing ? 'PUT' : 'POST';
    
    const payload = isEditing ? {
      employeeID: formData.employeeID,
      role: formData.role.toUpperCase(),
      workingDays: formData.schedule || "Unassigned",
      workingHours: formData.time || "Unassigned",
      firstname: formData.firstname,
      middlename: formData.middlename,
      surname: formData.surname,
      gender: formData.gender,
      contactNumber: formData.contact,
      email: showSensitive && formData.email ? formData.email : undefined,
      password: showSensitive && formData.password ? formData.password : undefined,
    } : {
      employeeID: formData.employeeID,
      firstname: formData.firstname,
      middlename: formData.middlename,
      surname: formData.surname,
      gender: formData.gender,
      email: formData.email,
      contactNumber: formData.contact,
      role: formData.role,
      position: formData.position,
      workingDays: formData.schedule || "Unassigned", 
      workingHours: formData.time || "Unassigned" 
    };

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.json();
        throw new Error(errorText.detail || `Failed to ${isEditing ? 'update' : 'create'} personnel.`);
      }

      toast.success(isEditing ? `Updated profile for ${formData.firstname}` : `${formData.firstname}'s account created!`);
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
        <div className="bg-gabay-blue px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10">
          <h2 className="text-lg font-bold">{isEditing ? 'Update Personnel Details' : 'Register New Personnel'}</h2>
          <button onClick={onClose} className="hover:text-gray-300 transition"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* PERSONAL DETAILS SECTION */}
            <div className="md:col-span-3 pb-2 border-b text-sm font-bold text-gabay-blue uppercase tracking-wide">
              Personal Information
            </div>

            <ErrorWrapper label="First Name" name="firstname">
              <input type="text" className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${errors.firstname ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.firstname} onChange={e => setFormData({...formData, firstname: e.target.value})} />
            </ErrorWrapper>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Middle Name <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="text" className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue" value={formData.middlename} onChange={e => setFormData({...formData, middlename: e.target.value})} />
            </div>

            <ErrorWrapper label="Surname" name="surname">
              <input type="text" className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${errors.surname ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} />
            </ErrorWrapper>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
              <select className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue bg-white" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <ErrorWrapper label="Contact Number" name="contact">
                <input type="tel" className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${errors.contact ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            </ErrorWrapper>

            {/* SYSTEM DETAILS SECTION */}
            <div className="md:col-span-3 pb-2 pt-4 border-b text-sm font-bold text-gabay-blue uppercase tracking-wide">
              System Configuration
            </div>

            <ErrorWrapper label="Employee ID" name="employeeID">
              <input type="text" placeholder="e.g., EMP-001" className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${errors.employeeID ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.employeeID} onChange={e => setFormData({...formData, employeeID: e.target.value})} />
            </ErrorWrapper>
            
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">System Role</label>
              <select className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-blue bg-white" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            {!isEditing && (
              <ErrorWrapper label="Email Address" name="email">
                <input type="email" className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${errors.email ? 'border-red-500 bg-red-50/30' : ''}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </ErrorWrapper>
            )}
            
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Working Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const currentDays = formData.schedule ? formData.schedule.split(',').map(d => d.trim()) : [];
                    const isSelected = currentDays.includes(day);
                    return (
                      <button type="button" key={day} onClick={() => {
                          let newDays = [...currentDays];
                          if (isSelected) newDays = newDays.filter(d => d !== day);
                          else newDays.push(day);
                          newDays.sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
                          setFormData({...formData, schedule: newDays.join(', ')});
                        }}
                        className={`w-9 h-9 rounded-full text-xs font-bold transition-all border ${isSelected ? 'bg-gabay-blue border-gabay-blue text-white shadow-md' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      >{day}</button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Working Hours</label>
                <div className="flex items-center gap-2">
                  <select className="flex-1 border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue bg-white"
                    value={formData.time ? formData.time.split(' - ')[0] : ''}
                    onChange={(e) => {
                      const currentEnd = formData.time ? formData.time.split(' - ')[1] || '5:00 PM' : '5:00 PM';
                      setFormData({...formData, time: `${e.target.value} - ${currentEnd}`});
                    }}>
                    <option value="" disabled>Start</option>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="text-gray-400 font-bold">to</span>
                  <select className="flex-1 border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue bg-white"
                    value={formData.time ? formData.time.split(' - ')[1] : ''}
                    onChange={(e) => {
                      const currentStart = formData.time ? formData.time.split(' - ')[0] || '8:00 AM' : '8:00 AM';
                      setFormData({...formData, time: `${currentStart} - ${e.target.value}`});
                    }}>
                    <option value="" disabled>End</option>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

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
                    <p className="md:col-span-2 text-xs text-red-600 font-medium">Modifying these fields will instantly update the user's login credentials. They will receive an email notifying them of the changes.</p>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">New Email Address</label>
                      <input type="email" className="w-full border border-red-300 p-2 rounded-lg text-sm outline-none focus:border-red-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Change email..." />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">New Password</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          minLength={8} 
                          className="w-full border border-red-300 p-2 pr-10 rounded-lg text-sm outline-none focus:border-red-500" 
                          value={formData.password} 
                          onChange={e => setFormData({...formData, password: e.target.value})} 
                          placeholder="Leave blank to keep current" 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-sm font-medium text-white bg-gabay-blue hover:bg-opacity-90 rounded-lg transition disabled:opacity-50">
              {isSubmitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Account')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}