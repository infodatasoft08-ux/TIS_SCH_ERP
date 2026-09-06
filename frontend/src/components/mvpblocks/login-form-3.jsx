"use client";
import { useEffect, useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Users,
  Cloud,
  ShieldCheck,
  Award,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import logo from "@/assets/Times_Internation_School_logo.png";

export default function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, user } = useAuth();
  const from = '/school/dashboard';
  const forgotPasswordPath = '/forgotpassword';

  useEffect(() => {
    if (user && user.id) {
      if (user.sub_role === 'scanner') {
        navigate('/school/kiosk', { replace: true });
      } else {
        navigate('/school/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const isMobileApp = typeof window !== 'undefined' && window.ReactNativeWebView;

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const decodedUser = jwtDecode(credentialResponse.credential);
      const res = await googleLogin(decodedUser.email);
      if (res.ok) {
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate(from, { replace: true });
        toast.success('Logged In Successfully with Google');
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error('Google Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill both email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.ok) {
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email.trim());
          localStorage.setItem("rememberedPassword", password);
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberedPassword");
        }
        await new Promise(resolve => setTimeout(resolve, 400));

        let navigateTo = from;
        if (res.user?.sub_role === 'scanner') {
          navigateTo = '/school/kiosk';
        }

        navigate(navigateTo, { replace: true });
        toast.success('Logged In Successfully');
      } else {
        toast.error(res.message || "Login failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "disabled-client-id";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {/* Outer Container - Fits 100dvh on mobile without vertical scroll */}
      <div className="relative flex h-[100dvh] md:min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-2 sm:p-4 md:p-6 select-none">

        {/* Background Ambient Glow Spheres */}
        <div className="absolute -top-32 -left-32 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-blue-500/20 blur-[100px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none"></div>

        {/* Main Card */}
        <div className="z-10 w-full max-w-md lg:max-w-5xl xl:max-w-6xl max-h-[98dvh] md:max-h-none overflow-y-auto sm:overflow-visible">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/20 dark:border-gray-800 overflow-hidden">
            <div className="grid lg:grid-cols-12 min-h-0 lg:min-h-[640px]">

              {/* Left Side - School Branding (Desktop Only) */}
              <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col justify-between relative p-8 xl:p-10 text-white bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-900 overflow-hidden">
                {/* Background Shapes */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-72 h-72 rounded-full bg-purple-500/20 blur-2xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    {/* Floating Badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-medium tracking-wide text-blue-100 mb-6">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>Enterprise School ERP v2.5</span>
                    </div>

                    {/* Logo & Title */}
                    <div className="mb-6 flex items-center gap-3.5">
                      <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md p-1 flex items-center justify-center shadow-lg border border-white/30 shrink-0">
                        <img src={logo} alt="Times International School" className="h-full w-full object-cover rounded-xl" />
                      </div>
                      <div>
                        <span className="block text-xs font-semibold tracking-wider uppercase text-blue-200">
                          COMMITTED TO EXCELLENCE
                        </span>
                        <span className="text-lg font-bold text-white leading-tight block">
                          TIMES INTERNATIONAL SCHOOL
                        </span>
                      </div>
                    </div>

                    <h1 className="mb-3 text-3xl font-extrabold leading-snug">
                      Empowering <br />
                      <span className="text-blue-200 underline decoration-blue-400/50 decoration-wavy">Education Excellence</span>
                    </h1>
                    <p className="mb-6 text-sm text-blue-100/90 leading-relaxed max-w-sm">
                      Dedicated to providing world-class quality education and fostering leadership in young minds.
                    </p>

                    {/* Feature Items */}
                    <div className="space-y-3.5">
                      {[
                        {
                          icon: <Users className="h-4 w-4 text-blue-200" />,
                          title: "Student Success Tracking",
                          desc: "Monitor academic progress & attendance in real-time",
                        },
                        {
                          icon: <ShieldCheck className="h-4 w-4 text-emerald-300" />,
                          title: "Secure Data Management",
                          desc: "Enterprise-grade security for sensitive student records",
                        },
                        {
                          icon: <Cloud className="h-4 w-4 text-sky-200" />,
                          title: "Seamless Communication",
                          desc: "Connect teachers, parents, and students instantly",
                        },
                      ].map(({ icon, title, desc }, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-all">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 border border-white/20">
                            {icon}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-white flex items-center gap-1.5">
                              {title}
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                            </div>
                            <div className="text-blue-200/80 text-[11px] leading-tight">{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-blue-200/70 mt-6 pt-4 border-t border-white/15">
                    © {new Date().getFullYear()} TIMES INTERNATIONAL SCHOOL. All rights reserved.
                  </div>
                </div>
              </div>

              {/* Right Side - Login Form */}
              <div className="lg:col-span-7 xl:col-span-7 flex flex-col justify-between p-3.5 sm:p-6 lg:p-10 xl:p-12 bg-white dark:bg-gray-900">
                <div className="w-full mx-auto max-w-sm sm:max-w-md flex flex-col justify-between h-full">

                  {/* Header */}
                  <div>
                    <div className="text-center lg:text-left mb-3 sm:mb-6">
                      <div className="flex justify-center lg:hidden items-center mb-2">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md"></div>
                          <img src={logo} alt="Times International School" className="relative h-14 w-14 sm:h-16 sm:w-16 object-cover rounded-full ring-2 ring-blue-500/40 shadow-md" />
                        </div>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Welcome Back!
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Sign in to Times International School portal
                      </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-4">
                      {/* Email Input */}
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Email address
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                            <Mail className="h-4 w-4" />
                          </div>
                          <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="block w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 sm:py-3 pl-10 pr-3 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:bg-gray-800/80 dark:border-gray-700 dark:text-white disabled:opacity-50"
                            placeholder="admin@school.edu"
                          />
                        </div>
                      </div>

                      {/* Password Input */}
                      <div>
                        <label
                          htmlFor="password"
                          className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Password
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                            <Lock className="h-4 w-4" />
                          </div>
                          <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="block w-full rounded-xl border border-gray-200 bg-gray-50/80 py-2.5 sm:py-3 pl-10 pr-10 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all dark:bg-gray-800/80 dark:border-gray-700 dark:text-white disabled:opacity-50"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}>
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Remember & Forgot Password */}
                      <div className="flex items-center justify-between pt-0.5">
                        <label className={`flex items-center text-xs text-gray-600 dark:text-gray-400 cursor-pointer ${loading ? 'opacity-50' : ''}`}>
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            disabled={loading}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                          />
                          <span className="ml-1.5 font-medium">Remember me</span>
                        </label>
                        <Link
                          to={forgotPasswordPath}
                          className={`text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-all ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                          Forgot Password?
                        </Link>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2 sm:mt-4"
                        disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In Dashboard"
                        )}
                      </button>
                    </form>

                    {/* Registration Section */}
                    <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
                      <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
                        New to institution or Existing Candidate? Apply here:
                      </p>
                      <Link
                        to="/registration"
                        className="inline-flex items-center justify-center w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-2 text-xs font-semibold text-white shadow-xs transition-all text-center"
                      >
                        <Users className="mr-1.5 h-3.5 w-3.5" />
                        <span>Registered Here</span>
                      </Link>
                    </div>

                    {/* Google OAuth Section */}
                    {!isMobileApp && (
                      <div className="mt-2.5 sm:mt-4">
                        <div className="relative my-2 sm:my-3">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                          </div>
                          <div className="relative flex justify-center text-[11px] sm:text-xs">
                            <span className="bg-white dark:bg-gray-900 px-3 text-gray-400 font-medium">Or continue with</span>
                          </div>
                        </div>

                        <div className="flex justify-center scale-95 sm:scale-100 origin-center">
                          <div className={`${loading ? 'pointer-events-none opacity-50' : ''}`}>
                            <GoogleLogin
                              onSuccess={handleGoogleSuccess}
                              onError={() => toast.error('Google Login failed to initialize')}
                              text="signin_with"
                              shape="rectangular"
                              size="medium"
                              logo_alignment="center"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Links */}
                  <div className="mt-3 sm:mt-4 text-center text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-center gap-2 font-medium mb-0.5">
                      <Link to="/contact" className={`hover:text-blue-600 transition-colors ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                        Contact Administration
                      </Link>
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-gray-400">
                      © {new Date().getFullYear()} Times International School | Developed by <b className='text-gray-700 dark:text-gray-300'> MITHILESH INFODATASOFT CAREER RESEARCH ORGANISATION Pvt. Ltd.</b>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}