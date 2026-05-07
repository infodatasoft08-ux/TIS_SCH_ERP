import React, { useEffect, useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import API from '@/api';
import { useSidebar } from '@/components/ui/sidebar';

export default function MobileBottomNav({ user }) {
  const [menu, setMenu] = useState([]);
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  const allowed = useCallback((item) => {
    if (!item.permissions) return true;
    const role = user?.role_id ?? user?.role;
    return (
      item.permissions.includes(role) ||
      item.permissions.includes(String(role))
    );
  }, [user]);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const cachedMenu = localStorage.getItem('sidebar_menu');
        if (cachedMenu) {
          setMenu(JSON.parse(cachedMenu));
          return;
        }

        const token = user?.token || localStorage.getItem('token');
        if (!token) return;

        const res = await API.get('/getmenu/menus', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMenu(res?.data?.results || []);
      } catch (err) {
        console.error('Error fetching menu for bottom nav', err);
      }
    };
    fetchMenus();
  }, [user]);

  const parents = menu.filter((m) => m.parent_id === null && allowed(m));

  // Show up to 4 top items, wait, admin has "more menus" vs students.
  // Actually, we'll just slice the first 4 parents to show.
  const topItems = parents.slice(0, 4);

  // Split items to place the Menu button in the absolute center
  const leftItems = topItems.slice(0, 2);
  const rightItems = topItems.slice(2, 4);

  const NavItem = ({ item }) => {
    // Resolve path: if parent has children, pick the first child's route
    const children = menu.filter((m) => m.parent_id === item.id && allowed(m));
    const actualPath = (children.length > 0 && children[0].path)
      ? children[0].path
      : (item.path || '/school/dashboard');

    const isActive = actualPath && location.pathname.startsWith(actualPath);

    return (
      <NavLink
        key={item.id}
        to={actualPath}
        className="relative flex flex-col items-center justify-center w-12 h-12"
      >
        <i
          className={`${item.icon} text-[22px] transition-colors duration-200 ${isActive ? 'text-primary' : 'text-muted-foreground'
            }`}
        />
        {/* Active Indicator dot or short line */}
        <div
          className={`absolute bottom-1 w-4 h-1 rounded-full bg-primary transition-all duration-300 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}
        />
      </NavLink>
    );
  };

  return (
    <div className="md:hidden fixed bottom-1 left-4 right-4 z-50 max-w-[520px] mx-auto">
      {/* Main Bar Wrapper */}
      <div className="relative bg-card shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 rounded-[2rem] h-[60px] px-4 flex justify-between items-center">

        {/* Faux Notch Cutout behind the FAB */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 w-[60px] h-[60px] bg-background rounded-full border-b border-border/10"></div>

        {/* Left Nav Items */}
        <div className="flex gap-4 sm:gap-6 z-10">
          {leftItems.length === 0 && (
            <NavLink to="/school/dashboard" className="relative flex flex-col items-center justify-center w-12 h-12">
              <i className={`ri-dashboard-line text-[22px] ${location.pathname.startsWith('/school/dashboard') ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className={`absolute bottom-1 w-4 h-1 rounded-full bg-primary transition-all ${location.pathname.startsWith('/school/dashboard') ? 'opacity-100' : 'opacity-0'}`} />
            </NavLink>
          )}
          {leftItems.map((item) => <NavItem key={item.id} item={item} />)}
        </div>

        {/* Center Floating Action Button (Menu) */}
        <button
          onClick={() => setOpenMobile(true)}
          className="absolute left-1/2 -translate-x-1/2 -top-4 w-[50px] h-[50px] bg-primary text-primary-foreground rounded-full flex justify-center items-center shadow-lg z-20 hover:scale-105 active:scale-95 transition-transform"
        >
          <i className="ri-menu-line text-2xl" />
        </button>

        {/* Right Nav Items */}
        <div className="flex gap-4 sm:gap-6 z-10">
          {rightItems.map((item) => <NavItem key={item.id} item={item} />)}
        </div>

      </div>
    </div>
  );
}
