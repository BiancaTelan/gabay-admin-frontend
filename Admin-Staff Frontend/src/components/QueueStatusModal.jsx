import Button from '../components/button';
import { X } from 'lucide-react';

export default function QueueStatusModal({ isOpen, onClose, patient, onUpdate }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-in zoom-in duration-200">
        <div className="relative mb-4">
          <h3 className="font-montserrat text-2xl font-bold text-gabay-blue text-center">Update Status</h3>
          <button onClick={onClose} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="mb-6 bg-gray-50 border border-gray-100 rounded-lg p-4">
          <p className="font-poppins text-center text-gabay-navy mb-1">
            <span className="font-bold text-md uppercase tracking-wider text-gray-400 text-xs">Patient Name</span><br/> 
            <span className="font-semibold text-lg">{patient.name}</span>
          </p>
          <p className="font-poppins text-center text-gabay-navy">
            <span className="font-bold text-md uppercase tracking-wider text-gray-400 text-xs">Hospital Number</span><br/>
            <span className="font-medium">{patient.hospitalNumber}</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Button
            variant="teal"
            onClick={() => onUpdate(patient, 'served')}
            className="w-full sm:w-auto"
          >
            SERVED
          </Button>
          <Button
            variant="teal-outline"
            onClick={() => onUpdate(patient, 'serving')}
            className="w-full sm:w-auto"
          >
            CURRENTLY SERVING
          </Button>
        </div>
      </div>
    </div>
  );
}