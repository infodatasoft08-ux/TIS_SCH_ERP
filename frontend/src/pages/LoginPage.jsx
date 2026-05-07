// import React, { useState, useEffect } from 'react';
// import { useNavigate, useLocation, Link } from 'react-router-dom';
// import API from '../api';
// import { useAuth } from '@/auth/AuthContext';

// export default function LoginPage() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { login, loading, user } = useAuth();
//   const from = location.state?.from?.pathname || '/school/dashboard';
//   const forgotPasswordPath = '/forgotpassword';

//   // Redirect to dashboard if already logged in
//   useEffect(() => {
//     if (user && user.id) {
//       navigate('/school/dashboard', { replace: true });
//     }
//   }, [user, navigate]);

//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [remember, setRemember] = useState(true);
//   const [error, setError] = useState(null);

//     async function handleSubmit(e) {
//         e.preventDefault();
//         setError(null);

//         if (!email || !password) {
//           setError("Please fill both email and password.");
//           return;
//         }
//         try {
//             const res = await login(email.trim(), password);
//             if (res.ok) {
//                 navigate(from, { replace: true });
//             } else {
//                 setError(res.message || 'Login failed');
//             }
        
//         } catch (err) {
//             setError(err?.response?.data?.message || 'Login failed');
//         }
//     }

//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//       <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
//         <h1 className="text-2xl font-semibold mb-2">Sign in to Admin</h1>
//         <p className="text-sm text-gray-500 mb-4">Use your admin credentials to sign in.</p>

//         {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium mb-1">Email</label>
//             <input
//               className="w-full p-2 border rounded"
//               type="email"
//               value={email}
//               onChange={e => setEmail(e.target.value)}
//               placeholder="admin@school.com"
//               autoComplete="email"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium mb-1">Password</label>
//             <div className="relative">
//               <input
//                 className="w-full p-2 border rounded pr-10"
//                 type={showPassword ? 'text' : 'password'}
//                 value={password}
//                 onChange={e => setPassword(e.target.value)}
//                 placeholder="Your password"
//                 autoComplete="current-password"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword(s => !s)}
//                 className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-600"
//               >
//                 {showPassword ? 'Hide' : 'Show'}
//               </button>
//             </div>
//           </div>

//           <div className="flex items-center justify-between">
//             <label className="flex items-center gap-2 text-sm">
//               <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
//               Remember me
//             </label>
//             <Link to={forgotPasswordPath} className="text-sm text-blue-600 hover:underline">Forgot?</Link>
//           </div>

//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
//             disabled={loading}
//           >
//             {loading ? 'Signing in...' : 'Sign in'}
//             Sign in
//           </button>
//         </form>

//         <div className="mt-4 text-center text-sm text-gray-500">
//           Demo admin: <strong>admin@school.com</strong> / <strong>Admin@123</strong>
//         </div>
//       </div>
//     </div>
//   );
// }


import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useNavigationType } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/AuthContext';
// import toast from 'react-hot-toast';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import SignInPage from '@/components/mvpblocks/login-form-3';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, user } = useAuth();
  const from = '/school/dashboard';

  useEffect(() => {
    if (user && user.id) {
      // if user reached the login page via browser back/forward (POP), log them out
      {
        // otherwise, redirect logged-in users to dashboard
        navigate('/school/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!email || !password) {
      setError("Please fill both email and password.");
      setIsSubmitting(false);
      return;
    }
    
    try {
      const res = await login(email.trim(), password, remember);
      if (res.ok) {
        // Add success animation before navigation
        await new Promise(resolve => setTimeout(resolve, 500));
        navigate(from, { replace: true });
        toast.success('Logged In Successfully');
      } else {
        setError(res.message || 'Login failed');
        toast.error(res.message);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
      toast.error(err?.response?.data?.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleForgotPassword = async () => {
    // Add exit animation before navigation
    await new Promise(resolve => setTimeout(resolve, 200));
    navigate('/forgotpassword');
  };

  return (
    <>
    {/* <div className="min-h-screen bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to your admin account</p>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="text-sm text-red-600 flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@school.com"
                autoComplete="email"
                required
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pr-12"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="remember" className="ml-2 text-sm text-gray-700">
                Remember me
              </label>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Button
                type="submit"
                disabled={loading || isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </Button>
            </motion.div>
          </form>

          <motion.div
            variants={itemVariants}
            className="mt-8 pt-6 border-t border-gray-200"
          >
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Demo Credentials</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-800">
                  Email: <span className="font-normal">admin@school.com</span>
                </p>
                <p className="text-sm font-medium text-gray-800">
                  Password: <span className="font-normal">Admin@123</span>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div> */}
      <div>
        <SignInPage/>
      </div>
    </>
  );
}









// import React, { useState, useEffect } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { useAuth } from '@/auth/AuthContext';

// export default function LoginPage() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { login, loading, user } = useAuth();
//   const from = location.state?.from?.pathname || '/school/dashboard';

//   useEffect(() => {
//     if (user && user.id) {
//       navigate('/school/dashboard', { replace: true });
//     }
//   }, [user, navigate]);

//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [remember, setRemember] = useState(true);
//   const [error, setError] = useState(null);
//   const [isExiting, setIsExiting] = useState(false);

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setError(null);

//     if (!email || !password) {
//       setError("Please fill both email and password.");
//       return;
//     }
    
//     try {
//       const res = await login(email.trim(), password);
//       if (res.ok) {
//         navigate(from, { replace: true });
//       } else {
//         setError(res.message || 'Login failed');
//       }
//     } catch (err) {
//       setError(err?.response?.data?.message || 'Login failed');
//     }
//   }

//   const handleForgotPassword = (e) => {
//     e.preventDefault();
//     setIsExiting(true);
//     // Small delay to allow exit animation to play
//     setTimeout(() => {
//       navigate('/forgotpassword');
//     }, 150);
//   };

//   return (
//     <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
//       <div className="min-h-screen flex items-center justify-center p-4">
//         <div className={`w-full max-w-md transition-all duration-300 ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
//           <div className="bg-white rounded-2xl shadow-xl p-8">
//             <div className="text-center mb-8">
//               <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back</h1>
//               <p className="text-gray-600">Sign in to your admin account</p>
//             </div>

//             {error && (
//               <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
//                 <div className="text-sm text-red-600 flex items-center justify-center">
//                   <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
//                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                   </svg>
//                   {error}
//                 </div>
//               </div>
//             )}

//             <form onSubmit={handleSubmit} className="space-y-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
//                 <input
//                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
//                   type="email"
//                   value={email}
//                   onChange={e => setEmail(e.target.value)}
//                   placeholder="admin@school.com"
//                   autoComplete="email"
//                   required
//                 />
//               </div>

//               <div>
//                 <div className="flex justify-between items-center mb-2">
//                   <label className="block text-sm font-medium text-gray-700">Password</label>
//                   <button
//                     type="button"
//                     onClick={handleForgotPassword}
//                     className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
//                   >
//                     Forgot Password?
//                   </button>
//                 </div>
//                 <div className="relative">
//                   <input
//                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pr-12"
//                     type={showPassword ? 'text' : 'password'}
//                     value={password}
//                     onChange={e => setPassword(e.target.value)}
//                     placeholder="Enter your password"
//                     autoComplete="current-password"
//                     required
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(s => !s)}
//                     className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
//                   >
//                     {showPassword ? 'Hide' : 'Show'}
//                   </button>
//                 </div>
//               </div>

//               <div className="flex items-center">
//                 <input
//                   type="checkbox"
//                   id="remember"
//                   checked={remember}
//                   onChange={e => setRemember(e.target.checked)}
//                   className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
//                 />
//                 <label htmlFor="remember" className="ml-2 text-sm text-gray-700">
//                   Remember me
//                 </label>
//               </div>

//               <div>
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {loading ? 'Signing in...' : 'Sign In'}
//                 </button>
//               </div>
//             </form>

//             <div className="mt-8 pt-6 border-t border-gray-200">
//               <div className="text-center">
//                 <p className="text-sm text-gray-600 mb-2">Demo Credentials</p>
//                 <div className="bg-gray-50 rounded-lg p-3">
//                   <p className="text-sm font-medium text-gray-800">
//                     Email: <span className="font-normal">admin@school.com</span>
//                   </p>
//                   <p className="text-sm font-medium text-gray-800">
//                     Password: <span className="font-normal">Admin@123</span>
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }