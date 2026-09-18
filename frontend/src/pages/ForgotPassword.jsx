import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import API from "@/api";
import { isValidEmail } from '@/utils/emailValidator';
import { GraduationCap, Mail, KeyRound, Calendar, ShieldCheck, ArrowLeft, Eye, EyeOff, Loader2, UserCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Mode: 'student' (Direct DOB / Admission verification) or 'email' (Email OTP)
  const [mode, setMode] = useState('student');

  // Student Direct Reset States
  const [studentStep, setStudentStep] = useState(1); // 1: Input details, 2: Set New Password
  const [identifier, setIdentifier] = useState('');
  const [dob, setDob] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const [studentNewPass, setStudentNewPass] = useState('');
  const [studentConfirmPass, setStudentConfirmPass] = useState('');
  const [showStudentNewPass, setShowStudentNewPass] = useState(false);
  const [showStudentConfirmPass, setShowStudentConfirmPass] = useState(false);

  // Email OTP States
  const [emailStep, setEmailStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [emailNewPass, setEmailNewPass] = useState('');
  const [showEmailNewPass, setShowEmailNewPass] = useState(false);

  // Shared States
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, when: "beforeChildren", staggerChildren: 0.08 } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.25 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 }
  };

  // -------------------------------------------------------------
  // STUDENT VERIFICATION FLOW (No Email OTP)
  // -------------------------------------------------------------
  const handleVerifyStudent = async (e) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Please enter your Admission No, Phone Number or Email.");
      return;
    }
    if (!dob) {
      setError("Please select your Date of Birth.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post('/auth/forgot/verify-student', {
        identifier: identifier.trim(),
        dob: dob
      });

      if (res.data.success) {
        setResetToken(res.data.resetToken);
        setVerifiedStudent(res.data.student);
        toast.success(res.data.message || "Identity verified successfully!");
        setStudentStep(2);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to verify details. Please check your info.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetStudentPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (!studentNewPass || studentNewPass.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (studentNewPass !== studentConfirmPass) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.put('/auth/forgot/reset-with-token', {
        resetToken,
        newPassword: studentNewPass
      });

      if (res.data.success) {
        toast.success("Password reset successfully! Please login with your new password.");
        setTimeout(() => navigate('/login', { replace: true }), 1200);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to reset password. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // EMAIL OTP FLOW
  // -------------------------------------------------------------
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post('/auth/forgot/send-otp', { email: email.trim() });
      if (res.data.success) {
        toast.success(res.data.message || 'OTP sent to your email');
        setEmailStep(2);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to send OTP';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post('/auth/forgot/verify-otp', { email: email.trim(), otp: otp.trim() });
      if (res.data.success) {
        toast.success('OTP verified successfully');
        setEmailStep(3);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Invalid OTP';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetEmailPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (!emailNewPass || emailNewPass.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.put('/auth/forgot/password', { email: email.trim(), newPassword: emailNewPass });
      if (res.data.success) {
        toast.success('Password updated successfully!');
        setTimeout(() => navigate('/login', { replace: true }), 1000);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Update failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md relative">
        {/* Method Toggle Buttons */}
        <div className="bg-muted/70 p-1 rounded-2xl flex gap-1 mb-4 shadow-sm border">
          <button
            type="button"
            onClick={() => {
              setMode('student');
              setError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'student'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>Student Reset (DOB)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('email');
              setError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'email'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span>Email OTP</span>
          </button>
        </div>

        {/* Card Container */}
        <div className="bg-card border rounded-3xl shadow-xl p-5 sm:p-8 overflow-hidden backdrop-blur-md">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl"
            >
              <div className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium">{error}</div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ========================================================= */}
            {/* MODE 1: STUDENT DIRECT RESET (DOB + ADMISSION / PHONE) */}
            {/* ========================================================= */}
            {mode === 'student' && studentStep === 1 && (
              <motion.div key="student-step1" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div variants={itemVariants} className="text-center sm:text-left mb-5">
                  <div className="inline-flex p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Reset Password</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Enter your school details to verify identity instantly without OTP.
                  </p>
                </motion.div>

                <form onSubmit={handleVerifyStudent} className="space-y-4">
                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-foreground">
                      Admission No / Phone / Email
                    </label>
                    <div className="relative">
                      <input
                        className="w-full h-11 px-3.5 border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        type="text"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="e.g. ADM-001 or 9876543210"
                        required
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-foreground">
                      Date of Birth (DOB)
                    </label>
                    <div className="relative">
                      <input
                        className="w-full h-11 px-3.5 border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        type="date"
                        value={dob}
                        onChange={e => setDob(e.target.value)}
                        required
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-1 block">
                      Enter date of birth as registered in school records.
                    </span>
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                      ) : (
                        'Verify & Proceed'
                      )}
                    </button>
                  </motion.div>
                </form>
              </motion.div>
            )}

            {mode === 'student' && studentStep === 2 && (
              <motion.div key="student-step2" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div variants={itemVariants} className="mb-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-300 font-bold">Verified Student</div>
                      <div className="text-sm font-extrabold text-emerald-900 dark:text-emerald-100">
                        {verifiedStudent?.name} {verifiedStudent?.admission_no ? `(${verifiedStudent.admission_no})` : ''}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="mb-4">
                  <h2 className="text-lg sm:text-xl font-black text-foreground">Create New Password</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Please choose a new password with at least 6 characters.</p>
                </motion.div>

                <form onSubmit={handleResetStudentPassword} className="space-y-3.5">
                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1 text-foreground">New Password</label>
                    <div className="relative">
                      <input
                        className="w-full h-11 px-3.5 pr-10 border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                        type={showStudentNewPass ? 'text' : 'password'}
                        value={studentNewPass}
                        onChange={e => setStudentNewPass(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentNewPass(!showStudentNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showStudentNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1 text-foreground">Confirm New Password</label>
                    <div className="relative">
                      <input
                        className="w-full h-11 px-3.5 pr-10 border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                        type={showStudentConfirmPass ? 'text' : 'password'}
                        value={studentConfirmPass}
                        onChange={e => setStudentConfirmPass(e.target.value)}
                        placeholder="Re-enter password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentConfirmPass(!showStudentConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showStudentConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                      ) : (
                        'Save & Login'
                      )}
                    </button>
                  </motion.div>
                </form>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* MODE 2: EMAIL OTP FLOW */}
            {/* ========================================================= */}
            {mode === 'email' && emailStep === 1 && (
              <motion.div key="email-step1" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div variants={itemVariants} className="text-center sm:text-left mb-5">
                  <div className="inline-flex p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-2">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Email OTP Reset</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Enter your registered email address to receive an OTP.
                  </p>
                </motion.div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-foreground">Registered Email</label>
                    <input
                      className="w-full h-11 px-3.5 border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@school.com"
                      required
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                      ) : (
                        'Send OTP'
                      )}
                    </button>
                  </motion.div>
                </form>
              </motion.div>
            )}

            {mode === 'email' && emailStep === 2 && (
              <motion.div key="email-step2" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div variants={itemVariants} className="text-center sm:text-left mb-5">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Verify OTP</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Enter the 6-digit OTP sent to <strong className="text-foreground">{email}</strong>
                  </p>
                </motion.div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-foreground">One Time Password (OTP)</label>
                    <input
                      className="w-full h-11 px-3.5 border rounded-xl bg-background text-foreground text-center tracking-widest text-lg font-mono focus:ring-2 focus:ring-indigo-500 transition-all"
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      placeholder="• • • • • •"
                      maxLength={6}
                      required
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                      ) : (
                        'Verify OTP'
                      )}
                    </button>
                  </motion.div>
                </form>

                <div className="mt-4 flex justify-between text-xs font-medium">
                  <button type="button" onClick={() => setEmailStep(1)} className="text-muted-foreground hover:text-foreground">
                    Change Email
                  </button>
                  <button type="button" onClick={handleSendOtp} disabled={isSubmitting} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    Resend OTP
                  </button>
                </div>
              </motion.div>
            )}

            {mode === 'email' && emailStep === 3 && (
              <motion.div key="email-step3" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div variants={itemVariants} className="text-center sm:text-left mb-5">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Create New Password</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Enter your new secure password.</p>
                </motion.div>

                <form onSubmit={handleResetEmailPassword} className="space-y-4">
                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-foreground">New Password</label>
                    <div className="relative">
                      <input
                        className="w-full h-11 px-3.5 pr-10 border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                        type={showEmailNewPass ? 'text' : 'password'}
                        value={emailNewPass}
                        onChange={e => setEmailNewPass(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmailNewPass(!showEmailNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showEmailNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                      ) : (
                        'Set New Password'
                      )}
                    </button>
                  </motion.div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back to Login Footer */}
          <div className="mt-6 pt-4 border-t text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}