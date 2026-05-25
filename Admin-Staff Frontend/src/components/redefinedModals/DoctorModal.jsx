import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_OPTIONS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'
];

export default function DoctorModal({ isOpen, selectedDoctor, onClose, onRefresh, token, departments }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingPerson, setEditingPerson] = useState({
    firstname: '',
    surname: '',
    role: 'DOCTOR',
    status: 'Active',
    deptIDs: [],
    schedule: 'Unassigned',
    time: '8:00 AM - 5:00 PM'
  });

  const isEditMode = !!selectedDoctor;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        const nameParts = selectedDoctor.name ? selectedDoctor.name.split(' ') : ['', ''];
        setEditingPerson({
          ...selectedDoctor,
          firstname: selectedDoctor.firstname || nameParts[0] || '',
          surname: selectedDoctor.surname || nameParts.slice(1).join(' ') || '',
          role: selectedDoctor.role || 'DOCTOR',
          status: selectedDoctor.status || 'Active',
          deptIDs: selectedDoctor.deptIDs || (selectedDoctor.deptID ? [Number(selectedDoctor.deptID)] : []),
          schedule: selectedDoctor.schedule || 'Unassigned',
          time: selectedDoctor.time || '8:00 AM - 5:00 PM'
        });
      } else {
        setEditingPerson({
          firstname: '',
          surname: '',
          role: 'DOCTOR',
          status: 'Active',
          deptIDs: [],
          schedule: '',
          time: '8:00 AM - 5:00 PM'
        });
      }
    }
  }, [isOpen, selectedDoctor, isEditMode]);

  if (!isOpen) return null;

  // --- FORM SUBMISSION HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    const containsNumbers = /\d/;
    if (containsNumbers.test(editingPerson.firstname) || containsNumbers.test(editingPerson.surname)) {
      toast.error("Validation Failed: Names cannot contain numbers.");
      return;
    }

    if (editingPerson.deptIDs.length === 0) {
      toast.error("Please assign at least one department.");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditMode
        ? `${import.meta.env.VITE_API_BASE_URL}/api/admin/personnel/${editingPerson.id}`
        : `${import.meta.env.VITE_API_BASE_URL}/api/admin/personnel`;

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstname: editingPerson.firstname.trim(),
          surname: editingPerson.surname.trim(),
          role: editingPerson.role,
          status: editingPerson.status,
          deptIDs: editingPerson.deptIDs,
          schedule: editingPerson.schedule || 'Unassigned',
          time: editingPerson.time || 'Unassigned'
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to ${isEditMode ? 'update' : 'create'} record.`);
      }

      toast.success(isEditMode ? "Assignment updated successfully!" : "New doctor added successfully!");
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden font-poppins">
        
        {/* HEADER SECTION (Changes theme color based on Mode dynamically) */}
        <div className={`px-6 py-4 flex justify-between items-center text-white ${isEditMode ? 'bg-gabay-blue' : 'bg-gabay-teal'}`}>
          <h2 className="text-lg font-bold">
            {isEditMode ? 'Edit Personnel Assignment' : 'Add New Doctor'}
          </h2>
          <button type="button" onClick={onClose} className="hover:opacity-70 transition">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* --- CONDITIONAL VIEWS: EDIT VS CREATE & DOCTOR VS STAFF --- */}
          {(!isEditMode || editingPerson.role === 'DOCTOR') ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
                <input 
                  type="text" 
                  required 
                  className={`w-full border p-2 rounded-lg text-sm outline-none bg-white transition-all focus:border-2 ${isEditMode ? 'focus:border-gabay-blue' : 'focus:border-gabay-teal'}`} 
                  value={editingPerson.firstname} 
                  onChange={e => setEditingPerson({...editingPerson, firstname: e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Surname *</label>
                <input 
                  type="text" 
                  required 
                  className={`w-full border p-2 rounded-lg text-sm outline-none bg-white transition-all focus:border-2 ${isEditMode ? 'focus:border-gabay-blue' : 'focus:border-gabay-teal'}`} 
                  value={editingPerson.surname} 
                  onChange={e => setEditingPerson({...editingPerson, surname: e.target.value})} 
                />
              </div>
            </div>
          ) : (
            <>
              {/* STAFF VIEW: Read-Only Header Data Display Box */}
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg flex justify-between items-center mb-2">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Employee</p>
                  <p className="font-bold text-gray-700">{editingPerson.name || `${editingPerson.firstname} ${editingPerson.surname}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Status</p>
                  <p className={`font-bold ${editingPerson.status === 'Active' ? 'text-gabay-green' : 'text-gabay-orange'}`}>
                    {editingPerson.status}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">System Role</label>
                <select 
                  className="w-full border p-2 rounded-lg text-sm outline-none bg-white focus:border-gabay-blue" 
                  value={editingPerson.role} 
                  onChange={e => setEditingPerson({...editingPerson, role: e.target.value})}
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </>
          )}

          {/* MULTI-SELECT DEPARTMENT SELECTION SECTION */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Departments *</label>
            <select 
              className={`w-full border p-2 rounded-lg text-sm outline-none bg-white ${isEditMode ? 'focus:border-gabay-blue' : 'focus:border-gabay-teal'}`}
              value="" 
              onChange={e => {
                const val = Number(e.target.value);
                setEditingPerson(prev => ({
                  ...prev,
                  deptIDs: prev.deptIDs?.includes(val) ? prev.deptIDs : [...(prev.deptIDs || []), val]
                }));
              }}
            >
              <option value="" disabled>+ Add Department</option>
              {departments.map(dept => {
                const targetID = dept.deptID || dept.id;
                const targetName = dept.department || dept.name;
                const targetType = dept.type || (dept.isSpecialty ? 'Specialty' : 'General');
                return (
                  <option key={targetID} value={targetID}>
                    {targetName} ({targetType})
                  </option>
                );
              })}
            </select>

            {/* Selected Departments Interactive Pill Tags */}
            <div className="flex flex-wrap gap-2 mt-2">
              {editingPerson.deptIDs?.map(id => {
                const dept = departments.find(d => (d.deptID === id || d.id === id));
                const displayLabel = dept ? (dept.department || dept.name) : `Dept #${id}`;
                return (
                  <div key={id} className="flex items-center gap-1 bg-teal-50 text-gabay-teal px-3 py-1 rounded-md text-xs font-medium border border-teal-100">
                    {displayLabel}
                    <button 
                      type="button"
                      onClick={() => setEditingPerson(prev => ({ ...prev, deptIDs: prev.deptIDs.filter(d => d !== id) }))} 
                      className="hover:text-red-500 ml-1 transition-colors"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* WORKING DAYS WEEK PICKER */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => {
                const currentDays = editingPerson.schedule && editingPerson.schedule !== 'Unassigned' 
                  ? editingPerson.schedule.split(',').map(d => d.trim()) 
                  : [];
                
                const isSelected = currentDays.includes(day);

                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => {
                      let newDays = [...currentDays];
                      if (isSelected) newDays = newDays.filter(d => d !== day);
                      else newDays.push(day);
                      
                      newDays.sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
                      setEditingPerson({...editingPerson, schedule: newDays.join(', ') || 'Unassigned'});
                    }}
                    className={`w-10 h-10 rounded-full text-xs font-bold transition-all duration-200 shadow-sm ${
                      isSelected 
                        ? `${isEditMode ? 'bg-gabay-blue ring-gabay-blue' : 'bg-gabay-teal ring-gabay-teal'} text-white ring-2 ring-offset-1` 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* WORKING HOURS TIME RANGE PICKER */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Working Hours</label>
            <div className="flex items-center gap-3">
              <select 
                className={`flex-1 border p-2.5 rounded-lg text-sm outline-none bg-white ${isEditMode ? 'focus:border-gabay-blue' : 'focus:border-gabay-teal'}`}
                value={editingPerson.time && editingPerson.time !== 'Unassigned' ? editingPerson.time.split(' - ')[0] : ''}
                onChange={(e) => {
                  const currentEnd = editingPerson.time && editingPerson.time !== 'Unassigned' ? editingPerson.time.split(' - ')[1] : '5:00 PM';
                  setEditingPerson({...editingPerson, time: `${e.target.value} - ${currentEnd}`});
                }}
              >
                <option value="" disabled>Start Time</option>
                {TIME_OPTIONS.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
              </select>

              <span className="text-gray-400 font-bold px-1">to</span>
              
              <select 
                className={`flex-1 border p-2.5 rounded-lg text-sm outline-none bg-white ${isEditMode ? 'focus:border-gabay-blue' : 'focus:border-gabay-teal'}`}
                value={editingPerson.time && editingPerson.time !== 'Unassigned' ? editingPerson.time.split(' - ')[1] : ''}
                onChange={(e) => {
                  const currentStart = editingPerson.time && editingPerson.time !== 'Unassigned' ? editingPerson.time.split(' - ')[0] : '8:00 AM';
                  setEditingPerson({...editingPerson, time: `${currentStart} - ${e.target.value}`});
                }}
              >
                <option value="" disabled>End Time</option>
                {TIME_OPTIONS.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* BUTTON GROUP */}
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 ${isEditMode ? 'bg-gabay-blue hover:bg-opacity-90' : 'bg-gabay-teal hover:bg-opacity-90'}`}
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Save Assignment' : 'Add Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}