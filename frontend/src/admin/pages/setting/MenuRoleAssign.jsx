import API from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import React, { useEffect, useState } from 'react';

// RoleMenuAdmin.jsx (JSX)
// Admin page to view roles and assign menus to a role.
// Tailwind CSS styles assumed. Mount at an admin route and protect with your auth middleware.

export default function RoleMenuAdmin() {
  const [roles, setRoles] = useState([]);
  const [menusTree, setMenusTree] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [assignedMenuIds, setAssignedMenuIds] = useState(new Set());
  const [initialAssignedMenuIds, setInitialAssignedMenuIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const [rolesRes, menusRes] = await Promise.all([
        // API.get('/getmenu/menus'),
        API.get('/getmenu/get/allroles'),
        API.get('/getmenu/get/menus/tree')
      ]);
      setRoles(rolesRes.data.roles || []);
      // console.log("rolesRes:", rolesRes);
      setMenusTree(menusRes.data.tree || []);
      // console.log("menusRes: ", menusRes);

      // console.log(`rolesRes length: ${rolesRes.data.roles?.length}`);
      if (rolesRes.data.roles?.length) {
        selectRole(rolesRes.data.roles[0].id);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load roles or menus' });
    } finally {
      setLoading(false);
    }
  }

  async function selectRole(roleId) {
    setSelectedRoleId(roleId);
    setMessage(null);
    setLoading(true);
    try {
      const res = await API.get(`/getmenu/get/roles/${roleId}/menus`);
      const menuIds = (res.data.menus || []).map(m => m.id);
      setAssignedMenuIds(new Set(menuIds));
      setInitialAssignedMenuIds(new Set(menuIds));
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load assigned menus for role' });
    } finally {
      setLoading(false);
    }
  }

  function toggleLocalMenu(menuId) {
    setAssignedMenuIds(prev => {
      const s = new Set(prev);
      if (s.has(menuId)) s.delete(menuId); else s.add(menuId);
      return s;
    });
  }

  async function saveAssignments() {
    if (!selectedRoleId) return;
    setSaving(true);
    setMessage(null);
    try {
      //   const menuIds = Array.from(assignedMenuIds);
      const res = await API.post(`/getmenu/assign/roles/${selectedRoleId}/menus?replace=1`, {
        menu_ids: Array.from(assignedMenuIds)
      });
      setInitialAssignedMenuIds(new Set(assignedMenuIds));
      setMessage({ type: 'success', text: 'Assignments saved' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save assignments' });
    } finally {
      setSaving(false);
    }
  }

  function cancelChanges() {
    setAssignedMenuIds(new Set(initialAssignedMenuIds));
    setMessage(null);
  }

  // render a menu node (recursive)
  function renderMenuNode(node, depth = 0) {
    const checked = assignedMenuIds.has(node.id);
    return (
      <div key={node.id} className="mb-2">
        <div 
          onClick={() => toggleLocalMenu(node.id)}
          className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors border border-transparent hover:border-primary/10"
        >
          <div className="flex items-center gap-3">
            <div className={`text-sm ${depth === 0 ? 'font-semibold' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              {node.title}
            </div>
            {node.path ? (
              <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {node.path}
              </div>
            ) : null}
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={checked}
              onCheckedChange={() => toggleLocalMenu(node.id)}
            />
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="ml-6 mt-2 border-l-2 pl-4 border-gray-100 dark:border-gray-800">
            {node.children.map(child => renderMenuNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 min-h-screen bg-gray-50/50 dark:bg-inherit">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Role Access Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage menu access permissions for different roles</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {message && (
              <div
                className={`px-4 py-1.5 rounded-full text-sm font-medium animate-in fade-in zoom-in-95 duration-200 ${
                  message.type === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {message.text}
              </div>
            )}
            <Button
              onClick={() => fetchInitialData()}
              variant="outline"
              className="bg-background shadow-sm"
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="col-span-1 lg:col-span-4 shadow-sm border-border/50 lg:h-[calc(100vh-12rem)] min-h-[400px] flex flex-col">
            <CardHeader className="pb-3 px-5 pt-5">
              <CardTitle className="text-lg">Roles</CardTitle>
              <CardDescription>
                Select a role to view assigned menus.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto px-3 pb-5">
              {loading ? (
                <div className="text-sm text-muted-foreground px-2">Loading roles...</div>
              ) : (
                <div className="space-y-1">
                  {roles.map((role) => (
                    <Button
                      key={role.id}
                      onClick={() => selectRole(role.id)}
                      variant={selectedRoleId === role.id ? "secondary" : "ghost"}
                      className={`w-full justify-start px-3 py-6 h-auto transition-all ${
                        selectedRoleId === role.id
                          ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium"
                          : "hover:bg-muted font-normal text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <span className="text-base truncate pr-2">
                          {role.role_name}
                        </span>
                        {selectedRoleId === role.id && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 lg:col-span-8 shadow-sm border-border/50 lg:h-[calc(100vh-12rem)] min-h-[500px] flex flex-col">
            <CardHeader className="pb-4 px-5 pt-5 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Menu Access
                  {selectedRoleId && (
                    <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                      Editing
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  Toggle switch to grant or revoke access.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={cancelChanges}
                  disabled={saving || !selectedRoleId}
                  variant="outline"
                  size="sm"
                  className="h-9"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveAssignments}
                  disabled={!selectedRoleId || saving}
                  variant="default"
                  size="sm"
                  className="h-9"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
              {!selectedRoleId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-gray-50/50 dark:bg-background/50">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                  </div>
                  <p className="font-medium text-foreground">No Role Selected</p>
                  <p className="text-sm mt-1 max-w-sm">Please select a role from the sidebar to manage its menu access permissions.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-5">
                  {menusTree.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8">No menus found in the system.</div>
                  ) : (
                    <div className="max-w-3xl">
                      {menusTree.map((node) => renderMenuNode(node))}
                    </div>
                  )}
                </div>
              )}
              
              {selectedRoleId && (
                <div className="bg-muted/30 border-t border-border/50 px-5 py-3 text-xs text-muted-foreground flex justify-between items-center">
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                      Assigned: <span className="font-medium text-foreground">{assignedMenuIds.size}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30"></div>
                      Original: <span className="font-medium text-foreground">{initialAssignedMenuIds.size}</span>
                    </span>
                  </div>
                  {assignedMenuIds.size !== initialAssignedMenuIds.size && (
                    <span className="text-amber-500 font-medium animate-pulse">Unsaved changes</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}