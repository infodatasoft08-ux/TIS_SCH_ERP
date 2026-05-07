import API from '@/api';
import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import 'remixicon/fonts/remixicon.css';


function isRouteActive(to, currentPath, currentSearch) {
  if (!to) return false;
  let targetPath = to;
  let targetSearch = '';

  if (typeof to === 'string') {
    const qIndex = to.indexOf('?');
    if (qIndex >= 0) {
      targetPath = to.substring(0, qIndex);
      targetSearch = to.substring(qIndex); // includes ?
    }
  } else if (typeof to === 'object' && to.pathname) {
    targetPath = to.pathname;
    targetSearch = to.search || '';
  }

  if (targetSearch) {
    return currentPath === targetPath && currentSearch === targetSearch;
  }
  return currentPath === targetPath && (currentSearch === '' || currentSearch === null);
}

function LinkItem({ to, children, classNameBase = '', onClick }) {
  const location = useLocation();
  const active = isRouteActive(to, location.pathname, location.search || '');
  const activeClass = 'bg-blue-50 text-blue-600';
  const base = 'block px-3 py-2 rounded text-sm';
  const classes = `${base} ${active ? activeClass : 'hover:bg-gray-50'} ${classNameBase}`;

  return (
    <NavLink to={to} className={classes} end onClick={onClick}>
      {children}
    </NavLink>
  );
}

export default function Sidebar({ user }) {
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [activeMenus, setActiveMenus] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // const [Menu, setMENU] = useState([]); // flat array from API

  const [Menu, setMENU] = useState(() => {
    // Try to load from localStorage on initial render
    const cached = localStorage.getItem('sidebar_menu');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // helper: whether user can see item (future-proof: supports permissions array)
  const allowed = (item) => {
    if (!item) return false;
    if (!item.permissions) return true;
    // support both numeric and string role identifiers
    const roleVal = user?.role_id ?? user?.role;
    return item.permissions.includes(roleVal) || item.permissions.includes(String(roleVal));
  };

  // fetch menus (flat) from API
  // useEffect(() => {
  //   let mounted = true;
  //   async function fetchMenus() {
  //     setLoading(true);
  //     setError(null);
  //     try {
  //       const token = (user && user.token) || localStorage.getItem('token');
  //       if (!token) throw new Error('No auth token found. Please login.');

  //       const res = await API.get('/getmenu/menus', {
  //         headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  //       });

  //       const flat = (res && res.data && res.data.results) ? res.data.results : [];
  //       if (!mounted) return;
  //       setMENU(flat);
  //     } catch (err) {
  //       console.error('Error fetching menus:', err);
  //       if (mounted) setError(err.message || 'Failed to load menus');
  //     } finally {
  //       if (mounted) setLoading(false);
  //     }
  //   }
  //   fetchMenus();
  //   return () => { mounted = false; };
  // }, [user && (user.token || user.accessToken)]);

  // Memoized fetch function
  const fetchMenus = useCallback(async () => {
    const currentToken = (user && user.token) || localStorage.getItem('token');
    if (!currentToken) return;

    // Check cache first
    const cacheKey = `sidebar_menu_${currentToken}`;
    const cached = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    
    // Use cache if it's less than 5 minutes old
    if (cached && cachedTimestamp) {
      const age = Date.now() - parseInt(cachedTimestamp);
      if (age < 5 * 60 * 1000) { // 5 minutes
        try {
          setMENU(JSON.parse(cached));
          return;
        } catch (e) {
          // Cache corrupted, fetch fresh
        }
      }
    }

    try {
      const res = await API.get('/getmenu/menus', {
        headers: { 
          Authorization: `Bearer ${currentToken}`, 
          'Content-Type': 'application/json' 
        }
      });

      const flat = (res && res.data && res.data.results) ? res.data.results : [];
      setMENU(flat);
      
      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify(flat));
      localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
    } catch (err) {
      console.error('Error fetching menus:', err);
    }
  }, [user?.token, user?.accessToken]);

  // Fetch menus only when token changes
  useEffect(() => {
    fetchMenus();
  }, []);


  // determine open parents based on current route
  useEffect(() => {
    const currentPath = location.pathname;
    const currentSearch = location.search || '';
    const newActive = {};

    // for each root (parent_id === null), check if it or any child matches
    Menu.forEach((item) => {
      if (item.parent_id !== null) return; // only consider parents
      if (!allowed(item)) return;

      const parentMatches = item.path && isRouteActive(item.path, currentPath, currentSearch);

      // children are those with parent_id === item.id
      const children = Menu.filter((m) => m.parent_id === item.id && allowed(m));
      const childMatches = children.some((c) => isRouteActive(c.path, currentPath, currentSearch));

      if (parentMatches || childMatches) {
        newActive[item.key_name || item.id] = true; // use key_name as identifier if available
      }
    });

    setActiveMenus((prev) => ({ ...prev, ...newActive }));
  }, [location, Menu, user]);

  const toggleMenu = (key) => setActiveMenus((prev) => ({ ...prev, [key]: !prev[key] }));

  // helper for rendering children for a given parent
  const childrenOf = (parentId) => Menu.filter((m) => m.parent_id === parentId && allowed(m));

  return (
    <>
      {/* Mobile topbar */}
      <div className="md:hidden bg-white border-b px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen((v) => !v)} className="p-2 rounded hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="font-semibold">School</div>
        </div>
        <div className="text-sm text-gray-600">Hi, {user.name}</div>
      </div>

      {/* Desktop Aside */}
      <aside className={`bg-white border-r hidden md:flex flex-col transition-all duration-200 ${open ? 'w-64' : 'w-16'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          {open ? (
            <>
              <div className="font-bold text-lg">School Admin</div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                </svg>
              </button>
            </>
          ) : (
            <button onClick={() => setOpen(true)} className="p-2 rounded hover:bg-gray-100 mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-auto p-2" style={{ height: 'calc(95vh - 72px)' }}>
          {/* iterate root menus (parent_id === null) */}
          {Menu.filter((m) => m.parent_id === null).map((item) => {
            if (!allowed(item)) return null;
            const kids = childrenOf(item.id);

            const parentActive = (item.path && isRouteActive(item.path, location.pathname, location.search || ''))
              || (kids.some((c) => isRouteActive(c.path, location.pathname, location.search || '')));

            if (kids.length > 0) {
              return (
                <div key={item.id} className="mb-1 relative group">
                  <div
                    className={`flex items-center ${
                      open ? "justify-start" : "justify-center"
                    }`}
                  >
                    <button
                      onClick={() =>
                        open ? toggleMenu(item.key_name || item.id) : null
                      }
                      className={`flex items-center w-full px-3 py-2 rounded transition-colors ${
                        parentActive
                          ? "bg-blue-50 text-blue-600"
                          : "hover:bg-gray-50"
                      }`}
                      aria-expanded={!!activeMenus[item.key_name || item.id]}
                    >
                      <i
                        className={`${item.icon}`}
                      ></i>
                      {open && (
                        <span className="pl-5 text-sm flex-1 text-left">
                          {item.title}
                        </span>
                      )}
                      {open && (
                        <svg
                          className={`w-4 h-4 transform ${
                            activeMenus[item.key_name || item.id]
                              ? "rotate-90"
                              : ""
                          }`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Submenu when expanded */}
                  {open && (
                    <div
                      className={`pl-10 mt-1 ${
                        activeMenus[item.key_name || item.id]
                          ? "block"
                          : "hidden"
                      }`}
                    >
                      {kids.map((sub) => (
                        <LinkItem
                          key={sub.id}
                          to={sub.path || "#"}
                          classNameBase="pl-1"
                        >
                          {sub.title}
                        </LinkItem>
                      ))}
                    </div>
                  )}

                  {/* Tooltip-style submenu when collapsed */}
                  {!open && (
                    <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-white shadow-lg border rounded w-48 py-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-50">
                      <div className="py-1 font-semibold text-gray-700 border-b px-3">
                        {item.title}
                      </div>
                      {kids.map((sub) => (
                        <LinkItem
                          key={sub.id}
                          to={sub.path || "#"}
                          classNameBase="block px-3 py-2 hover:bg-gray-100"
                        >
                          {sub.title}
                        </LinkItem>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // single item (no children)
            return (
              <div key={item.id} className="mb-1">
                <div
                  className={`flex items-center ${
                    open ? "justify-start" : "justify-center"
                  }`}
                >
                  <LinkItem
                    to={item.path || "#"}
                    classNameBase={`flex items-center w-full px-2 py-2 ${
                      open ? "" : "justify-center"
                    }`}
                  >
                    {/* <Icon d={item.icon} /> */}
                    <i
                      className={`${item.icon}`}
                    ></i>
                    {open && <span className=" pl-5 text-sm">{item.title}</span>}
                  </LinkItem>
                </div>
              </div>
            );
          })}
        </nav>

        {open && <div className="p-3 border-t text-xs text-gray-500">© School</div>}
      </aside>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-40 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black opacity-30 ${mobileOpen ? 'block' : 'hidden'}`} onClick={() => setMobileOpen(false)} />
        <div className={`absolute left-0 top-0 bottom-0 bg-white w-72 shadow-lg transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform`}>
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold">School</div>
            <button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-gray-100">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="p-3 overflow-auto" style={{ height: 'calc(100vh - 72px)' }}>
            {Menu.filter((m) => m.parent_id === null).map((item) => {
              if (!allowed(item)) return null;
              const kids = childrenOf(item.id);

              const parentActive = (item.path && isRouteActive(item.path, location.pathname, location.search || ''))
                || (kids.some((c) => isRouteActive(c.path, location.pathname, location.search || '')));

              if (kids.length > 0) {
                return (
                  <div key={item.id} className="mb-1">
                    <button
                      onClick={() => toggleMenu(item.key_name || item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left ${
                        parentActive
                          ? "bg-blue-50 text-blue-600"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {/* <Icon d={item.icon} /> */}
                      <i
                        className={`${item.icon}`}
                      ></i>
                      <span className="flex-1">{item.title}</span>
                      <svg
                        className={`w-4 h-4 transform ${
                          activeMenus[item.key_name || item.id]
                            ? "rotate-90"
                            : ""
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                      >
                        <path
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    <div
                      className={`pl-9 mt-1 ${
                        activeMenus[item.key_name || item.id]
                          ? "block"
                          : "hidden"
                      }`}
                    >
                      {kids.map((sub) => (
                        <LinkItem
                          key={sub.id}
                          to={sub.path || "#"}
                          onClick={() => setMobileOpen(false)}
                        >
                          {sub.title}
                        </LinkItem>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <LinkItem
                  key={item.id}
                  to={item.path || "#"}
                  onClick={() => setMobileOpen(false)}
                  classNameBase="flex items-center gap-3"
                >
                  <span className="flex items-center gap-3">
                    {/* <Icon d={item.icon} /> */}
                    <i className={`${item.icon}`}></i>
                    <span>{item.title}</span>
                  </span>
                </LinkItem>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}