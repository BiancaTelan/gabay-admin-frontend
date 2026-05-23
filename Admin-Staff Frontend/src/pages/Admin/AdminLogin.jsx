import caintaBg from '../../assets/caintaBg.png'; 
import gabayLogo from '../../assets/gabayLogo.png'; 
import Button from '../../components/button'; 
import Input from '../../components/input';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useContext, useRef } from 'react'; 
import { emailPattern } from '../../utils/constants'; 
import { AuthContext } from '../../authContext';
import toast from 'react-hot-toast'; 
import ReCAPTCHA from "react-google-recaptcha"; 

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const recaptchaRef = useRef(null);

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('adminRememberMe') === 'true';
  });
  const [formData, setFormData] = useState({
    email: localStorage.getItem('adminRememberedEmail') || '',
    password: ''
  });
  
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [errors, setErrors] = useState({});
  const { login } = useContext(AuthContext);

  const handleLoginSubmit = async (e) => {
    e.preventDefault(); 
    setErrors({});

    let newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailPattern.test(formData.email)) {
      newErrors.email = "Invalid Email Address format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; 
    }

    if (!recaptchaToken) {
      toast.error("Please complete the security check.");
      return;
    }

    const loadingToast = toast.loading("Verifying personnel credentials...");

    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password,
        recaptcha_token: recaptchaToken 
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const textResponse = await response.text();
      let data;
      try {
        data = textResponse ? JSON.parse(textResponse) : {};
      } catch (parseError) {
        throw new Error("The server encountered an error. Please try again later.");
      }

      if (!response.ok) {
        toast.dismiss(loadingToast);
        let errMsg = 'Invalid credentials provided.';
        if (typeof data.detail === 'string') errMsg = data.detail;
        else if (Array.isArray(data.detail)) errMsg = data.detail[0].msg || 'Invalid data format.';
        
        toast.error(errMsg);
        if (recaptchaRef.current) recaptchaRef.current.reset();
        setRecaptchaToken(null);
        return;
      }

      const userRole = data.role?.toUpperCase();
      
      if (userRole === 'PATIENT') {
        toast.dismiss(loadingToast);
        toast.error("Unauthorized: Patients cannot access the personnel portal.");
        if (recaptchaRef.current) recaptchaRef.current.reset();
        setRecaptchaToken(null);
        return;
      }

      if (rememberMe) {
        localStorage.setItem('adminRememberedEmail', formData.email);
        localStorage.setItem('adminRememberMe', 'true');
      } else {
        localStorage.removeItem('adminRememberedEmail');
        localStorage.setItem('adminRememberMe', 'false');
      }

      login(data.access_token, data.role); 
      toast.dismiss(loadingToast);
      toast.success(`Welcome back, ${userRole}!`);

      setTimeout(() => {
        if (userRole === 'ADMIN') navigate('/admin/dashboard');
        else if (userRole === 'STAFF') navigate('/staff/dashboard');
      }, 500);

    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(error.message);
      if (recaptchaRef.current) recaptchaRef.current.reset();
      setRecaptchaToken(null);
    }
  };
  
  return (
    <div className="relative min-h-screen flex items-center justify-center font-sans animate-in fade-in duration-500 text-left">
      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${caintaBg})` }} />
      <div className="absolute top-6 left-6 z-30 cursor-pointer hover:opacity-80 transition" onClick={() => navigate('/')}>
        <img src={gabayLogo} alt="GABAY Logo" className="h-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]" />
      </div>
      
      <div className="absolute inset-0 z-10 bg-black opacity-60" /> 
      <div className="relative z-20 flex flex-col md:flex-row w-full max-w-5xl bg-white shadow-2xl overflow-hidden md:rounded-2sm mx-4 text-left">
        
        <div className="hidden md:flex flex-1 bg-gabay-navy p-12 flex-col justify-center text-white text-left">
          <h1 className="font-montserrat text-4xl font-bold leading-tight mb-6">General to Specialty Appointment & Booking Assistant for You</h1>
          <h2 className="font-montserrat text-xl font-semibold mb-6">Your health, our priority.</h2>
          <p className="font-poppins text-gray-300">GABAY's Administrative Portal. AUTHORIZED ACCESS ONLY. Please use your issued credentials to view and manage the system.</p>
        </div>

        <div className="flex-1 p-8 md:p-12 bg-white">
          <h3 className="font-montserrat text-3xl font-bold text-gabay-navy text-center mb-2">Personnel Log In</h3>
          <p className="font-poppins text-gray-500 text-center text-sm mb-8">Login to access your authorized GABAY account.</p>
          
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <Input 
              label="Personnel Email" type="email" placeholder="admin@gabay.com" 
              value={formData.email} error={errors.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required isEditing={true}
            />
            <Input 
              label="Password" type="password" placeholder="••••••••" 
              value={formData.password} error={errors.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required isEditing={true}
            />

            <div className="flex items-center justify-between mt-1 mb-6">
              <label className="flex items-center cursor-pointer group">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 border-gray-300 rounded text-slate-900 focus:ring-slate-900 cursor-pointer" />
                <span className="ml-2 text-xs font-poppins text-gray-600 group-hover:text-slate-900 transition-colors">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-xs font-poppins font-medium text-gabay-blue hover:underline hover:text-gabay-navy transition-colors">Forgot Password?</Link>
            </div>
          
            {/* reCAPTCHA WIDGET */}
            <div className="flex justify-center mt-4">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={import.meta.env.RECAPTCHA_SITE_KEY}
                onChange={(token) => setRecaptchaToken(token)}
                onExpired={() => setRecaptchaToken(null)}
              />
            </div>

            <div className="flex justify-center mt-6">
              <Button variant="blue" type="submit" className="w-48">LOGIN</Button>
            </div>
          </form>

          <p className="font-poppins text-center text-[10px] mt-8 text-gray-400 italic">
            Contact a system admin if you have trouble accessing your personnel account.
          </p>
        </div>
      </div>
    </div>
  );
}