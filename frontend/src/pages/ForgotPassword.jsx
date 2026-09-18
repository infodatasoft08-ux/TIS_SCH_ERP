import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from "sonner";
import API from "@/api";
import { isValidEmail } from '@/utils/emailValidator';
import { Mail, KeyRound, ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck, RefreshCw, Send, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Email OTP Steps: 1: Email, 2: OTP, 3: New Password
  const [emailStep, setEmailStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & loading
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, when: "beforeChildren", staggerChildren: 0.08 } },
    exit: { opacity: 0, y: -15, transition: { duration: 0.25 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0 }
  };

  const startResendTimer = () => {
    setResendCooldown(45);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!email || !email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post('/auth/forgot/send-otp', { email: email.trim() });
      if (res.data?.success) {
        toast.success(res.data.message || 'OTP sent successfully to your email');
        setEmailStep(2);
        startResendTimer();
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to send OTP. Please check your email address.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otp || !otp.trim()) {
      setError("Please enter the 6-digit OTP sent to your email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post('/auth/forgot/verify-otp', {
        email: email.trim(),
        otp: otp.trim()
      });
      if (res.data?.success) {
        toast.success('OTP verified successfully!');
        setEmailStep(3);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Invalid or expired OTP. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await API.post('/auth/forgot/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword.trim()
      });

      if (res.data?.success) {
        toast.success("Password reset successfully! Please log in with your new password.");
        setTimeout(() => navigate('/login', { replace: true }), 1500);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to reset password. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md relative">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className={`h-2 rounded-full transition-all duration-300 ${emailStep >= 1 ? 'w-10 bg-indigo-600' : 'w-4 bg-muted'}`} />
          <div className={`h-2 rounded-full transition-all duration-300 ${emailStep >= 2 ? 'w-10 bg-indigo-600' : 'w-4 bg-muted'}`} />
          <div className={`h-2 rounded-full transition-all duration-300 ${emailStep >= 3 ? 'w-10 bg-indigo-600' : 'w-4 bg-muted'}`} />
        </div>

        {/* Card Container */}
        <div className="bg-card border rounded-3xl shadow-xl p-6 sm:p-8 overflow-hidden backdrop-blur-md">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl"
            >
              <div className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-medium leading-relaxed">
                {error}
              </div>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ------------------------------------------------------------- */}
            {/* STEP 1: ENTER REGISTERED EMAIL */}
            {/* ------------------------------------------------------------- */}
            {emailStep === 1 && (
              <motion.div key="step-1" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div variants={itemVariants} className="text-center sm:text-left mb-6">
                  <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Forgot Password</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Enter your registered email address and we'll send you an OTP verification code.
                  </p>
                </motion.div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-foreground">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        className="w-full h-11 px-3.5 pl-10 border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-muted-foreground"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. yourname@example.com"
                        required
                        autoFocus
                      />
                      <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Send OTP Code
                        </>
                      )}
                    </button>
                  </motion.div>
                </form>
              </motion.div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 2: VERIFY OTP */}
            {/* ------------------------------------------------------------- */}
            {emailStep === 2 && (
              <motion.div key="step-2" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div variants={itemVariants} className="text-center sm:text-left mb-6">
                  <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Verify OTP</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Enter the 6-digit code sent to <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </motion.div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-foreground">
                      6-Digit OTP Code
                    </label>
                    <input
                      className="w-full h-12 px-3 text-center tracking-[0.5em] font-mono text-xl font-bold border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="······"
                      required
                      autoFocus
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setEmailStep(1)}
                      className="text-muted-foreground hover:text-foreground underline transition-colors"
                    >
                      Change Email
                    </button>
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || isSubmitting}
                      onClick={handleSendOtp}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold disabled:text-muted-foreground hover:underline transition-colors"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || otp.length < 4}
                      className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Verify OTP
                        </>
                      )}
                    </button>
                  </motion.div>
                </form>
              </motion.div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* STEP 3: SET NEW PASSWORD */}
            {/* ------------------------------------------------------------- */}
            {emailStep === 3 && (
              <motion.div key="step-3" variants={containerVariants} initial="hidden" animate="visible" exit="exit">
                <motion.div variants={itemVariants} className="text-center sm:text-left mb-6">
                  <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">Set New Password</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Enter your new secure password (minimum 6 characters).
                  </p>
                </motion.div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-foreground">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        className="w-full h-11 px-3.5 pr-10 border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 chars)"
                        required
                        minLength={6}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-foreground">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        className="w-full h-11 px-3.5 pr-10 border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Updating Password...
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" /> Update Password
                        </>
                      )}
                    </button>
                  </motion.div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Admin Instant Reset Help Notice Banner */}
          <div className="mt-6 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Need instant password reset?</span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
                School Admin and Class Teachers can directly reset your password in 1-click from their dashboard without waiting for email OTP.
              </p>
            </div>
          </div>

          {/* Back to Login Footer */}
          <div className="mt-5 pt-4 border-t text-center">
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