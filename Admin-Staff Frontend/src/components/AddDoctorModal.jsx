import React, { useState, useEffect } from 'react';
import { X, User, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AddDoctorModal({ isOpen, onClose, onSuccess, editData = null }) {
  if (!isOpen) return null;

  const isEditing = !!editData;
  const token = localStorage.getItem('token'); 

  const DAYS_OF_WEEK = ['M', 'T', 'W', 'TH', 'F', 'S', 'SU'];
  const TIME_OPTIONS = [];
  for (let i = 6; i <= 20; i++) {
    const hour = i > 12 ? i - 12 : i;
    const ampm = i >= 12 ? 'PM' : 'AM';
    TIME_OPTIONS.push(`${hour}:00 ${ampm}`);
    TIME_OPTIONS.push(`${hour}:30 ${ampm}`);
  }

  const [departmentsList, setDepartmentsList] = useState([]);
  const [formData, setFormData] = useState({
    firstname: '', surname: '', deptIDs: [], schedule: '', time: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/departments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setDepartmentsList(data))
    .catch(() => toast.error("Failed to load departments."));

    if (isEditing && editData) {
      setFormData({
        firstname: editData.firstname || '',
        surname: editData.surname || '',
        deptIDs: editData.deptIDs || [],
        schedule: editData.schedule && editData.schedule !== 'Unassigned' ? editData.schedule : '',
        time: editData.time && editData.time !== 'Unassigned' ? editData.time : '',
      });
    }
  }, [editData, isOpen, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // For Doctors: POST to /doctors, PUT to /personnel/id
    const url = isEditing 
      ? `${import.meta.env.VITE_API_BASE_URL}/api/admin/personnel/${editData.raw_id}`
      : `${import.meta.env.VITE_API_BASE_URL}/api/admin/doctors`;
      
    const method = isEditing ? 'PUT' : 'POST';
    
    const payload = {
      role: 'DOCTOR', // Required for PUT /personnel to map correctly
      firstname: formData.firstname.trim(),
      surname: formData.surname.trim(),
      deptIDs: formData.deptIDs,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden font-poppins text-left">
        <div className="bg-gabay-teal px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold">{isEditing ? 'Update Doctor Details' : 'Register New Doctor'}</h2>
          <button onClick={onClose} className="hover:text-gray-200 transition"><X size={20}/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
              <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={formData.firstname} onChange={e => setFormData({...formData, firstname: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Surname</label>
              <input type="text" required className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} />
            </div>

            <div className="md:col-span-2 border-t pt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assign Departments</label>
              <select className="w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal" value="" 
                onChange={e => {
                  const val = Number(e.target.value);
                  if (val && !formData.deptIDs.includes(val)) {
                    setFormData({...formData, deptIDs: [...formData.deptIDs, val]});
                  }
                }}
              >
                <option value="" disabled>+ Select Department...</option>
                {departmentsList.map(d => <option key={d.deptID} value={d.deptID}>{d.department} ({d.type})</option>)}
              </select>
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.deptIDs.map(id => {
                  const dept = departmentsList.find(d => d.deptID === id);
                  return dept ? (
                    <span key={id} className="inline-flex items-center gap-1 bg-teal-50 text-gabay-teal border border-teal-200 px-3 py-1.5 rounded-md text-xs font-medium">
                      {dept.department}
                      <button type="button" className="hover:text-red-500 font-bold ml-1 transition" onClick={() => setFormData({...formData, deptIDs: formData.deptIDs.filter(d => d !== id)})}>×</button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-4">
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
                        className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${isSelected ? 'bg-gabay-teal text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                      >{day}</button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Working Hours</label>
                <div className="flex items-center gap-2">
                  <select className="flex-1 border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal bg-white"
                    value={formData.time ? formData.time.split(' - ')[0] : ''}
                    onChange={(e) => {
                      const currentEnd = formData.time ? formData.time.split(' - ')[1] || '5:00 PM' : '5:00 PM';
                      setFormData({...formData, time: `${e.target.value} - ${currentEnd}`});
                    }}>
                    <option value="" disabled>Start</option>
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="text-gray-400 font-bold">to</span>
                  <select className="flex-1 border p-2 rounded-lg text-sm outline-none focus:border-gabay-teal bg-white"
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
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
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