import React from 'react';
import { X, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function UserStatusModal({ isOpen, onClose, onConfirm, user, actionType, isSubmitting }) {
  if (!isOpen || !user) return null;

  const isDeactivating = actionType === 'deactivate';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden border border-gray-100 transform transition-all scale-100 font-poppins text-center">
        
        {/* HEADER & DYNAMIC ICON CONTAINER */}
        <div className="p-6 pt-8">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-200 ${
            isDeactivating ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'
          }`}>
            {isDeactivating ? (
              <AlertTriangle size={32} />
            ) : (
              <ShieldCheck size={32} />
            )}
          </div>
          
          {/* DYNAMIC TITLE */}
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {isDeactivating ? 'Deactivate Account?' : 'Reactivate Account?'}
          </h3>
          
          {/* DYNAMIC DESCRIPTION TEXT */}
          <p className="text-sm text-gray-500 px-4 leading-relaxed">
            Are you sure you want to {isDeactivating ? 'deactivate' : 'reactivate'} the profile account for{' '}
            <strong className="text-gray-800">{user.name}</strong>?
          </p>
          
          <p className="text-xs text-gray-400 px-4 mt-3">
            {isDeactivating 
              ? 'This temporarily restricts this personnel from logging into the platform until manually reactivated.' 
              : 'This instantly restores this profile\'s database clearance capabilities and workspace access.'}
          </p>
        </div>

        {/* CONTROLS FOOTER BARS */}
        <div className="flex justify-center gap-3 p-6 pt-3 bg-gray-50 border-t mt-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm transition disabled:opacity-50 ${
              isDeactivating 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isSubmitting ? (
              <span>{isDeactivating ? 'Deactivating...' : 'Reactivating...'}</span>
            ) : (
              <span>Yes, {isDeactivating ? 'Deactivate' : 'Reactivate'}</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}