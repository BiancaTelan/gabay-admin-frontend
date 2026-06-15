import React, { useState, useEffect, useContext } from 'react';
import { 
  Clock, Database, History, AlertTriangle, Save, Edit2, 
  X, HardHat, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../authContext'; 

// --- ADMIN SETTINGS PAGE ---
export default function AdminSettings() {
  const { token } = useContext(AuthContext);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = React.useRef(null);

  const [settings, setSettings] = useState({
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    autoBackup: false,
    backupFrequency: "Weekly",
    backupTime: "12:00 AM",
    retentionValue: "3",
    retentionUnit: "years",
    maintenanceMode: false,
    downtimeReason: "Maintenance Mode",
    resumeTimer: "60",
  });

  const [tempSettings, setTempSettings] = useState({ ...settings });
  const [errors, setErrors] = useState({});

  // --- FETCH SETTINGS ON LOAD ---
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${apiBase}/api/admin/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Failed to load settings.");
        const data = await response.json();
        
        // Ensure defaults if any specific field comes back null/undefined from DB
        const unifiedData = {
          startTime: data.startTime || "09:00 AM",
          endTime: data.endTime || "05:00 PM",
          autoBackup: !!data.autoBackup,
          backupFrequency: data.backupFrequency || "Weekly",
          backupTime: data.backupTime || "12:00 AM",
          retentionValue: String(data.retentionValue || "3"),
          retentionUnit: data.retentionUnit || "years",
          maintenanceMode: !!data.maintenanceMode,
          downtimeReason: data.downtimeReason || "Maintenance Mode",
          resumeTimer: String(data.resumeTimer || "60")
        };

        setSettings(unifiedData);
        setTempSettings(unifiedData);
      } catch (error) {
        console.error(error);
        toast.error("Error reading system configuration.");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) fetchSettings();
  }, [apiBase, token]);

  const [startVal, startPeriod] = (tempSettings.startTime || "09:00 AM").split(' ');
  const [endVal, endPeriod] = (tempSettings.endTime || "05:00 PM").split(' ');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTempSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Handles dropdown switches for isolated structure units (Time changes)
  const handleTimeSubChange = (field, part, val) => {
    setTempSettings(prev => {
      const current = prev[field] || (field === 'startTime' ? "09:00 AM" : "05:00 PM");
      const [oldTime, oldPeriod] = current.split(' ');
      const newTimeStr = part === 'val' ? `${val} ${oldPeriod}` : `${oldTime} ${val}`;
      return { ...prev, [field]: newTimeStr };
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (tempSettings.maintenanceMode && !tempSettings.downtimeReason?.trim()) {
      newErrors.downtimeReason = "Reason statement is required during active maintenance.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    const loadingToast = toast.loading("Updating configurations...");
    try {
      const response = await fetch(`${apiBase}/api/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...tempSettings,
          retentionValue: parseInt(tempSettings.retentionValue, 10) || 3,
          resumeTimer: parseInt(tempSettings.resumeTimer, 10) || 60
        })
      });

      if (!response.ok) throw new Error("Could not update context target endpoint.");
      
      setSettings({ ...tempSettings });
      setIsEditMode(false);
      toast.success("System configurations deployed!", { id: loadingToast });
    } catch (error) {
      toast.error("Failed to commit settings updates.", { id: loadingToast });
    }
  };

  const handleBackupNow = async () => {
    const procToast = toast.loading("Building full structural DB dump...");
    try {
      const response = await fetch(`${apiBase}/api/admin/backup/now`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error();
      toast.success("Database image built and committed successfully!", { id: procToast });
    } catch {
      toast.error("Backup processing loop structural failure.", { id: procToast });
    }
  };

  const handleTriggerRestoreFile = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmAction = window.confirm("CRITICAL WARNING: Restoring database records will overwrite current operation datasets. Do you wish to proceed?");
    if (!confirmAction) { e.target.value = ''; return; }

    setIsRestoring(true);
    const procToast = toast.loading("Parsing structure configuration payloads...");

    const formData = new FormData();
    formData.append("backup_file", file);

    try {
      const response = await fetch(`${apiBase}/api/admin/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "System migration transaction dropped.");
      }

      toast.success("Data mapping tables re-indexed successfully!", { id: procToast });
      window.location.reload();
    } catch (err) {
      toast.error(err.message, { id: procToast });
    } finally {
      setIsRestoring(false);
      e.target.value = ''; 
    }
  };

  // --- LOADER RENDER OVERLAY (Handles asynchronous lifecycle without crashing strings) ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gabay-blue">
        <Loader2 className="animate-spin text-gabay-teal" size={40} />
        <p className="font-poppins text-sm font-medium tracking-wide animate-pulse">Pulling application state maps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue tracking-tight">System Control Matrix</h1>
          <p className="text-xs md:text-sm font-poppins text-gray-500 mt-1">Configure parameters, operational shifts, data durability schedules, and emergency statuses.</p>
        </div>
        
        {!isEditMode ? (
          <button 
            onClick={() => setIsEditMode(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-gabay-blue text-white rounded-xl font-poppins font-semibold text-xs tracking-wider uppercase hover:bg-opacity-90 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Edit2 size={14}/> Modify Settings
          </button>
        ) : (
          <div className="flex w-full sm:w-auto gap-3">
            <button 
              onClick={() => { setIsEditMode(false); setTempSettings({ ...settings }); setErrors({}); }}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-poppins font-semibold text-xs tracking-wider uppercase hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gabay-teal text-white rounded-xl font-poppins font-semibold text-xs tracking-wider uppercase hover:bg-opacity-90 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Save size={14}/> Commit Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* OPERATIONAL PARAMETERS MODULE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-montserrat text-base font-bold text-gabay-blue flex items-center gap-2">
            <Clock size={18} className="text-gabay-teal" /> Window Boundary Metrics
          </h3>
          <p className="text-xs text-gray-400 font-poppins">Controls runtime limits for public booking assistants and structural slot allocation interfaces.</p>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 pl-1">Daily Lock Opening</label>
              <div className="flex gap-2">
                <select 
                  disabled={!isEditMode}
                  value={startVal}
                  onChange={(e) => handleTimeSubChange('startTime', 'val', e.target.value)}
                  className="flex-1 p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-poppins outline-none focus:border-gabay-teal disabled:opacity-60"
                >
                  {["06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select 
                  disabled={!isEditMode}
                  value={startPeriod}
                  onChange={(e) => handleTimeSubChange('startTime', 'period', e.target.value)}
                  className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-poppins outline-none focus:border-gabay-teal disabled:opacity-60"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 pl-1">Daily Queue Termination</label>
              <div className="flex gap-2">
                <select 
                  disabled={!isEditMode}
                  value={endVal}
                  onChange={(e) => handleTimeSubChange('endTime', 'val', e.target.value)}
                  className="flex-1 p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-poppins outline-none focus:border-gabay-teal disabled:opacity-60"
                >
                  {["03:00", "03:30", "04:00", "04:30", "05:00", "05:30", "06:00", "06:30", "07:00", "07:30", "08:00"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select 
                  disabled={!isEditMode}
                  value={endPeriod}
                  onChange={(e) => handleTimeSubChange('endTime', 'period', e.target.value)}
                  className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-poppins outline-none focus:border-gabay-teal disabled:opacity-60"
                >
                  <option value="PM">PM</option>
                  <option value="AM">AM</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* DATA DURABILITY INFRASTRUCTURE */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-montserrat text-base font-bold text-gabay-blue flex items-center gap-2">
            <Database size={18} className="text-gabay-teal" /> Durability & Archival Loop
          </h3>
          <p className="text-xs text-gray-400 font-poppins">Automate schema drops and snapshot uploads into decoupled persistence buckets.</p>
          
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100/70 transition-all select-none">
              <input 
                type="checkbox"
                name="autoBackup"
                disabled={!isEditMode}
                checked={tempSettings.autoBackup}
                onChange={handleInputChange}
                className="w-4 h-4 text-gabay-teal border-gray-300 rounded focus:ring-gabay-teal focus:ring-opacity-25 disabled:opacity-50"
              />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-gabay-blue font-poppins">Automated Snapshots</p>
                <p className="text-[10px] text-gray-400">Trigger standard structural pipeline passes automatically.</p>
              </div>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 pl-1">Frequency</label>
                <select 
                  name="backupFrequency"
                  disabled={!isEditMode || !tempSettings.autoBackup}
                  value={tempSettings.backupFrequency}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-poppins outline-none disabled:opacity-50"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 pl-1">Archival Window</label>
                <select 
                  name="retentionValue"
                  disabled={!isEditMode}
                  value={tempSettings.retentionValue}
                  onChange={handleInputChange}
                  className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-poppins outline-none disabled:opacity-50"
                >
                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} Years</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* MANUAL DUMP & ROLLBACK HANDLERS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-montserrat text-base font-bold text-gabay-blue flex items-center gap-2">
              <History size={18} className="text-gabay-teal" /> Recovery Orchestrator
            </h3>
            <p className="text-xs text-gray-400 font-poppins">Force manual state-map uploads or apply standard rollback operations to reverse cluster anomalies.</p>
          </div>
          
          <div className="space-y-2.5 pt-4">
            <button 
              onClick={handleBackupNow}
              className="w-full py-2.5 bg-white border border-gabay-blue text-gabay-blue hover:bg-gabay-blue/5 transition-all text-xs font-semibold font-poppins tracking-wider uppercase rounded-xl"
            >
              Trigger Snapshot Instantly
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleRestoreFileSelected} 
              accept=".sql,.json" 
              className="hidden" 
            />
            
            <button 
              onClick={handleTriggerTriggerRestoreFile}
              disabled={isRestoring}
              className="w-full py-2.5 bg-gray-900 text-white hover:bg-black transition-all text-xs font-semibold font-poppins tracking-wider uppercase rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRestoring ? "Re-Indexing Maps..." : "Apply Structural Overwrite"}
            </button>
          </div>
        </div>

      </div>

      {/* EMERGENCY SERVICE BREAK MATRIX */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-50 text-red-500 rounded-xl border border-red-100">
            <HardHat size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-montserrat text-lg font-bold text-gabay-blue">Emergency Break Toggles</h3>
            <p className="text-xs text-gray-400 font-poppins">Isolate patient routing components and pause traffic ingestion when handling infrastructural shifts or local hospital data disruptions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 items-start">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-gabay-blue font-poppins uppercase tracking-wide">Maintenance Isolation</p>
                <p className="text-[10px] text-gray-400">Halts active request parsers.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input 
                  type="checkbox"
                  name="maintenanceMode"
                  disabled={!isEditMode}
                  checked={tempSettings.maintenanceMode}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 disabled:opacity-40"></div>
              </label>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block text-left pl-1">Auto-Resume In</label>
              <select 
                name="resumeTimer"
                disabled={!isEditMode}
                value={tempSettings.resumeTimer}
                onChange={handleInputChange}
                className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-poppins outline-none disabled:opacity-60 focus:border-red-400"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="0">Never (Manual)</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block pl-1">Public Display Warnings Statement</label>
            <textarea 
              name="downtimeReason"
              disabled={!isEditMode || !tempSettings.maintenanceMode}
              value={tempSettings.downtimeReason}
              onChange={handleInputChange}
              rows={4}
              placeholder="Provide a clear downtime explanation statement to present to users routing to the portal assets..."
              className={`w-full p-3 bg-gray-50 border rounded-xl text-sm font-poppins outline-none resize-none transition-all disabled:opacity-40 ${
                errors.downtimeReason ? 'border-red-400 focus:ring-red-100' : 'border-gray-100 focus:border-red-400'
              }`}
            />
            {errors.downtimeReason && (
              <p className="text-xs text-red-500 font-medium pl-1 flex items-center gap-1">
                <AlertTriangle size={12}/> {errors.downtimeReason}
              </p>
            )}
          </div>
        </div>

        {tempSettings.maintenanceMode && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 animate-pulse">
            <AlertTriangle size={16} className="text-red-500" />
            <p className="text-[11px] font-bold text-red-600 uppercase tracking-wide">
              Warning: Patient application gateways are isolated. Live booking pipelines are rejected while this switch is active.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}