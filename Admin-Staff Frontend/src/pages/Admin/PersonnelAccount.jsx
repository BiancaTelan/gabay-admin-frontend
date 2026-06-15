import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, CheckCircle, Camera, X, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast'; 
import Input from '../../components/input';
import ConfirmationModal from '../../components/confirmModal';
import ChangeModal from '../../components/changeModal';
import { phonePattern } from '../../utils/constants'; 
import { AuthContext } from '../../authContext';

// ==========================================
// STATIC DATA & WRAPPER COMPONENTS
// ==========================================

const postalCodeMap = {
  "1900": { city: "Cainta", province: "Rizal" },
  "1920": { city: "Taytay", province: "Rizal" },
  "1800": { city: "Marikina", province: "METRO MANILA" }, 
  "1600": { city: "Pasig", province: "METRO MANILA" },
  "1100": { city: "Quezon City", province: "METRO MANILA" },
  "1000": { city: "Manila", province: "METRO MANILA" }
};

const ErrorWrapper = ({ label, name, error, children }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {error && <span className="text-[10px] text-red-500 font-bold">{error}</span>}
    </div>
    {children}
  </div>
);

function AddressDropdowns({ tempUserInfo, setTempUserInfo, isEditing }) {
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const provRes = await fetch('https://psgc.gitlab.io/api/provinces/');
        const provData = await provRes.json();
        const ncr = { code: '130000000', name: 'METRO MANILA', isRegion: true };
        setProvinces([...provData, ncr].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Failed to load PSGC provinces", error);
      }
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      if (!tempUserInfo.province) return;
      const selectedProv = provinces.find(p => p.name === tempUserInfo.province);
      
      if (selectedProv) {
        try {
          const url = selectedProv.isRegion 
            ? `https://psgc.gitlab.io/api/regions/${selectedProv.code}/cities-municipalities/`
            : `https://psgc.gitlab.io/api/provinces/${selectedProv.code}/cities-municipalities/`;
          const res = await fetch(url);
          const data = await res.json();
          setCities(data.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
          console.error("Failed to load PSGC cities", error);
        }
      }
    };
    if (provinces.length > 0) fetchCities();
  }, [tempUserInfo.province, provinces]);

  useEffect(() => {
    const fetchBarangays = async () => {
      if (!tempUserInfo.city) return;
      const selectedCity = cities.find(c => c.name === tempUserInfo.city);
      
      if (selectedCity) {
        try {
          const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedCity.code}/barangays/`);
          const data = await res.json();
          setBarangays(data.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (error) {
          console.error("Failed to load PSGC barangays", error);
        }
      }
    };
    if (cities.length > 0) fetchBarangays();
  }, [tempUserInfo.city, cities]);

  return (
    <>
      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Province</label>
        <select 
          disabled={!isEditing} 
          value={tempUserInfo.province} 
          onChange={(e) => setTempUserInfo(prev => ({ ...prev, province: e.target.value, city: '', barangay: '' }))} 
          className="w-full border p-2.5 rounded-xl text-sm outline-none bg-gray-50 focus:ring-2 focus:ring-gabay-teal/20 focus:border-gabay-teal disabled:opacity-60 disabled:bg-gray-100 transition-all"
        >
          <option value="" disabled>Select Province</option>
          {provinces.map(prov => <option key={prov.code} value={prov.name}>{prov.name}</option>)}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-gray-600 mb-1">City / Municipality</label>
        <select 
          disabled={!isEditing || !tempUserInfo.province} 
          value={tempUserInfo.city} 
          onChange={(e) => setTempUserInfo(prev => ({ ...prev, city: e.target.value, barangay: '' }))} 
          className="w-full border p-2.5 rounded-xl text-sm outline-none bg-gray-50 focus:ring-2 focus:ring-gabay-teal/20 focus:border-gabay-teal disabled:opacity-60 disabled:bg-gray-100 transition-all"
        >
          <option value="" disabled>Select City</option>
          {cities.map(city => <option key={city.code} value={city.name}>{city.name}</option>)}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Barangay</label>
        <select 
          disabled={!isEditing || !tempUserInfo.city} 
          value={tempUserInfo.barangay} 
          onChange={(e) => setTempUserInfo(prev => ({ ...prev, barangay: e.target.value }))} 
          className="w-full border p-2.5 rounded-xl text-sm outline-none bg-gray-50 focus:ring-2 focus:ring-gabay-teal/20 focus:border-gabay-teal disabled:opacity-60 disabled:bg-gray-100 transition-all"
        >
          <option value="" disabled>Select Barangay</option>
          {barangays.map(brgy => <option key={brgy.code} value={brgy.name}>{brgy.name}</option>)}
        </select>
      </div>
    </>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function PersonnelAccount() {
  const navigate = useNavigate();
  const { token, logout, userRole, setProfilePhoto, user, profilePhoto } = useContext(AuthContext);
  const fileInputRef = useRef(null);
  const currentRole = user?.role || userRole; 
  const apiBase = currentRole?.toUpperCase() === 'ADMIN' ? '/api/admin' : '/api/staff';
  
  const [localUserInfo, setLocalUserInfo] = useState({
    firstname: "", middlename: "", surname: "", suffix: "",
    role: currentRole?.toUpperCase() || "STAFF", email: "",
    contactNumber: "", dob: "", gender: "Male",
    street: "", barangay: "", city: "", province: "", postalCode: "", 
    profilePhoto: null
  });
  
  const [tempUserInfo, setTempUserInfo] = useState({ ...localUserInfo });
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [changeModalType, setChangeModalType] = useState('email'); 
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!tempUserInfo.firstname.trim()) newErrors.firstname = "Required";
    if (!tempUserInfo.surname.trim()) newErrors.surname = "Required";
    if (!tempUserInfo.dob) newErrors.dob = "Required";
    if (!phonePattern.test(tempUserInfo.contactNumber)) newErrors.contactNumber = "Invalid format";
    if (!tempUserInfo.street.trim()) newErrors.street = "Required";
    if (!tempUserInfo.barangay.trim()) newErrors.barangay = "Required";
    if (!tempUserInfo.city.trim()) newErrors.city = "Required";
    if (!tempUserInfo.province.trim()) newErrors.province = "Required";
    if (!/^\d{4}$/.test(tempUserInfo.postalCode)) newErrors.postalCode = "Must be 4 digits";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/profile/me`, {
          method: 'GET', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch profile data");
        const data = await response.json();
        
        setLocalUserInfo(prev => ({ 
          ...prev, ...data,
          firstname: data.firstname || prev.firstname,
          surname: data.surname || prev.surname,
          middlename: data.middlename || "",
          suffix: data.suffix || "",
          contactNumber: data.contactNumber || "",
          street: data.street || "",
          barangay: data.barangay || "",
          city: data.city || "",
          province: data.province || "",
          postalCode: data.postalCode || "",
          gender: data.gender || "Male"
        })); 
      } catch (error) {
        console.error("Profile Fetch Error:", error);
      }
    };
    if (token) fetchProfile();
  }, [apiBase, token]);

  useEffect(() => {
    if (isEditing) setTempUserInfo({ ...localUserInfo });
  }, [isEditing, localUserInfo]);

  const handleEditToggle = () => {
    if (isEditing) setTempUserInfo({ ...localUserInfo });
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // 3. FIX: Simplified state update to prevent bugs with strict mode
    setTempUserInfo(prev => ({ ...prev, [name]: value }));
      
    // Execute Postal Code Auto-fill Safely
    if (name === 'postalCode' && value.length === 4 && postalCodeMap[value]) {
      setTempUserInfo(prev => ({
        ...prev,
        postalCode: value, // Ensure the input still receives the value
        province: postalCodeMap[value].province,
        city: postalCodeMap[value].city,
        barangay: '' 
      }));
      toast.success(`Auto-filled location for ${postalCodeMap[value].city}`);
    }
  };

  const handleSaveProfile = async () => {
    if (!validate()) {
        toast.error("Please fix the errors highlighted in red.");
        return;
    }

    const payload = {
      firstname: tempUserInfo.firstname,
      middlename: tempUserInfo.middlename,
      surname: tempUserInfo.surname,
      suffix: tempUserInfo.suffix,
      contactNumber: tempUserInfo.contactNumber,
      dob: tempUserInfo.dob,
      gender: tempUserInfo.gender,
      street: tempUserInfo.street,
      barangay: tempUserInfo.barangay,
      city: tempUserInfo.city,
      province: tempUserInfo.province,
      postalCode: tempUserInfo.postalCode
    };

    const loadingToast = toast.loading("Saving profile updates...");

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to update profile");
      
      setLocalUserInfo({ ...tempUserInfo });
      setIsEditing(false);
      setErrors({});
      toast.success("Profile updated successfully!", { id: loadingToast });
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File size must be less than 5MB");

    const formData = new FormData();
    formData.append('profile_photo', file);

    const loadingToast = toast.loading("Uploading photo...");
    setIsUploading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${apiBase}/upload-photo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) throw new Error("Failed to upload photo");
      
      const data = await response.json();
      setLocalUserInfo(prev => ({ ...prev, profilePhoto: data.photo_url }));
      setProfilePhoto(data.photo_url); 
      toast.success("Profile photo updated!", { id: loadingToast });
    } catch (error) {
      toast.error(error.message, { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  const openLogoutModal = () => {
    setModalConfig({
      isOpen: true, type: 'danger', title: 'Confirm Logout',
      message: 'Are you sure you want to log out of your session?',
      onConfirm: () => {
        logout();
        navigate('/');
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-montserrat font-bold text-gabay-blue tracking-tight">Account Settings</h1>
          <p className="text-xs md:text-sm font-poppins text-gray-500 mt-1">Manage your personal information and security</p>
        </div>
        {!isEditing ? (
          <button onClick={handleEditToggle} className="w-full sm:w-auto px-6 py-2.5 bg-gabay-blue text-white rounded-xl font-poppins font-medium text-sm hover:bg-opacity-90 transition-all shadow-sm">
            Edit Profile
          </button>
        ) : (
          <div className="flex w-full sm:w-auto gap-3">
            <button onClick={handleEditToggle} className="flex-1 sm:flex-none px-6 py-2.5 bg-white border border-gray-300 text-gray-600 rounded-xl font-poppins font-medium text-sm hover:bg-gray-50 transition-all">
              Cancel
            </button>
            <button onClick={handleSaveProfile} className="flex-1 sm:flex-none px-6 py-2.5 bg-gabay-teal text-white rounded-xl font-poppins font-medium text-sm hover:bg-opacity-90 transition-all shadow-sm flex items-center justify-center gap-2">
              <CheckCircle size={16} /> Save
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* PERSONAL INFORMATION */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h2 className="text-lg font-bold text-gabay-blue font-montserrat mb-6 pb-2 border-b border-gray-100">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-x-6 gap-y-5">
              {!isEditing ? (
                <>
                  <div className="md:col-span-4">
                    <Input 
                      label="Full Name" 
                      value={localUserInfo.firstname ? `${localUserInfo.firstname}, ${localUserInfo.middlename}, ${localUserInfo.surname}, ${localUserInfo.suffix}` : ''} 
                      disabled={true} 
                    />
                  </div>
                </>
              ) : (
                <>
                <div className="grid grid-cols-4 gap-4">
                  <ErrorWrapper label="First Name" name="firstname" error={errors.firstname}>
                    <Input name="firstname" value={isEditing ? tempUserInfo.firstname : localUserInfo.firstname} onChange={handleInputChange} disabled={!isEditing} className={errors.firstname ? 'border-red-500 bg-red-50/30' : ''} />
                  </ErrorWrapper>
                  
                  <Input label="Middle Name" name="middlename" value={isEditing ? tempUserInfo.middlename : localUserInfo.middlename} onChange={handleInputChange} disabled={!isEditing} />
                  
                  <ErrorWrapper label="Surname" name="surname" error={errors.surname}>
                    <Input name="surname" value={isEditing ? tempUserInfo.surname : localUserInfo.surname} onChange={handleInputChange} disabled={!isEditing} className={errors.surname ? 'border-red-500 bg-red-50/30' : ''} />
                  </ErrorWrapper>

                  <Input label="Suffix" name="suffix" value={isEditing ? tempUserInfo.suffix : localUserInfo.suffix} onChange={handleInputChange} disabled={!isEditing} />
                </div>
              </>
              )}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block pl-1">Gender</label>
                  <select name="gender" value={isEditing ? tempUserInfo.gender : localUserInfo.gender} onChange={handleInputChange} disabled={!isEditing} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-poppins text-gray-800 outline-none focus:ring-2 focus:ring-gabay-teal/20 focus:border-gabay-teal transition-all disabled:opacity-60 disabled:bg-gray-100">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>
                <div className="grid grid-cols-2 gap-4">
                  <ErrorWrapper label="Contact Number" name="contactNumber" error={errors.contactNumber}>
                    <Input name="contactNumber" type="tel" value={isEditing ? tempUserInfo.contactNumber : localUserInfo.contactNumber} onChange={handleInputChange} disabled={!isEditing} placeholder="09xxxxxxxxx" className={errors.contactNumber ? 'border-red-500 bg-red-50/30' : ''} />
                  </ErrorWrapper>
                  
                  <ErrorWrapper label="Date of Birth" name="dob" error={errors.dob}>
                    <Input name="dob" type="date" value={isEditing ? tempUserInfo.dob : localUserInfo.dob} onChange={handleInputChange} disabled={!isEditing} className={errors.dob ? 'border-red-500 bg-red-50/30' : ''} />
                  </ErrorWrapper>
                </div>
            </div>
          </div>
          

          {/* LOCATION DETAILS */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mt-6">
            <h2 className="text-lg font-bold text-gabay-blue font-montserrat mb-6 pb-2 border-b border-gray-100">Location Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-5">
              {!isEditing ? (
                <>
                  <div className="md:col-span-4">
                    <Input 
                      label="Complete Address" 
                      value={localUserInfo.street ? `${localUserInfo.street}, ${localUserInfo.barangay}, ${localUserInfo.city}, ${localUserInfo.province}, ${localUserInfo.postalCode}` : ''} 
                      disabled={true} 
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-4">
                    <ErrorWrapper label="Street / Building / House No." name="street" error={errors.street}>
                      <Input name="street" value={tempUserInfo.street} onChange={handleInputChange} disabled={!isEditing} className={errors.street ? 'border-red-500 bg-red-50/30' : ''} />
                    </ErrorWrapper>
                  </div>
                  
                  <AddressDropdowns tempUserInfo={tempUserInfo} setTempUserInfo={setTempUserInfo} isEditing={isEditing} />
                  
                  <div className="md:col-span-2">
                    <ErrorWrapper label="Postal / ZIP Code" name="postalCode" error={errors.postalCode}>
                      <Input name="postalCode" type="text" maxLength={4} value={tempUserInfo.postalCode} onChange={handleInputChange} disabled={!isEditing} placeholder="e.g., 1900" className={errors.postalCode ? 'border-red-500 bg-red-50/30' : ''} />
                    </ErrorWrapper>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                {localUserInfo.profilePhoto || profilePhoto ? (
                  <img src={localUserInfo.profilePhoto || profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-gray-400 font-montserrat">{localUserInfo.firstname.charAt(0)}</span>
                )}
              </div>
              {isEditing && (
                <>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                  <button disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2.5 bg-gabay-blue text-white rounded-full hover:bg-gabay-navy transition-colors shadow-md disabled:opacity-50 border-2 border-white">
                    <Camera size={18} />
                  </button>
                </>
              )}
            </div>
            
            <div className="mt-5 text-center">
              <h3 className="text-xl font-bold text-gabay-blue font-montserrat">{localUserInfo.firstname} {localUserInfo.surname}</h3>
              <span className="inline-block mt-1 px-3 py-1 bg-teal-50 text-gabay-teal text-xs font-bold uppercase tracking-wider rounded-full font-poppins border border-teal-100">
                {localUserInfo.role}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 flex flex-col gap-5">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Mail size={12}/> Registered Email</p>
              <p className="text-sm font-poppins text-gray-800 break-all">{localUserInfo.email}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Lock size={12}/> System Password</p>
              <p className="text-sm font-poppins text-gray-800 tracking-widest">••••••••••••</p>
            </div>

            {isEditing && (
              <div className="flex flex-col items-center lg:items-start gap-4 w-full">
                <button onClick={() => { setChangeModalType('email'); setIsChangeModalOpen(true); }} className="block text-gabay-blue hover:text-gabay-navy transition-colors hover:underline text-sm font-medium">Change Email</button>
                <button onClick={() => { setChangeModalType('password'); setIsChangeModalOpen(true); }} className="block text-gabay-blue hover:text-gabay-navy transition-colors hover:underline text-sm font-medium">Change Password</button>
                <div className="w-full border-t border-gray-100 pt-3"></div>
              </div>
            )}
            <button onClick={openLogoutModal} className="flex items-center gap-2 text-gabay-teal hover:underline transition-colors hover:text-gabay-teal2 text-sm font-bold">
              <LogOut size={18} /> Log Out
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal {...modalConfig} onClose={() => setModalConfig({...modalConfig, isOpen: false})} />
      
      <ChangeModal 
        isOpen={isChangeModalOpen} 
        onClose={() => setIsChangeModalOpen(false)} 
        type={changeModalType} 
        currentEmail={localUserInfo.email} 
        token={token}
        apiBase={apiBase}
        onSuccess={(updatedEmail) => {
          setLocalUserInfo(prev => ({ ...prev, email: updatedEmail }));
        }} 
      />
    </div>
  );
}