import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { LogOut, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function LogoutConfirmModal({ open, onOpenChange, onConfirm, user }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await onConfirm();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
      onOpenChange(false);
    }
  };

  const userImage = user?.avatar_url || user?.user_avatar_url || 'https://github.com/shadcn.png';
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'US';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[90vw] sm:max-w-md p-0 overflow-hidden border-rose-500/20 dark:border-rose-500/30 shadow-2xl rounded-2xl bg-card my-auto">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-rose-500/10 via-red-500/10 to-orange-500/10 p-4 sm:p-5 pb-3 border-b border-rose-500/10 flex flex-col items-center text-center">
          {/* Animated Glowing Ring & Icon */}
          <div className="relative mb-2 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-md animate-pulse" />
            <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center shadow-md shadow-rose-500/30 text-white">
              <LogOut className="h-5 w-5 sm:h-6 sm:w-6 translate-x-0.5" />
            </div>
          </div>

          <AlertDialogTitle className="text-base sm:text-lg font-bold text-foreground">
            Sign Out Confirmation
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5 max-w-xs">
            Are you sure you want to end your session?
          </AlertDialogDescription>
        </div>

        {/* Body User Info */}
        <div className="p-3.5 sm:p-4 space-y-2.5">
          {user && (
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/60">
              <Avatar className="h-9 w-9 border border-rose-500/30 shadow-sm">
                <AvatarImage src={userImage} alt={user?.name} className="object-cover" />
                <AvatarFallback className="bg-rose-500 text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'Logged in user'}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] leading-snug">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span>Unsaved form changes will reset upon logging out.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 px-4 sm:px-6 bg-muted/20 border-t border-border/40 flex items-center justify-end gap-2.5">
          <AlertDialogCancel
            disabled={loggingOut}
            className="h-9 rounded-xl px-4 text-xs sm:text-sm hover:bg-muted font-medium transition-colors m-0"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={loggingOut}
            onClick={handleLogout}
            className="h-9 rounded-xl px-4 sm:px-5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white shadow-sm shadow-rose-500/25 text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {loggingOut ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Confirm Logout
              </>
            )}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
