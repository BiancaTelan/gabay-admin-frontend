import React, { useState } from 'react';
import { X, User, Save } from 'lucide-react';
import Button from './button';

export default function AddDoctorModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    role: 'Doctor'
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required.';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Please enter a valid complete name.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    onSave(formData);
    setFormData({ name: '', role: 'Doctor' });
    setErrors({});
    onClose();
  };

  const handleCancel = () => {
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm font-poppins">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 text-left">
        
        {/*
          NOTE FOR BACKEND/API INTEGRATION:
          ---------------------------------------------------------------------
          When connecting the single-department assignment or department lists:
          1. Fetch the active department list from the DB endpoint (e.g., GET /api/departments) 
             inside a useEffect hook at the parent or component level.
          2. Store the list in a local state and map it down into a standard HTML <select> element.
          3. Bind the selected department's ID or unique name directly into the `formData` state object 
             (e.g., departmentId: '').
          4. Ensure you append an explicit validation check right in `validateForm()` above to prevent 
             submission if no valid department choice is selected.
        */}

        <div className="p-5 flex items-center border-b border-gray-50">
          <div className="w-10"></div> {/* Left Spacer */}
          <h3 className="flex-1 text-center font-montserrat font-bold uppercase tracking-wide text-lg text-gabay-blue">
            Register New Doctor
          </h3>
          <button 
            onClick={handleCancel} 
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <User size={18} className="text-gabay-teal" /> Full Name
            </label>
            <input 
              type="text" 
              placeholder="e.g. Dela Cruz, Juan"
              className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gabay-navy outline-none focus:ring-2 focus:ring-gabay-teal/20 transition-all ${
                errors.name 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' 
                  : 'border-gray-200 focus:border-gabay-teal'
              }`}
              value={formData.name}
              onChange={(e) => {
                setFormData({...formData, name: e.target.value});
                if (e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, name: null }));
                }
              }}
            />
            {errors.name && (
              <p className="text-xs font-medium text-red-500 px-1 animate-in fade-in duration-150">
                {errors.name}
              </p>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <Button 
              variant="teal-outline"
              type="button" 
              onClick={handleCancel}
              className="flex-1 py-3"
            >
              Cancel
            </Button>
            <Button 
              variant="teal" 
              type="submit" 
              className="flex-1 py-3 flex items-center justify-center gap-2"
            >
              <Save size={18} /> SAVE DOCTOR
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}