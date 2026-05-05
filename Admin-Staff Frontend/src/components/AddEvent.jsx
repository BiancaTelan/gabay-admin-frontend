import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar as CalendarIcon } from 'lucide-react';
import ReactDOM from 'react-dom';

export default function AddEvent({ isOpen, onClose, onSave, initialDate = null, defaultType = 'EVENT' }) {
  const modalRef = useRef();
  const nativePickerRef = useRef(null);

  const initialState = {
    title: '',
    description: '',
    date: '', 
    type: 'EVENT'
  };

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      let formattedDate = '';
      if (initialDate) {
        const [y, m, d] = initialDate.split('-');
        formattedDate = `${m}/${d}/${y}`;
      } else {
        const today = new Date();
        formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
      }

      setFormData({
        ...initialState,
        date: formattedDate,
        type: defaultType
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, initialDate, defaultType]);

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'date') {
      const digits = value.replace(/\D/g, '').substring(0, 8);
      if (digits.length > 4) {
        finalValue = `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4)}`;
      } else if (digits.length > 2) {
        finalValue = `${digits.substring(0, 2)}/${digits.substring(2)}`;
      } else {
        finalValue = digits;
      }
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    let newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    
    const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (!formData.date) {
      newErrors.date = "Date is required";
    } else if (!dateRegex.test(formData.date)) {
      newErrors.date = "Format must be MM/DD/YYYY";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsSubmitting(true);
    
    try {
      if (onSave) {
        await onSave(formData);
      }
      setIsSubmitting(false);
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const themeColor = formData.type === 'EVENT' ? 'bg-gabay-teal' : 'bg-red-500';
  const themeText = formData.type === 'EVENT' ? 'text-gabay-teal' : 'text-gabay-red';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4" onClick={handleOverlayClick}>
      <div ref={modalRef} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-poppins text-left">
        <div className={`h-2 ${themeColor} transition-colors duration-300`}></div>

        <div className="p-6 md:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className={`text-2xl font-bold font-montserrat ${themeText} transition-colors uppercase`}>
                Add New {formData.type === 'EVENT' ? 'Event' : 'Holiday'}
              </h2>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-widest">Calendar Management</p>
            </div>
            <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                type="button"
                onClick={() => setFormData(prev => ({...prev, type: 'EVENT'}))}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${formData.type === 'EVENT' ? 'bg-white text-gabay-teal shadow-sm' : 'text-gray-400'}`}
              >EVENT</button>
              <button 
                type="button"
                onClick={() => setFormData(prev => ({...prev, type: 'HOLIDAY'}))}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${formData.type === 'HOLIDAY' ? 'bg-white text-gabay-red shadow-sm' : 'text-gray-400'}`}
              >HOLIDAY</button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gabay-blue flex items-center gap-2 uppercase tracking-wide"> Title </label>
              <input 
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder={formData.type === 'EVENT' ? 'e.g. Medical Mission' : 'e.g. Independence Day'}
                className={`w-full border-2 rounded-lg px-4 py-2.5 text-sm outline-none transition-all ${errors.title ? 'border-gabay-red' : 'border-gray-100 focus:border-gabay-blue'}`}
              />
              {errors.title && <p className="text-[10px] text-gabay-red font-bold">{errors.title}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gabay-blue flex items-center gap-2 uppercase tracking-wide"> Date </label>
              <div className="relative">
                <input 
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  placeholder="MM/DD/YYYY"
                  maxLength="10"
                  className={`w-full border-2 rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none transition-all ${errors.date ? 'border-gabay-red' : 'border-gray-100 focus:border-gabay-blue'}`}
                />
                <button 
                  type="button"
                  onClick={() => nativePickerRef.current.showPicker()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gabay-blue transition-colors"
                >
                  <CalendarIcon size={18} />
                </button>
                <input 
                  ref={nativePickerRef}
                  type="date"
                  className="absolute inset-0 opacity-0 pointer-events-none"
                  onChange={(e) => {
                    if (!e.target.value) {
                      setFormData(prev => ({...prev, date: ''}));
                      return;
                    }
                    const [y, m, d] = e.target.value.split('-');
                    setFormData(prev => ({...prev, date: `${m}/${d}/${y}`}));
                  }}
                />
              </div>
              {errors.date && <p className="text-[10px] text-gabay-red font-bold">{errors.date}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gabay-blue flex items-center gap-2 uppercase tracking-wide"> Description (Optional) </label>
              <textarea 
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                placeholder="Details about the day..."
                className="w-full border-2 border-gray-100 rounded-lg px-4 py-2 text-sm outline-none focus:border-gabay-blue transition-all resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-2 border-2 border-gray-100 text-gray-400 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-all uppercase">Cancel</button>
              <button type="submit" disabled={isSubmitting} className={`flex-[2] py-2 ${themeColor} text-white text-sm font-semibold rounded-lg shadow-lg hover:opacity-90 transition-all uppercase tracking-wider flex items-center justify-center`}>
                {isSubmitting ? (
                   <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                   `Save ${formData.type === 'EVENT' ? 'Event' : 'Holiday'}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}