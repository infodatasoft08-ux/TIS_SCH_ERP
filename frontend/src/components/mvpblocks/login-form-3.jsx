"use client";
import { useEffect, useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Palette,
  Users,
  Cloud,
  ShieldCheck,
  Github,
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
      // if user reached the login page via browser back/forward (POP), log them out
      {
        // otherwise, redirect logged-in users to dashboard
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
    setLoading(true);
    if (!email || !password) {
      setError("Please fill both email and password.");
      return;
    }

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
        // Add success animation before navigation
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate(from, { replace: true });
        toast.success('Logged In Successfully');
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gray-50/50 p-4 dark:bg-gray-900/50">
        <style>{`
        .login-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .login-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
        .login-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          transition: left 0.5s;
        }
        .login-btn:hover::before {
          left: 100%;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
        <div className="z-10 w-full max-w-6xl">
          <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-700">
            <div className="grid min-h-[700px] lg:grid-cols-2">
              {/* Left Side - School Branding (Hidden on mobile) */}
              <div className="hidden lg:flex flex-col brand-side relative m-3 rounded-[24px] bg-gradient-to-br from-blue-600 to-indigo-700 p-12 text-white overflow-hidden">
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl"></div>

                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="mb-12 flex items-center gap-3">
                      <div className="h-32 w-32 rounded-xl flex items-center justify-center">
                        {/* <Cloud className="text-white h-6 w-6" /> */}
                        <img src={logo} alt="Logo" className="rounded-xl" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold tracking-wide uppercase text-white/90">
                          TIMES INTERNATIONAL SCHOOL
                        </span>
                        <span className="text-[14px] text-white/90 tracking-wider font-semibold">
                          Commited to Excellence
                        </span>
                      </div>
                    </div>

                    <h1 className="mb-6 text-5xl font-bold leading-tight">
                      <span className="text-blue-200">Education Excellence</span>
                    </h1>
                    <p className="mb-12 text-lg text-blue-100/90 leading-relaxed max-w-md">
                      Dedicated to the quality education for children
                    </p>

                    <div className="space-y-8">
                      {[
                        {
                          icon: <Users className="h-5 w-5" />,
                          title: "Student Success Tracking",
                          desc: "Monitor academic progress and attendance in real-time",
                        },
                        {
                          icon: <ShieldCheck className="h-5 w-5" />,
                          title: "Secure Data Management",
                          desc: "Enterprise-grade security for sensitive student records",
                        },
                        {
                          icon: <Cloud className="h-5 w-5" />,
                          title: "Seamless Communication",
                          desc: "Connect teachers, parents, and students instantly",
                        },
                      ].map(({ icon, title, desc }, i) => (
                        <div
                          key={i}
                          className="feature-item animate-fadeInUp flex items-start gap-4"
                          style={{ animationDelay: `${0.2 * (i + 1)}s` }}>
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                            {icon}
                          </div>
                          <div>
                            <div className="font-semibold text-lg text-white">{title}</div>
                            <div className="text-blue-200/80 text-sm leading-snug mt-1">{desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-blue-200/60 mt-8">
                    © {new Date().getFullYear()} TIMES INTERNATIONAL SCHOOL. All rights reserved.
                  </div>
                </div>
              </div>

              {/* Right Side - Login Form */}
              <div className="flex flex-col justify-center p-8 lg:p-16 bg-white dark:bg-gray-800">
                <div className="mx-auto w-full max-w-md">
                  <div className="mb-10 text-center lg:text-left">
                    <div className="flex items-center flex-col gap-3">
                      <div className="h-32 w-32 rounded-xl lg:h-20 lg:hidden flex items-center justify-center">
                        {/* <Cloud className="text-white h-6 w-6" /> */}
                        <img src={logo} alt="Logo" className="rounded-xl" />
                      </div>
                      <span className="text-[1px] font-bold tracking-wide uppercase lg:hidden text-black/90 dark:text-white">
                        TIMES INTERNATIONAL SCHOOL
                      </span>
                      <span className="text-[14px] text-right lg:hidden text-muted-foreground tracking-wider font-semibold">
                        Commited to Excellence
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                      Welcome Back!
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      Sign in to your administrative dashboard
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Email address
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                          <Mail className="h-5 w-5" />
                        </div>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={loading}
                          className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="admin@gmail.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="password"
                        className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Password
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 group-focus-within:text-blue-600 transition-colors">
                          <Lock className="h-5 w-5" />
                        </div>
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="block w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-11 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 dark:bg-gray-900 dark:border-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}>
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className={`flex items-center text-sm text-gray-600 dark:text-gray-400 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          disabled={loading}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20 disabled:opacity-50"
                        />
                        <span className="ml-2">Remember me</span>
                      </label>
                      <Link
                        to={forgotPasswordPath}
                        className={`text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-all ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                        Forgot Password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      className="login-btn mt-6 flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed"
                      disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In Dashboard"
                      )}
                    </button>

                    {!isMobileApp && (
                      <>
                        <div className="relative my-8">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                          </div>
                          <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-4 text-gray-500 dark:bg-gray-800">Or continue with</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div className={`flex items-center justify-center ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                            <GoogleLogin
                              onSuccess={handleGoogleSuccess}
                              onError={() => toast.error('Google Login failed to initialize')}
                              text="signin_with"
                              shape="rectangular"
                              size="large"
                              logo_alignment="center"
                              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-4 text-gray-500 dark:bg-gray-800">Or continue with</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className={`flex items-center justify-center ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={() => toast.error('Google Login failed to initialize')}
                          text="signin_with"
                          shape="rectangular"
                          size="large"
                          logo_alignment="center"
                          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
                        />
                      </div>
                    </div> */}
                  </form>

                  <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Don't have an account or want to get admission?{" "}
                    <Link to="/contact" className={`font-semibold text-blue-600 hover:text-blue-700 transition-colors ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                      Contact Administration
                    </Link>
                  </div>
                  <div className="mt-12 text-center text-xs text-muted-foreground w-full">
                    {/* Designed & Developed by <span className="font-semibold text-primary tracking-wider">INFODATASOFT</span> */}
                    © {new Date().getFullYear()} School Management System | Developed by <b className='text-primary tracking-wider'>MITHILESH INFODATASOFT CAREER RESEARCH ORGANISATION PRIVATE LIMITED</b>
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