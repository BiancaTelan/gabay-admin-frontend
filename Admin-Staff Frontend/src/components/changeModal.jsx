import React, { useState } from 'react';
import { X, Lock, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ChangeModal({ isOpen, onClose, type, currentEmail, token, apiBase, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setCurrentPassword('');
    setNewEmail('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (type === 'password' && newPassword !== confirmPassword) {
      return toast.error("New passwords do not match!");
    }
    if (type === 'password' && newPassword.length < 8) {
      return toast.error("New password must be at least 8 characters long.");
    }

    setIsSubmitting(true);

    const endpoint = type === 'email' ? '/change-email' : '/change-password';
    const payload = type === 'email' 
      ? { current_password: currentPassword, new_email: newEmail }
      : { current_password: currentPassword, new_password: newPassword };

    try {
      const response = await fetch(`http://127.0.0.1:8000${apiBase}${endpoint}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || "Verification failed.");

      toast.success(data.message);
      if (type === 'email' && onSuccess) onSuccess(data.new_email);
      resetForm();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden font-poppins">
        
        <div className="bg-gabay-blue px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {type === 'email' ? <Mail size={20}/> : <Lock size={20}/>}
            Change {type === 'email' ? 'Email Address' : 'Password'}
          </h2>
          <button onClick={resetForm} className="hover:text-gray-300 transition"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* SECURITY WARNING */}
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3 text-sm text-blue-800">
            <ShieldCheck size={20} className="text-gabay-blue shrink-0 mt-0.5" />
            <p>For your security, you must verify your identity by entering your current password before making this change.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Current Password</label>
            <input 
              type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none focus:border-gabay-blue focus:ring-1 focus:ring-gabay-blue"
              placeholder="Verify your current password"
            />
          </div>

          {type === 'email' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">New Email Address</label>
              <input 
                type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none focus:border-gabay-blue focus:ring-1 focus:ring-gabay-blue"
                placeholder="Enter new email address"
              />
              <p className="text-[10px] text-gray-400 mt-1">Current email: <span className="font-semibold text-gray-600">{currentEmail}</span></p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">New Password</label>
                <input 
                  type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none focus:border-gabay-blue focus:ring-1 focus:ring-gabay-blue"
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Confirm New Password</label>
                <input 
                  type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm outline-none focus:border-gabay-blue focus:ring-1 focus:ring-gabay-blue"
                  placeholder="Type new password again"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button type="button" onClick={resetForm} className="px-5 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button 
              type="submit" 
              disabled={isSubmitting || !currentPassword} 
              className="px-5 py-2 text-sm font-medium text-white bg-gabay-blue hover:bg-opacity-90 rounded-lg transition disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Confirm & Save'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}