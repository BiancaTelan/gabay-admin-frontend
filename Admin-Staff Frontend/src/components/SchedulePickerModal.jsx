import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './button'; 

export default function SchedulePickerModal({ isOpen, onClose, doctor, onSave, editingSchedule }) {
  const daysOfWeek = [
    { label: 'M', full: 'Monday' },
    { label: 'T', full: 'Tuesday' },
    { label: 'W', full: 'Wednesday' },
    { label: 'TH', full: 'Thursday' },
    { label: 'F', full: 'Friday' }
  ];

  const [selectedDays, setSelectedDays] = useState([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("14:00");

  useEffect(() => {
    if (isOpen) {
      if (editingSchedule) {
        const reverseMap = { 'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'TH', 'Friday': 'F' };
        setSelectedDays([reverseMap[editingSchedule.day] || editingSchedule.day]);

        try {
          const [startStr, endStr] = editingSchedule.time.split(" - ");
          
          const convertTo24Hour = (time12h) => {
            const [time, modifier] = time12h.split(' ');
            let [hours, minutes] = time.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
            return `${hours.toString().padStart(2, '0')}:${minutes}`;
          };
          
          setStartTime(convertTo24Hour(startStr));
          setEndTime(convertTo24Hour(endStr));
        } catch (e) { console.error("Time parse error", e); }
        
      } else {
        setSelectedDays([]);
        setStartTime("08:00");
        setEndTime("14:00");
      }
    }
  }, [isOpen, editingSchedule]);

  if (!isOpen || !doctor) return null;

  const toggleDay = (day) => {
    if (editingSchedule) {
      setSelectedDays([day]); 
    } else {
      setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    }
  };

  const handleConfirm = () => {
    if (selectedDays.length === 0) return alert("Please select a duty day.");

    const formatTime = (time) => {
      let [h, m] = time.split(':');
      let ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h.toString().padStart(2, '0')}:${m} ${ampm}`;
    };

    const newSchedule = selectedDays.join(', ');
    const newPeriod = `${formatTime(startTime)} – ${formatTime(endTime)}`;
    
    onSave(doctor.id, newSchedule, newPeriod, editingSchedule?.id); 
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 font-poppins text-left">

        <div className="p-5 flex items-center border-b border-gray-50">
          <div className="w-10"></div>
          <h3 className="flex-1 text-center font-montserrat font-bold uppercase tracking-wide text-sm text-gabay-blue">
            {editingSchedule ? "Edit Schedule Block" : "Add New Schedule Block"}
          </h3>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center text-gabay-blue hover:bg-gabay-blue/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Day Picker */}
          <div>
            <label className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">
              Select Duty Days
            </label>
            <div className="flex justify-between">
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

          {/* Time Picker */}
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

          <div className="pt-2">
            <Button variant="teal" type="button" onClick={handleConfirm} className="w-full py-3 shadow-lg shadow-teal-100">
              SAVE NEW SCHEDULE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};