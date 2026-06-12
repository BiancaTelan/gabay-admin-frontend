import React, { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Plus } from 'lucide-react';
import Button from './button'; 
import toast from 'react-hot-toast'; 

export default function SchedulePickerModal({ isOpen, onClose, doctor, onSave, onDelete }) {
  const daysOfWeek = [
    { label: 'M', full: 'Monday' }, { label: 'T', full: 'Tuesday' },
    { label: 'W', full: 'Wednesday' }, { label: 'TH', full: 'Thursday' },
    { label: 'F', full: 'Friday' }, { label: 'S', full: 'Saturday' }, 
    { label: 'SU', full: 'Sunday' }
  ];

  const [view, setView] = useState('list'); // 'list' or 'form'
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [maxPatients, setMaxPatients] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (doctor?.schedules?.length > 0) {
        setView('list');
      } else {
        handleAddNew();
      }
    }
  }, [isOpen, doctor]);

  const handleAddNew = () => {
    setEditingSchedule(null);
    setSelectedDays([]);
    setStartTime("08:00");
    setEndTime("17:00");
    setMaxPatients(20);
    setView('form');
  };

  const handleEdit = (sched) => {
    setEditingSchedule(sched);
    const reverseMap = { 'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'TH', 'Friday': 'F', 'Saturday': 'S', 'Sunday': 'SU' };
    setSelectedDays([reverseMap[sched.day] || sched.day]);
    setMaxPatients(sched.maxPatients || 20);

    try {
      const [startStr, endStr] = sched.time.split(" - ");
      const convertTo24Hour = (time12h) => {
        if (!time12h) return "08:00";
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      };
      
      setStartTime(convertTo24Hour(startStr));
      setEndTime(convertTo24Hour(endStr));
    } catch (e) { 
      setStartTime("08:00");
      setEndTime("17:00");
    }
    setView('form');
  };

  const toggleDay = (day) => {
    if (editingSchedule) {
      setSelectedDays([day]);
    } else {
      setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    }
  };

  const handleConfirm = async () => {
    if (selectedDays.length === 0) return toast.error("Please select at least one duty day.");
    if (startTime >= endTime) return toast.error("End Time must be later than Start Time.");
    if (maxPatients < 1) return toast.error("Patient capacity must be at least 1.");

    setIsSubmitting(true);
    const formatTime = (time) => {
      let [h, m] = time.split(':');
      let ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
    };

    const newSchedule = selectedDays.join(', ');
    const newPeriod = `${formatTime(startTime)} - ${formatTime(endTime)}`;
    const success = await onSave(doctor.id, newSchedule, newPeriod, maxPatients, editingSchedule?.id); 
    
    setIsSubmitting(false);
    if (success) {
        setView('list');
        toast.success(editingSchedule ? "Schedule updated!" : "Schedule added!");
    }
  };
  
  if (!isOpen || !doctor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 font-poppins text-left">
        
        {/* MODAL HEADER */}
        <div className="p-5 flex items-center border-b border-gray-100 bg-gray-50/50">
          {view === 'form' && doctor?.schedules?.length > 0 ? (
              <button onClick={() => setView('list')} className="w-12 h-8 flex items-center justify-start text-gray-500 hover:text-gabay-blue transition-colors text-xs font-bold">&lt; BACK</button>
          ) : (
              <div className="w-12"></div>
          )}
          <h3 className="flex-1 text-center font-montserrat font-bold uppercase tracking-wide text-sm text-gabay-blue">
            {view === 'list' ? `Manage Schedule: Dr. ${doctor.name.replace('Dr. ', '')}` : (editingSchedule ? "Edit Schedule Block" : "Add New Schedule Block")}
          </h3>
          <button onClick={onClose} className="w-12 h-8 flex items-center justify-end text-gray-400 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
           {view === 'list' ? (
              // === LIST VIEW ===
              <div className="space-y-4">
                {doctor.schedules?.length > 0 ? (
                  <div className="max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar pr-2">
                     {doctor.schedules.map(sched => (
                       <div key={sched.id} className="border border-gray-200 rounded-xl p-4 hover:border-gabay-teal transition-colors bg-white shadow-sm flex justify-between items-center">
                          <div>
                             <p className="font-bold text-gabay-navy text-sm">{sched.day}</p>
                             <p className="text-gray-500 text-xs mt-0.5">{sched.time}</p>
                             <p className="text-gabay-teal font-medium text-[11px] mt-1 uppercase tracking-wider">{sched.maxPatients} Slots Capacity</p>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => handleEdit(sched)} className="p-2 text-gabay-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 size={16}/></button>
                             <button onClick={() => onDelete(sched.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={16}/></button>
                          </div>
                       </div>
                     ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm py-8 italic">No schedules defined yet.</p>
                )}
                <Button variant="teal" onClick={handleAddNew} className="w-full flex justify-center items-center gap-2 mt-4"><Plus size={18} /> Add New Block</Button>
              </div>
           ) : (
              // === FORM VIEW ===
              <div className="space-y-6">
                <div>
                  <label className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">
                    Select Duty Days
                  </label>
                  <div className="flex justify-center gap-1.5 flex-wrap">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day.label}
                        onClick={() => toggleDay(day.label)}
                        className={`w-10 h-10 rounded-full font-bold text-xs transition-all border-2 ${
                          selectedDays.includes(day.label) 
                          ? "bg-gabay-teal border-gabay-teal text-white scale-110 shadow-md" 
                          : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Start Time</label>
                    <input 
                      type="time" 
                      value={startTime} 
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gabay-navy outline-none focus:ring-2 focus:ring-gabay-teal/20"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">End Time</label>
                    <input 
                      type="time" 
                      value={endTime} 
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gabay-navy outline-none focus:ring-2 focus:ring-gabay-teal/20"
                    />
                  </div>
                </div>

                {/* Max Patients Capacity Input */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Patient Capacity (Slots)</label>
                  <input 
                    type="number" 
                    min="1"
                    value={maxPatients} 
                    onChange={(e) => setMaxPatients(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gabay-navy outline-none focus:ring-2 focus:ring-gabay-teal/20"
                  />
                </div>

                <div className="pt-4">
                  <Button variant="teal" type="button" disabled={isSubmitting} onClick={handleConfirm} className="w-full py-3 shadow-lg shadow-teal-100">
                    {isSubmitting ? "SAVING..." : (editingSchedule ? "SAVE CHANGES" : "SAVE NEW SCHEDULE")}
                  </Button>
                </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};