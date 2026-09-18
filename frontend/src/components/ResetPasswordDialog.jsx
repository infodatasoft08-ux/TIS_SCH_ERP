import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Eye, EyeOff, Copy, Check, Sparkles, Phone, ShieldCheck, User, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import API from "@/api";

export default function ResetPasswordDialog({
  isOpen,
  onClose,
  targetUser, // { id, name, email, phone, role: 'student' | 'teacher' | 'staff', identifier }
  onSuccess
}) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Set default password suggestion when dialog opens
  useEffect(() => {
    if (isOpen && targetUser) {
      const defaultPass = targetUser.role === "teacher" 
        ? "Teacher@123" 
        : targetUser.role === "staff" 
        ? "Staff@123" 
        : "Student@123";
      setNewPassword(defaultPass);
      setShowPassword(false);
      setCopied(false);
    }
  }, [isOpen, targetUser]);

  if (!targetUser) return null;

  const handleCopy = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      toast.success("Password copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      toast.error("Failed to copy password");
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let rand = "";
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(rand + "@1");
    toast.info("Generated strong random password");
  };

  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    if (!newPassword || newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    try {
      let endpoint = "";
      const userId = targetUser.id || targetUser.student_id || targetUser.teacher_id || targetUser.staff_id;

      if (targetUser.role === "teacher") {
        endpoint = `/teachers/update/teacher/${userId}/password`;
      } else if (targetUser.role === "staff") {
        endpoint = `/staffUser/update/staff/${userId}/password`;
      } else {
        // default student
        endpoint = `/students/update/student/${userId}/password`;
      }

      const res = await API.put(endpoint, {
        new_password: newPassword.trim()
      });

      if (res.data?.success || res.status === 200) {
        toast.success(`Password for ${targetUser.name || "User"} reset successfully! 🎉`, {
          description: `New password: ${newPassword.trim()}`
        });
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to reset password";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const roleBadgeColors = {
    student: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200",
    teacher: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200",
    staff: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border bg-card shadow-2xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white relative">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
              <KeyRound className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                Direct Password Reset
              </DialogTitle>
              <DialogDescription className="text-blue-100/90 text-xs mt-0.5">
                Set a new password directly without requiring email OTP
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Target User Info Card */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {targetUser.name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground truncate">
                  {targetUser.name || "User"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {targetUser.email || targetUser.phone || targetUser.identifier || "No contact info"}
                </div>
              </div>
            </div>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                roleBadgeColors[targetUser.role] || roleBadgeColors.student
              }`}
            >
              {targetUser.role || "Student"}
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-password" className="text-xs font-semibold text-foreground">
                  New Password <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs flex items-center gap-1 text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Password</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="pr-10 h-11 text-sm font-mono tracking-wide rounded-xl border-input focus:ring-2 focus:ring-primary/20"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Quick Fill Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Quick Suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-mono rounded-lg px-2 bg-background hover:bg-muted"
                  onClick={() => setNewPassword(targetUser.role === "teacher" ? "Teacher@123" : targetUser.role === "staff" ? "Staff@123" : "Student@123")}
                >
                  <Sparkles className="h-3 w-3 mr-1 text-amber-500" />
                  {targetUser.role === "teacher" ? "Teacher@123" : targetUser.role === "staff" ? "Staff@123" : "Student@123"}
                </Button>

                {targetUser.phone && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-mono rounded-lg px-2 bg-background hover:bg-muted"
                    onClick={() => setNewPassword(String(targetUser.phone).replace(/\s+/g, ""))}
                  >
                    <Phone className="h-3 w-3 mr-1 text-blue-500" />
                    Phone No
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-mono rounded-lg px-2 bg-background hover:bg-muted"
                  onClick={() => setNewPassword("123456")}
                >
                  123456
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs rounded-lg px-2 bg-background hover:bg-muted"
                  onClick={generateRandomPassword}
                >
                  <RefreshCw className="h-3 w-3 mr-1 text-violet-500" />
                  Random
                </Button>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                Make sure to copy and share the new password with the {targetUser.role || "user"} via WhatsApp/SMS.
              </span>
            </div>

            <DialogFooter className="pt-2 flex flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="h-10 rounded-xl text-xs font-semibold px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-5 shadow-md shadow-blue-500/20"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-3.5 w-3.5" />
                    Update Password
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
