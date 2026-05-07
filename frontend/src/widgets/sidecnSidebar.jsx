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

      // Check if we have cached menu
      const cachedMenu = localStorage.getItem('sidebar_menu');
      const cacheTimestamp = localStorage.getItem('sidebar_menu_timestamp');

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
      // Cache the menu
      localStorage.setItem('sidebar_menu', JSON.stringify(menuData));
      localStorage.setItem('sidebar_menu_timestamp', Date.now().toString());
    } catch {
      console.error("Error fetching menu:", error);
      // If fetch fails, try to use cached data
      const cachedMenu = localStorage.getItem('sidebar_menu');
      if (cachedMenu) {
        setMenu(JSON.parse(cachedMenu));
      }
    } finally {
      setIsLoading(false);
    }

  }, [user?.token]);



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
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "4rem",
        }}
      >
        {/* HEADER SKELETON */}
        <SidebarHeader className="px-2 py-5 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />

            <div className="flex flex-col gap-2 group-data-[collapsible=icon]:hidden">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </SidebarHeader>

        {/* MENU SKELETON */}
        <SidebarContent className="px-2 py-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-2 py-2 rounded-md"
            >
              {/* icon */}
              <Skeleton className="h-5 w-5 rounded" />

              {/* text */}
              <Skeleton className="h-4 w-32 group-data-[collapsible=icon]:hidden" />
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
        "--sidebar-width": "16rem",
        "--sidebar-width-icon": "4rem",
        backgroundColor: theme === 'light' ? 'var(--app-sidebar-bg)' : undefined
      }}
    >
      <SidebarHeader className="px-2 py-4 border-b border-sidebar-border/50">
        <div className="flex flex-col items-center gap-3 overflow-hidden">
          <div className="flex w-full shrink-0 items-center justify-center rounded-lg text-primary group-data-[collapsible=icon]:mx-auto">
            {logo ? (
              <img src={logo.image_url} alt="Logo" className=" w-32 object-contain" />
            ) : (
              <School className="h-6 w-6" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold leading-none truncate text-sidebar-foreground">
              {schoolName}
            </span>
            <span className="text-[12px] text-right text-muted-foreground tracking-wider font-semibold">
              Destiny for Excellence
            </span>
          </div>
        </div>
      </SidebarHeader>

      <ScrollArea className="max-h-[calc(100vh-100px)]">
        <SidebarContent className="px-2">
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
                <SidebarGroup key={parent.id} className="mb-1">
                  <Collapsible open={isOpen}>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        onClick={() =>
                          setOpenParent(isOpen ? null : parent.id)
                        }
                        className={`relative w-full flex items-center px-2 py-2 rounded-md
                        ${parentActive
                            ? "bg-blue-50 text-blue-600"
                            : ""}
                        group-data-[collapsible=icon]:justify-center
                        group-data-[collapsible=icon]:pointer-events-none
                      `}
                      >
                        {/* Active vertical indicator */}
                        {isOpen && (
                          <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-600 rounded-r
                          group-data-[collapsible=icon]:hidden
                        " />
                        )}

                        <span className="flex items-center gap-3
                        group-data-[collapsible=icon]:justify-center
                      ">
                          <i className={`${parent.icon} text-lg`} />

                          <span className="text-sm font-medium truncate
                          group-data-[collapsible=icon]:hidden
                        ">
                            {parent.title}
                          </span>
                        </span>

                        <i
                          className={`ri-arrow-right-s-line ml-auto transition-transform
                          ${isOpen ? "rotate-90" : ""}
                          group-data-[collapsible=icon]:hidden
                        `}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarGroupContent>
                        <SidebarMenu className="ml-4 border-l border-blue-100 pl-3 mt-1 space-y-0.5">
                          {children.map((child) => (
                            <SidebarMenuItem key={child.id}>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive(child.path, location)}
                                className="h-8 px-2"
                              >
                                <NavLink to={child.path}>
                                  <i className={`${child.icon} text-base`} />
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
              <SidebarGroup key={parent.id} className="mb-1">
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(parent.path, location)}
                      className="h-9 px-2 group-data-[collapsible=icon]:justify-center"
                    >
                      <NavLink to={parent.path}>
                        <i className={`${parent.icon} text-lg`} />
                        <span className="text-sm truncate
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


    </Sidebar>
  );
}