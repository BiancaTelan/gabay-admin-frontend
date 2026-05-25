import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PersonnelModal = ({ isOpen, onClose, onSuccess, editData = null }) => {
  if (!isOpen) return null;

  const isEditing = !!editData; // True if editData is provided, otherwise False

  // --- INITIAL STATE CONFIGURATION ---
  const initialFormState = {
    firstname: '', 
    surname: '', 
    email: '', 
    role: 'Staff', 
    departments: [],
    position: 'Nurse', 
    contactNumber: '',
    gender: 'Female'
  };

  // --- LOCAL FORM STATES ---
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when entering edit mode or when editData changes
  useEffect(() => {
    if (isEditing && editData) {
      setFormData({
        firstname: editData.firstname || '',
        surname: editData.surname || '',
        email: editData.email || '',
        role: editData.role || 'Staff',
        // Fallback to empty array if data structure varies
        departments: editData.departments || [], 
        position: editData.position || 'Nurse',
        contactNumber: editData.contactNumber || '',
        gender: editData.gender || 'Female'
      });
    } else {
      setFormData(initialFormState);
    }
    setErrors({});
  }, [editData, isOpen]);

  // Grab authorization token safely 
  const token = localStorage.getItem('token'); 

  // --- COMPONENT CLOSURE CLEANUP ---
  const handleClose = () => {
    setErrors({});
    setFormData(initialFormState);
    onClose();
  };

  // --- SUBMIT & ERROR VALIDATION LOGIC ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const validationErrors = {};
    if (!formData.firstname?.trim()) validationErrors.firstname = "First name is required.";
    if (!formData.surname?.trim()) validationErrors.surname = "Surname is required.";
    if (!formData.email?.trim()) validationErrors.email = "Email address is required.";
    if (!formData.departments || formData.departments.length === 0) {
      validationErrors.departments = "Personnel must be assigned to at least one department.";
    }
    if (!formData.position?.trim()) validationErrors.position = "Job position is required.";

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    // Dynamic endpoint & configuration properties depending on the mode
    const url = isEditing 
      ? `${import.meta.env.VITE_API_BASE_URL}/api/admin/updateuser/${editData._id || editData.id}`
      : `${import.meta.env.VITE_API_BASE_URL}/api/admin/addusers`;
      
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} user`;
        try {
          errorMessage = JSON.parse(errorText).detail || errorMessage;
        } catch {
          errorMessage = `Server Error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      // Dynamic Success feedback notifications
      if (isEditing) {
        toast.success(`Account details for ${formData.firstname} updated successfully!`);
      } else {
        toast.success(`${formData.firstname}'s account created! An email with their password has been sent.`);
      }
      
      if (onSuccess) onSuccess();
      handleClose();

    } catch (error) {
      toast.error(error.message); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden font-poppins">
        {/* Modal Header */}
        <div className="bg-gabay-blue px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold">
            {isEditing ? 'Update Personnel Details' : 'Add New Personnel'}
          </h2>
          <button onClick={handleClose} className="hover:text-gray-300 transition">
            <X size={20}/>
          </button>
        </div>
        
        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* First Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">First Name</label>
              <input 
                type="text" 
                className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${errors.firstname ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                value={formData.firstname} 
                onChange={e => { setFormData({...formData, firstname: e.target.value}); setErrors(p => ({...p, firstname: null})); }} 
              />
              {errors.firstname && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.firstname}</p>}
            </div>

            {/* Surname */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Surname</label>
              <input 
                type="text" 
                className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${errors.surname ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                value={formData.surname} 
                onChange={e => { setFormData({...formData, surname: e.target.value}); setErrors(p => ({...p, surname: null})); }} 
              />
              {errors.surname && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.surname}</p>}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
              <input 
                type="email" 
                className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${errors.email ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                value={formData.email} 
                onChange={e => { setFormData({...formData, email: e.target.value}); setErrors(p => ({...p, email: null})); }} 
                disabled={isEditing}
              />
              {errors.email && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.email}</p>}
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Number</label>
              <input 
                type="text" 
                className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-blue" 
                value={formData.contactNumber} 
                onChange={e => setFormData({...formData, contactNumber: e.target.value})} 
              />
            </div>

            {/* System Role */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">System Role</label>
              <select 
                className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-blue" 
                value={formData.role} 
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            
            {/* Department Multi-Select */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Department/s</label>
              <select 
                className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${errors.departments ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                value="" 
                onChange={e => {
                  const selectedVal = e.target.value;
                  setErrors(p => ({...p, departments: null}));
                  if (selectedVal && !formData.departments?.includes(selectedVal)) {
                    const updatedDeps = [...(formData.departments || []), selectedVal];
                    setFormData({...formData, departments: updatedDeps});
                  }
                }}
              >
                <option value="" disabled>+ Add Department</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Dentistry">Dentistry</option>
                <option value="Internal Medicine">Internal Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
              </select>
              {errors.departments && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.departments}</p>}

              {/* Visual Chips for Added Departments */}
              {formData.departments && formData.departments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.departments.map((dep, index) => (
                    <span key={index} className="inline-flex items-center gap-1 bg-blue-50 text-gabay-blue border border-blue-200 px-2.5 py-1 rounded-md text-xs font-medium">
                      {dep}
                      <button 
                        type="button" 
                        className="hover:text-red-500 font-bold ml-1 transition"
                        onClick={() => {
                          const filteredDeps = formData.departments.filter(d => d !== dep);
                          setFormData({...formData, departments: filteredDeps});
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Job Position */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Job Position</label>
              <input 
                type="text" 
                placeholder="e.g. Head Nurse" 
                className={`w-full border p-2 rounded-lg text-sm outline-none focus:border-gabay-blue ${errors.position ? 'border-red-500 bg-red-50/50' : 'border-gray-300'}`} 
                value={formData.position} 
                onChange={e => { setFormData({...formData, position: e.target.value}); setErrors(p => ({...p, position: null})); }} 
              />
              {errors.position && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.position}</p>}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Gender</label>
              <select 
                className="w-full border p-2 border-gray-300 rounded-lg text-sm outline-none focus:border-gabay-blue" 
                value={formData.gender} 
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
            <button 
              type="button" 
              onClick={handleClose} 
              className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-5 py-2 text-sm font-medium text-white bg-gabay-blue hover:bg-opacity-90 rounded-lg transition disabled:opacity-50"
            >
              {isSubmitting 
                ? (isEditing ? 'Saving Changes...' : 'Creating...') 
                : (isEditing ? 'Save Changes' : 'Create Account')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonnelModal;