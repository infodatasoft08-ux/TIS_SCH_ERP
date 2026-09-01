import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  SidebarMenuSkeleton,
  SidebarFooter,
} from "@/components/ui/sidebar";

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import API from "@/api";
import "remixicon/fonts/remixicon.css";
import { School } from "lucide-react";
import { useActions } from "@/context/ActionContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeAnimation } from "@space-man/react-theme-animation";
import SchoolLogo from "../assets/Times_Internation_School_logo.png";

/* ---------------- Helpers ---------------- */
const isActive = (path, location) =>
  path && location.pathname === path;

export default function AppSidebar({ user }) {
  const location = useLocation();
  const { state } = useSidebar(); // expanded | collapsed
  const { setCurrentActions } = useActions();
  const { theme } = useThemeAnimation();

  const [menu, setMenu] = useState([]);
  const [openParent, setOpenParent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logo, setLogo] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [schoolName, setSchoolName] = useState("");
  const [loadingGallery, setLoadingGallery] = useState(false);

  /* ---------- permissions ---------- */
  const allowed = useCallback((item) => {
    if (!item.permissions) return true;
    const role = user?.role_id ?? user?.role;
    return (
      item.permissions.includes(role) ||
      item.permissions.includes(String(role))
    );
  });

  /* ---------- fetch menu ---------- */
  const fetchMenus = useCallback(async () => {

    setIsLoading(true);
    try {
      const token = user?.token || localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      const userRoleId = user?.role_id ?? user?.role;
      const userId = user?.id;
      const cacheKey = `sidebar_menu_role_${userRoleId || 'none'}_user_${userId || 'none'}`;

      // Check if we have cached menu
      const cachedMenu = localStorage.getItem(cacheKey);
      const cacheTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);

      // Cache for 5 minutes (300000 ms)
      if (cachedMenu && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < 300000) {
        setMenu(JSON.parse(cachedMenu));
        setIsLoading(false);
        return;
      }

      const res = await API.get("/getmenu/menus", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const menuData = res?.data?.results || [];
      setMenu(menuData);
      // Cache the menu under user/role scoped key
      localStorage.setItem(cacheKey, JSON.stringify(menuData));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (error) {
      console.error("Error fetching menu:", error);
      // Fallback: try cached menu for this specific user
      const userRoleId = user?.role_id ?? user?.role;
      const userId = user?.id;
      const cacheKey = `sidebar_menu_role_${userRoleId || 'none'}_user_${userId || 'none'}`;
      const cachedMenu = localStorage.getItem(cacheKey);
      if (cachedMenu) {
        setMenu(JSON.parse(cachedMenu));
      }
    } finally {
      setIsLoading(false);
    }

  }, [user]);



  /* ---------- parents & children ---------- */
  const parents = menu.filter(
    (m) => m.parent_id === null && allowed(m)
  );

  const childrenOf = (id) =>
    menu.filter(
      (m) => m.parent_id === id && allowed(m)
    );

  /* ---------- auto-open parent on route ---------- */
  useEffect(() => {
    let activeActions = [];
    parents.forEach((parent) => {
      const children = childrenOf(parent.id);

      // Check children first
      const activeChild = children.find((c) => isActive(c.path, location));
      if (activeChild) {
        setOpenParent(parent.id);
        activeActions = activeChild.actions || [];
      } else if (isActive(parent.path, location)) {
        activeActions = parent.actions || [];
      }
    });

    // Handle case for parents with no children that are active
    if (activeActions.length === 0) {
      const activeParent = parents.find(p => isActive(p.path, location));
      if (activeParent) activeActions = activeParent.actions || [];
    }

    // Set actions in context
    try {
      setCurrentActions(typeof activeActions === 'string' ? JSON.parse(activeActions) : activeActions);
    } catch (e) {
      console.error("Error parsing actions:", e);
      setCurrentActions([]);
    }
  }, [location.pathname, menu, setCurrentActions]);

  /* ---------- close parents when sidebar collapses ---------- */
  useEffect(() => {
    if (state === "collapsed") {
      setOpenParent(null);
    }
  }, [state]);

  const fetchBranding = useCallback(async () => {
    // Check cache first
    const cachedBranding = localStorage.getItem('sidebar_branding');
    const cacheTimestamp = localStorage.getItem('sidebar_branding_timestamp');

    // Cache for 5 minutes (300000 ms)
    if (cachedBranding && cacheTimestamp && (Date.now() - parseInt(cacheTimestamp)) < 300000) {
      const data = JSON.parse(cachedBranding);
      setLogo(data.logo);
      setGallery(data.gallery);
      setSchoolName(data.schoolName);
      return;
    }

    setLoadingGallery(true);
    try {
      const [galleryRes, settingsRes] = await Promise.all([
        API.get('/school-gallery'),
        API.get('/school-gallery/settings')
      ]);

      const images = galleryRes.data.images || [];
      const schoolLogo = images.find(img => img.image_type === 'logo');
      const schoolGallery = images.filter(img => img.image_type === 'gallery');
      const name = settingsRes.data.settings?.school_name || "Micro School";

      setLogo(schoolLogo);
      setGallery(schoolGallery);
      setSchoolName(name);

      // Save to cache
      localStorage.setItem('sidebar_branding', JSON.stringify({
        logo: schoolLogo,
        gallery: schoolGallery,
        schoolName: name
      }));
      localStorage.setItem('sidebar_branding_timestamp', Date.now().toString());
    } catch (error) {
      console.error('Fetch Branding Error:', error);
      // Fallback to cache even if stale if network fails
      if (cachedBranding) {
        const data = JSON.parse(cachedBranding);
        setLogo(data.logo);
        setGallery(data.gallery);
        setSchoolName(data.schoolName);
      }
    } finally {
      setLoadingGallery(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
    fetchBranding();
  }, [fetchMenus, fetchBranding]);

  /* ---------------- Render ---------------- */
  if (isLoading || loadingGallery) {
    return (
      <Sidebar
        collapsible="icon"
        className="shrink-0"
        style={{
          "--sidebar-width": "17.5rem",
          "--sidebar-width-icon": "4rem",
          backgroundColor: theme === 'light' ? 'var(--app-sidebar-bg)' : undefined
        }}
      >
        {/* HEADER SKELETON */}
        <SidebarHeader className="px-3 py-5 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-2xl" />

            <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </SidebarHeader>

        {/* MENU SKELETON */}
        <SidebarContent className="px-3 py-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-2 py-2 rounded-md"
            >
              {/* icon */}
              <Skeleton className="h-5 w-5 rounded" />

              {/* text */}
              <Skeleton className="h-4 w-36 group-data-[collapsible=icon]:hidden" />
            </div>
          ))}
        </SidebarContent>
      </Sidebar>
    );
  }
  return (
    <Sidebar
      collapsible="icon"
      className="shrink-0 transition-colors duration-300"
      style={{
        "--sidebar-width": "17.5rem",
        "--sidebar-width-icon": "4rem",
        backgroundColor: theme === 'light' ? 'var(--app-sidebar-bg)' : undefined
      }}
    >
      <SidebarHeader className="px-3 py-4 border-b border-sidebar-border/50">
        <div className="flex flex-col items-center gap-3 overflow-hidden text-center">
          <div className="flex shrink-0 items-center justify-center p-2 rounded-2xl bg-muted/40 dark:bg-slate-800/50 border border-border/50 shadow-sm group-data-[collapsible=icon]:mx-auto">
            {logo ? (
              <img src={logo.image_url} alt="Logo" className="h-32 w-32 object-contain rounded-xl" />
            ) : (
              <img src={SchoolLogo} alt="Logo" className="h-32 w-32 object-contain rounded-xl" />
            )}
          </div>
          <div className="flex flex-col items-center gap-0.5 group-data-[collapsible=icon]:hidden w-full px-1">
            <span className="text-[14px] font-bold leading-tight truncate max-w-[240px] text-sidebar-foreground">
              {schoolName || "Times International School"}
            </span>
            <span className="text-[11px] text-muted-foreground tracking-wider font-semibold">
              Commited to Excellence
            </span>
          </div>
        </div>
      </SidebarHeader>

      <ScrollArea className="flex-1 max-h-[calc(100vh-140px)]">
        <SidebarContent className="px-3 py-2">
          {/* Dynamic Menus from DB */}
          {parents.map((parent) => {
            const children = childrenOf(parent.id);
            const hasChildren = children.length > 0;
            const isOpen = openParent === parent.id;

            const parentActive =
              isActive(parent.path, location) ||
              children.some((c) => isActive(c.path, location));

            /* ---------- PARENT WITH CHILDREN ---------- */
            if (hasChildren) {
              return (
                <SidebarGroup key={parent.id} className="mb-1 p-0">
                  <Collapsible open={isOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        onClick={() =>
                          setOpenParent(isOpen ? null : parent.id)
                        }
                        className={`relative w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200
                        ${parentActive
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-semibold"
                            : "hover:bg-muted/60 text-sidebar-foreground"}
                        group-data-[collapsible=icon]:justify-center
                        group-data-[collapsible=icon]:pointer-events-none
                      `}
                      >
                        {/* Active vertical indicator */}
                        {isOpen && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-blue-600 dark:bg-blue-400 rounded-r
                          group-data-[collapsible=icon]:hidden
                        " />
                        )}

                        <span className="flex items-center gap-3
                        group-data-[collapsible=icon]:justify-center
                      ">
                          <i className={`${parent.icon} text-lg shrink-0`} />

                          <span className="text-sm font-medium truncate
                          group-data-[collapsible=icon]:hidden
                        ">
                            {parent.title}
                          </span>
                        </span>

                        <i
                          className={`ri-arrow-right-s-line ml-auto text-base transition-transform duration-200
                          ${isOpen ? "rotate-90 text-blue-600 dark:text-blue-400" : "text-muted-foreground"}
                          group-data-[collapsible=icon]:hidden
                        `}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu className="ml-3.5 border-l-2 border-blue-500/20 dark:border-blue-400/20 pl-2.5 mt-1 space-y-1">
                          {children.map((child) => (
                            <SidebarMenuItem key={child.id}>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive(child.path, location)}
                                className="h-8 px-2.5 rounded-md hover:bg-muted/50"
                              >
                                <NavLink to={child.path} className="flex items-center gap-2.5 w-full">
                                  <i className={`${child.icon} text-base shrink-0`} />
                                  <span className="text-sm truncate">
                                    {child.title}
                                  </span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarGroup>
              );
            }

            /* ---------- PARENT WITHOUT CHILDREN ---------- */
            return (
              <SidebarGroup key={parent.id} className="mb-1 p-0">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(parent.path, location)}
                      className="h-9 px-3 rounded-lg group-data-[collapsible=icon]:justify-center hover:bg-muted/60"
                    >
                      <NavLink to={parent.path} className="flex items-center gap-3 w-full">
                        <i className={`${parent.icon} text-lg shrink-0`} />
                        <span className="text-sm font-medium truncate
                        group-data-[collapsible=icon]:hidden
                      ">
                          {parent.title}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            );
          })}
        </SidebarContent>
      </ScrollArea>

      <SidebarFooter className="p-3 border-t border-sidebar-border/30 group-data-[collapsible=icon]:hidden">
        <div className="text-[10px] text-muted-foreground text-center leading-tight">
          &copy; 2026 School Management System <br />
          <b className='text-primary tracking-wider'>MITHILESH INFODATASOFT CAREER RESEARCH ORGANISATION Pvt. Ltd.</b>
        </div>
      </SidebarFooter>

    </Sidebar>
  );
}