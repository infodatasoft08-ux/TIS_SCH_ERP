import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../widgets/Sidebar';
import { useAuth } from '@/auth/AuthContext';
// import toast from 'react-hot-toast';
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/widgets/sidecnSidebar';
import { useThemeAnimation } from '@space-man/react-theme-animation';
import { Switch } from '@/components/ui/switch';
import { Moon, Sun } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import { useLanguage } from '@/context/LanguageContext';
import { ActionProvider } from '@/context/ActionContext';
import API from '@/api';
import { ScrollArea } from '@/components/ui/scroll-area';
import MobileBottomNav from '@/widgets/MobileBottomNav';
import CustomPullToRefresh from '@/widgets/CustomPullToRefresh';
import AnimatedLayout from '@/AnimatedLayout';
import { AnimatePresence } from 'framer-motion';


export default function MainLayout() {
  const { theme, toggleTheme, ref } = useThemeAnimation()
  const { t } = useLanguage();
  const { logout, loading, user } = useAuth();
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  // const from = location.state?.from?.pathname || '/login';



  async function userlogout() {

    try {
      setError(null);
      await logout();
      toast.success('Successfully Logout');
      // if (!user) {
      // Clear all menu caches
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sidebar_menu') || key.startsWith('sidebar_branding')) {
          localStorage.removeItem(key);
        }
      });
      // }
      navigate('/login');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
      toast.error(err?.response?.data?.message || 'Login failed');
    }

  }

  // disable browser back navigation while user is in the protected area
  useEffect(() => {
    if (!user) return;

    // push initial state so back stays in-place
    try {
      window.history.pushState(null, '', window.location.href);
    } catch (e) { }

    const handlePop = () => {
      // immediately push the same state to prevent going back
      try { window.history.pushState(null, '', window.location.href); } catch (e) { }
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [user]);


  // Apply branding settings
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await API.get('/school-gallery/settings');
        const settings = res.data.settings || {};

        if (theme === 'light') {
          if (settings.header_bg) document.documentElement.style.setProperty('--app-header-bg', settings.header_bg);
          if (settings.sidebar_bg) document.documentElement.style.setProperty('--app-sidebar-bg', settings.sidebar_bg);
          if (settings.main_bg) document.documentElement.style.setProperty('--app-main-bg', settings.main_bg);
        } else {
          // Reset branding colors in dark mode to avoid clashing
          document.documentElement.style.removeProperty('--app-header-bg');
          document.documentElement.style.removeProperty('--app-sidebar-bg');
          document.documentElement.style.removeProperty('--app-main-bg');
        }

        if (settings.app_font) {
          document.documentElement.style.setProperty('--app-font-family', settings.app_font);
        }
      } catch (error) {
        console.error('Failed to fetch branding settings:', error);
      }
    };

    fetchBranding();
  }, [theme, location.pathname]); // Re-fetch or re-apply on path change to ensure consistency


  // disable browser back navigation and handle window close/refresh
  // useEffect(() => {
  //   if (!user) return;

  //   // push initial state so back stays in-place
  //   try {
  //     window.history.pushState(null, '', window.location.href);
  //   } catch (e) { }

  //   const handlePop = () => {
  //     // immediately push the same state to prevent going back
  //     try { window.history.pushState(null, '', window.location.href); } catch (e) { }
  //   };

  //   let isRefreshing = false;

  //   const handleKeyDown = (e) => {
  //     // Detect F5, Ctrl+R, Cmd+R
  //     if (
  //       e.key === 'F5' ||
  //       (e.ctrlKey && e.key.toLowerCase() === 'r') ||
  //       (e.metaKey && e.key.toLowerCase() === 'r')
  //     ) {
  //       isRefreshing = true;
  //     }
  //   };

  //   const handleBeforeUnload = (e) => {
  //     if (isRefreshing) return; // Bypass if refreshing via keyboard
  //     // This will show a browser native alert asking the user if they want to leave
  //     e.preventDefault();
  //     e.returnValue = 'Are you sure you want to leave? You will be logged out.';
  //   };

  //   const handleUnload = () => {
  //     if (!isRefreshing) {
  //       // Clear authentication state only if not refreshing
  //       localStorage.removeItem('token');
  //       localStorage.removeItem('user');
  //     }
  //   };

  //   window.addEventListener('popstate', handlePop);
  //   window.addEventListener('keydown', handleKeyDown);
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   window.addEventListener('unload', handleUnload);

  //   return () => {
  //     window.removeEventListener('popstate', handlePop);
  //     window.removeEventListener('keydown', handleKeyDown);
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //     window.removeEventListener('unload', handleUnload);
  //   };
  // }, [user]);

  if (!user) return null;

  return (
    <SidebarProvider>
      <ActionProvider>
        <div className="min-h-screen flex bg-background w-full">
          {/* <Sidebar user={user} /> */}
          <AppSidebar user={user} />
          {/* <ShadcnSidebar user={user} /> */}

          <div className="flex-1 flex flex-col w-full overflow-hidden transition-colors duration-300" style={{ backgroundColor: theme === 'light' ? 'var(--app-main-bg)' : undefined }}>
            <header
              className="border-b px-4 flex items-center justify-between transition-colors duration-300"
              style={{ backgroundColor: theme === 'light' ? 'var(--app-header-bg)' : undefined }}
            >
              <div className="flex items-center gap-3 border-b-0 p-2 sm:p-3 sm:border-b">
                {/* Sidebar toggle button (Hidden on mobile as Bottom Nav handles menu) */}
                <div className="hidden md:block">
                  <SidebarTrigger />
                </div>
                {/* <h1 className="text-lg font-semibold"></h1> */}
                <div className="text-lg font-semibold">{t('welcome')}</div> <div className='text-indigo-500 text-lg font-semibold'>{user?.name}</div>
              </div>

              <div className="flex items-center gap-3">
                <NotificationBell />

                {/* <div className="flex items-center gap-2 mr-2">
                <Sun className="h-4 w-4 text-muted-foreground hidden md:block" />
                <Switch
                  ref={ref}
                  key={theme}
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                  aria-label="Toggle theme"
                  className="scale-90"
                />
                <Moon className="h-4 w-4 text-muted-foreground hidden md:block" />
              </div> */}

                <UserProfileDropdown onLogout={userlogout} />
              </div>
            </header>

            <main className="flex-1 flex flex-col w-full overflow-hidden max-h-[92vh] md:max-h-[91vh]">
              <CustomPullToRefresh onRefresh={async () => { window.location.reload(); }}>
                <div className="p-2 sm:p-4 sm:pl-10 flex flex-col flex-1 min-h-full">
                  <AnimatePresence mode="wait">
                    <AnimatedLayout key={location.pathname}>
                      <Outlet />
                    </AnimatedLayout>
                  </AnimatePresence>

                  {/* Company Branding */}
                  <div className="mt-auto pt-8 pb-16 md:pb-2 text-center text-xs text-muted-foreground w-full">
                    {/* Designed & Developed by <span className="font-semibold text-primary tracking-wider">INFODATASOFT</span> */}
                    © {new Date().getFullYear()} School Management System | Developed by <b className='text-primary tracking-wider'>MITHILESH INFODATASOFT CAREER RESEARCH ORGANISATION PRIVATE LIMITED</b>
                  </div>
                </div>
              </CustomPullToRefresh>
            </main>
          </div>

          {/* Mobile Bottom Navigation Bar */}
          <MobileBottomNav user={user} />

        </div>
      </ActionProvider>
    </SidebarProvider>
  );
}