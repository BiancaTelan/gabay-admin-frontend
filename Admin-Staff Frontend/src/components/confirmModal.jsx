import React from 'react';
import { createPortal } from 'react-dom'; // <-- We import the Portal here
import { AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

export default function ConfirmationModal({ isOpen, onClose, type = 'info', title, message, onConfirm }) {
  if (!isOpen) return null;

  const config = {
    warning: { icon: <AlertTriangle size={24} className="text-amber-500" />, bg: 'bg-amber-50', button: 'bg-amber-500 hover:bg-amber-600' },
    danger: { icon: <AlertTriangle size={24} className="text-red-500" />, bg: 'bg-red-50', button: 'bg-red-500 hover:bg-red-600' },
    success: { icon: <CheckCircle size={24} className="text-green-500" />, bg: 'bg-green-50', button: 'bg-green-500 hover:bg-green-600' },
    info: { icon: <Info size={24} className="text-gabay-blue" />, bg: 'bg-blue-50', button: 'bg-gabay-blue hover:bg-opacity-90' }
  };

  const currentConfig = config[type] || config.info;

  // The Modal UI
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden font-poppins relative animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>

        <div className="p-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${currentConfig.bg}`}>
            {currentConfig.icon}
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-sm text-gray-500 mb-8">{message}</p>

          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                if (onConfirm) onConfirm();
                onClose();
              }} 
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition shadow-sm ${currentConfig.button}`}
            >
              Confirm
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}