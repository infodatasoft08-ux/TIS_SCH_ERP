// import React, { useState, useEffect } from 'react';
// import { useNavigate, useLocation, Link } from 'react-router-dom';
// import { useAuth } from '@/auth/AuthContext';

// export default function ForgotPasswordPage() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { loading, forgotPassword } = useAuth();
//   const from = location.state?.from?.pathname || '/login';

//   const [email, setEmail] = useState('');
//   const [currentPassword, setcurrentPassword] = useState('');
//   const [newPassword, setnewPassword] = useState('');
//   const [showCurrentPassword, setShowCurrentPassword] = useState(false);
//   const [showNewPassword, setShowNewPassword] = useState(false);
//   const [error, setError] = useState(null);

//     async function handleSubmit(e) {
//         e.preventDefault();
//         setError(null);

//         if (!email || !currentPassword || !newPassword) {
//           setError("Please fill all email current password and new password.");
//           return;
//         }
//         try {
//             const res = await forgotPassword(email.trim(), currentPassword, newPassword);
//             if (res.ok) {
//                 navigate(from, { replace: true });
//             } else {
//                 setError(res.message || 'update failed');
//             }
        
//         } catch (err) {
//             setError(err?.response?.data?.message || 'update failed');
//         }
//     }

//   return (
//     <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
//       <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
//         <h1 className="text-2xl font-semibold mb-2">Forgot Password</h1>
//         {/* <p className="text-sm text-gray-500 mb-4">Use your email and current a.</p> */}

//         {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

//         <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//                 <label className="block text-sm font-medium mb-1">Email</label>
//                 <input
//                 className="w-full p-2 border rounded"
//                 type="email"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 placeholder="name@school.com"
//                 autoComplete="email"
//                 />
//             </div>

//             <div>
//                 <label className="block text-sm font-medium mb-1">Current Password</label>
//                 <div className="relative">
//                     <input
//                         className="w-full p-2 border rounded pr-10"
//                         type={showCurrentPassword ? 'text' : 'password'}
//                         value={currentPassword}
//                         onChange={e => setcurrentPassword(e.target.value)}
//                         placeholder="Your password"
//                         autoComplete="current-password"
//                     />
//                     <button
//                         type="button"
//                         onClick={() => setShowCurrentPassword(s => !s)}
//                         className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-600"
//                     >
//                         {showCurrentPassword ? 'Hide' : 'Show'}
//                     </button>
//                 </div>
//             </div>
//             <div>
//                 <label className="block text-sm font-medium mb-1">New Password</label>
//                 <div className="relative">
//                     <input
//                         className="w-full p-2 border rounded pr-10"
//                         type={showNewPassword ? 'text' : 'password'}
//                         value={newPassword}
//                         onChange={e => setnewPassword(e.target.value)}
//                         placeholder="Your password"
//                         autoComplete="current-password"
//                     />
//                     <button
//                         type="button"
//                         onClick={() => setShowNewPassword(s => !s)}
//                         className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-600"
//                     >
//                         {showNewPassword ? 'Hide' : 'Show'}
//                     </button>
//                 </div>
//             </div>

//           <button
//             type="button"
//             onClick={() => navigate('/login', { replace: true })}
//             className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
//             disabled={loading}
//           >
//             {loading ? 'updating...' : 'Confirm'}
//             Confirm
//           </button>
//         </form>

//         {/* <div className="mt-4 text-center text-sm text-gray-500">
//           Demo admin: <strong>admin@school.com</strong> / <strong>Admin@123</strong>
//         </div> */}
//       </div>
//     </div>
//   );
// }




import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import API from "@/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, when: "beforeChildren", staggerChildren: 0.1 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  async function handleSendOtp(e) {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post('/auth/forgot/send-otp', { email: email.trim() });
      if (res.data.success) {
        toast.success(res.data.message || 'OTP sent to your email');
        setStep(2);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send OTP');
      toast.error(err?.response?.data?.error || 'Failed to send OTP');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError(null);
    if (!otp) {
      setError("Please enter the OTP.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.post('/auth/forgot/verify-otp', { email: email.trim(), otp: otp.trim() });
      if (res.data.success) {
        toast.success('OTP verified successfully');
        setStep(3);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid OTP');
      toast.error(err?.response?.data?.error || 'Invalid OTP');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError(null);
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await API.put('/auth/forgot/password', { email: email.trim(), newPassword });
      if (res.data.success) {
        toast.success('Password updated successfully!');
        setTimeout(() => navigate('/login', { replace: true }), 1000);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Update failed');
      toast.error(err?.response?.data?.error || 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleCancel = async () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md relative"
      >
        <AnimatePresence mode="wait">
          {/* STEP 1: EMAIL */}
          {step === 1 && (
            <motion.div key="step1" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 absolute w-full top-1/2 -translate-y-1/2" style={{ position: 'relative', top: 0, transform: 'none' }}>
              <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Forgot Password</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Enter your registered email address to receive an OTP.</p>
              </motion.div>

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
                </motion.div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-6">
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@gmail.com" required
                  />
                </motion.div>
                <motion.div variants={itemVariants} className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all">
                    {isSubmitting ? 'Sending...' : 'Send OTP'}
                  </button>
                </motion.div>
              </form>
              <div className="mt-6 text-center"><button onClick={handleCancel} className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">← Back to Login</button></div>
            </motion.div>
          )}

          {/* STEP 2: OTP */}
          {step === 2 && (
            <motion.div key="step2" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 absolute w-full top-1/2 -translate-y-1/2" style={{ position: 'relative', top: 0, transform: 'none' }}>
              <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Verify OTP</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Enter the 6-digit OTP sent to {email}</p>
              </motion.div>

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
                </motion.div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">One Time Password</label>
                  <input
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-center tracking-widest text-lg font-mono transition-all duration-200"
                    type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="• • • • • •" maxLength="6" required
                  />
                </motion.div>
                <motion.div variants={itemVariants} className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all">
                    {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </motion.div>
              </form>
              <div className="mt-6 flex justify-between text-sm font-medium">
                <button onClick={() => setStep(1)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">Change Email</button>
                <button onClick={handleSendOtp} disabled={isSubmitting} className="text-blue-600 dark:text-blue-400 hover:underline">Resend OTP</button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 3 && (
            <motion.div key="step3" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 absolute w-full top-1/2 -translate-y-1/2" style={{ position: 'relative', top: 0, transform: 'none' }}>
              <motion.div variants={itemVariants}>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Create New Password</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Enter your new strong password.</p>
              </motion.div>

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
                </motion.div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-6">
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 pr-12 transition-all duration-200"
                      type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" required minLength="6"
                    />
                    <button type="button" onClick={() => setShowNewPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                      {showNewPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </motion.div>
                <motion.div variants={itemVariants} className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all">
                    {isSubmitting ? 'Updating...' : 'Set New Password'}
                  </button>
                </motion.div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}



// import React, { useState } from 'react';
// import { useNavigate, useLocation } from 'react-router-dom';
// import { useAuth } from '@/auth/AuthContext';

// export default function ForgotPasswordPage() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { loading, forgotPassword } = useAuth();
  
//   const [email, setEmail] = useState('');
//   const [currentPassword, setCurrentPassword] = useState('');
//   const [newPassword, setNewPassword] = useState('');
//   const [showCurrentPassword, setShowCurrentPassword] = useState(false);
//   const [showNewPassword, setShowNewPassword] = useState(false);
//   const [error, setError] = useState(null);
//   const [isExiting, setIsExiting] = useState(false);

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setError(null);

//     if (!email || !currentPassword || !newPassword) {
//       setError("Please fill all fields.");
//       return;
//     }
    
//     try {
//       const res = await forgotPassword(email.trim(), currentPassword, newPassword);
//       if (res.ok) {
//         setIsExiting(true);
//         setTimeout(() => {
//           navigate('/login', { replace: true });
//         }, 150);
//       } else {
//         setError(res.message || 'Update failed');
//       }
//     } catch (err) {
//       setError(err?.response?.data?.message || 'Update failed');
//     }
//   }

//   const handleCancel = (e) => {
//     e.preventDefault();
//     setIsExiting(true);
//     setTimeout(() => {
//       navigate('/login', { replace: true });
//     }, 150);
//   };

//   return (
//     <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
//       <div className="min-h-screen flex items-center justify-center p-4">
//         <div className={`w-full max-w-md transition-all duration-300 ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
//           <div className="bg-white rounded-2xl shadow-xl p-8">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-800 mb-2">Change Password</h1>
//               <p className="text-sm text-gray-600 mb-6">Enter your email, current password, and new password.</p>
//             </div>

//             {error && (
//               <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
//                 <div className="text-sm text-red-600 flex items-center">
//                   <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
//                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
//                   </svg>
//                   {error}
//                 </div>
//               </div>
//             )}

//             <form onSubmit={handleSubmit} className="space-y-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
//                 <input
//                   className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
//                   type="email"
//                   value={email}
//                   onChange={e => setEmail(e.target.value)}
//                   placeholder="name@school.com"
//                   autoComplete="email"
//                   required
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
//                 <div className="relative">
//                   <input
//                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pr-12"
//                     type={showCurrentPassword ? 'text' : 'password'}
//                     value={currentPassword}
//                     onChange={e => setCurrentPassword(e.target.value)}
//                     placeholder="Your current password"
//                     autoComplete="current-password"
//                     required
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowCurrentPassword(s => !s)}
//                     className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
//                   >
//                     {showCurrentPassword ? 'Hide' : 'Show'}
//                   </button>
//                 </div>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
//                 <div className="relative">
//                   <input
//                     className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pr-12"
//                     type={showNewPassword ? 'text' : 'password'}
//                     value={newPassword}
//                     onChange={e => setNewPassword(e.target.value)}
//                     placeholder="Your new password"
//                     autoComplete="new-password"
//                     required
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowNewPassword(s => !s)}
//                     className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
//                   >
//                     {showNewPassword ? 'Hide' : 'Show'}
//                   </button>
//                 </div>
//               </div>

//               <div className="flex gap-3 pt-2">
//                 <button
//                   type="button"
//                   onClick={handleCancel}
//                   disabled={loading}
//                   className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200 disabled:opacity-50"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
//                 >
//                   {loading ? 'Updating...' : 'Update Password'}
//                 </button>
//               </div>
//             </form>

//             <div className="mt-6 pt-6 border-t border-gray-200 text-center">
//               <button
//                 onClick={handleCancel}
//                 className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
//               >
//                 ← Back to Login
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }