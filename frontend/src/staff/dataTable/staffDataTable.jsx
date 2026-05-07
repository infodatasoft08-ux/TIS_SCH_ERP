import React, { useEffect, useState } from "react";
import API from "@/api";

// shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { FileDown, FilePen, FileUp, IdCardLanyardIcon, Trash2 } from "lucide-react"; // Added missing imports
// import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import DataTable from "@/widgets/DataTable";
// import toast from "react-hot-toast";
import { toast } from "sonner";
import AddStaffDialog from "../form/addStaffForm";
import BulkImportDialog from "@/pages/BulkImportDialog";
import { exportToCSV, exportToExcel, exportToPDF } from "@/utils/exportHelper";
import DetailsDialog from "@/components/DetailsDialog";
import { User, Mail, Phone, Calendar, Briefcase, GraduationCap, Eye, MapPin, Shield } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function StaffOperation() {
  const [staffs, setStaffs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [dialogKey, setDialogKey] = useState(Date.now());
  const EXCLUDED_ROLE_IDS = [2, 1, 5, 3];
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewData, setViewData] = useState(null);

  // Pagination states
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Load staff and roles
  async function loadStaff(reset = false, newOffset = offset, newLimit = limit, newSearch = search) {
    if (reset) {
      setIsLoading(true);
      newOffset = 0;
      setHasMore(true);
    } else {
      setIsLoading(true); // Always show loading when changing pages
    }

    try {
      const [staffRes, rolesRes] = await Promise.all([
        API.get(`/staffUser/get/staff?limit=${newLimit}&offset=${newOffset}&q=${newSearch}`),
        reset ? API.get("getmenu/get/allroles") : Promise.resolve({ data: { roles: roles } })
      ]);

      const newStaffs = staffRes.data.users || [];

      // Filter out excluded roles only if we're fetching them (reset=true)
      // Always replace the data for the current page
      setStaffs(newStaffs);

      if (reset) {
        const filteredRoles = (rolesRes.data.roles || []).filter(
          role => !EXCLUDED_ROLE_IDS.includes(role.id)
        );
        setRoles(filteredRoles);
      }

      setHasMore(newStaffs.length === newLimit);
      setOffset(newOffset);
      setLimit(newLimit);
      setSearch(newSearch);

    } catch (err) {
      const msg = err.response?.data?.error || "Failed to load data";
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }

  const handleNextPage = () => {
    if (hasMore) loadStaff(false, offset + limit, limit, search);
  };

  const handlePrevPage = () => {
    if (offset >= limit) loadStaff(false, offset - limit, limit, search);
  };

  const handleSearch = (newSearchTerm) => {
    loadStaff(true, 0, limit, newSearchTerm);
  };

  const handlePageSizeChange = (newSize) => {
    loadStaff(true, 0, newSize, search);
  };

  const currentPage = Math.floor(offset / limit) + 1;

  useEffect(() => {
    loadStaff(true);
  }, []);

  // Delete staff
  async function deleteStaff(id) {
    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
      await API.delete(`/staffUser/delete/staff/${id}`);
      toast.success("Staff deleted successfully");
      loadStaff(true);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to delete Staff";
      toast.error(msg);
    }
  }

  // Open edit dialog
  function openEditDialog(staff) {
    console.log("Opening edit dialog with teacher:", staff);
    setSelectedStaff(staff);
    setDialogKey(Date.now());
    setIsDialogOpen(true);
  }

  // Open add dialog
  function openAddDialog() {
    console.log("Opening add dialog");
    setSelectedStaff(null);
    setDialogKey(Date.now());
    setIsDialogOpen(true);
  }

  // Close dialog
  function handleDialogClose() {
    setIsDialogOpen(false);
    setTimeout(() => setSelectedStaff(null), 100);
  }

  const handleExport = (type) => {
    if (staffs.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = staffs.map(s => ({
      "Employee Code": s.employee_code,
      "Staff Name": s.user_name,
      "Email": s.user_email,
      "Hire Date": s.hire_date,
      "Qualification": s.qualification,
      "Department": s.department,
    }));

    if (type === 'excel') exportToExcel(exportData, 'Staff_List');
    if (type === 'csv') exportToCSV(exportData, 'Staff_List');
    if (type === 'pdf') {
      const columns = [
        { header: 'Employee Code', dataKey: 'Employee Code' },
        { header: 'Staff Name', dataKey: 'Staff Name' },
        { header: 'Email', dataKey: 'Email' },
        { header: 'Hire Date', dataKey: 'Hire Date' },
        { header: 'Qualification', dataKey: 'Qualification' },
        { header: 'Department', dataKey: 'Department' },
      ];
      exportToPDF(columns, exportData, 'Staff List', 'staff_list');
    }
  };

  const staffColumns = React.useMemo(
    () => [
      {
        accessorKey: "user_avatar_url",
        header: "Photo",
        cell: ({ row }) => (
          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
            {row.getValue("user_avatar_url") ? (
              <img
                src={row.getValue("user_avatar_url")}
                alt={row.getValue("user_name")}
                className="h-full w-full object-cover"
                onError={(e) => { e.target.src = "/default-avatar.png"; }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400 font-bold">
                {row.getValue("user_name")?.charAt(0) || "ST"}
              </div>
            )}
          </div>
        )
      },
      {
        accessorKey: "employee_code",
        header: "Employee Code",
        cell: ({ row }) => <div>{row.getValue("employee_code") || "-"}</div>
      },
      {
        accessorKey: "user_name", // This should match your data structure
        header: "Staff Name",
        cell: ({ row }) => <div>{row.getValue("user_name") || "-"}</div>
      },
      {
        accessorKey: "user_email",
        header: "Email",
        cell: ({ row }) => <div>{row.getValue("user_email") || "-"}</div>
      },
      {
        accessorKey: "hire_date",
        header: "Hire Date",
        cell: ({ row }) => {
          const dateValue = row.getValue("hire_date");

          if (!dateValue) return <div>-</div>;

          // const date = new Date(dateValue);

          // // Format 1: Simple readable date
          // const formattedDate = date.toLocaleDateString("en-US", {
          //   year: "numeric",
          //   month: "long",
          //   day: "numeric"
          // });

          if (!dateValue) return <div>-</div>;
          return <div>{new Date(dateValue).toLocaleDateString("en-GB")}</div>;

          // Format 2: With time
          // const formattedDate = date.toLocaleString('en-US', {
          //   year: 'numeric',
          //   month: 'short',
          //   day: 'numeric',
          //   hour: '2-digit',
          //   minute: '2-digit'
          // });

          // return <div>{formattedDate}</div>;
        }
      },
      {
        accessorKey: "qualification",
        header: "Qualification",
        cell: ({ row }) => <div>{row.getValue("qualification") || "-"}</div>
      },
      {
        accessorKey: "department",
        header: "Department",
        cell: ({ row }) => <div>{row.getValue("department") || "-"}</div>
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const staff = row.original;

          return (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-emerald-50 text-emerald-700 rounded-full"
                onClick={() => {
                  setViewData(staff);
                  setViewDialogOpen(true);
                }}
              >
                <Eye className="h-4 w-4" />
                <span className="ml-1">View</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-blue-50 text-blue-700 rounded-full"
                onClick={() => {
                  console.log("Staff data being passed:", staff);
                  // openTeacherDialog(teacher);
                  openEditDialog(staff);
                }}
              >
                <FilePen className="h-4 w-4" />
                <span className="ml-1">Update</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-red-50 text-red-700"
                onClick={() => deleteStaff(staff.staff_id)} // Fixed to use _id
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        }
      }
    ],
    []
  );


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 shadow-lg text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Staff Management</h1>
            <p className="mt-2 text-blue-100/90 text-lg max-w-xl">
              Manage Staff members, assign roles, and view profiles.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setBulkOpen(true)}
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <FileUp className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('excel')}>Export to Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>Export to CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>Export to PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === "error" ? "bg-red-200" : "bg-green-200"
          }`}
        >
          {message.text}
        </div>
      )} */}

      {/* SINGLE Class CARD - COLLAPSIBLE */}
      <div className="px-2 md:px-6 max-w-7xl mx-auto">
        <Card className="border-0 shadow-none">
          <CardContent className="pt-6">
            {/* {isTeacherLoading ? (
                <div className="text-center py-8">Loading Teachers...</div>
              ) : ( */}
            <>

              <DataTable
                data={staffs}
                columns={staffColumns}
                title="Staff"
                description="Manage all staffs in your institution"
                isLoading={isLoading}
                addButtonText="Add Staff"
                enableSearch={true}
                searchPlaceholder="Search Staff..."
                enableColumnVisibility={true}
                enablePagination={true}
                pageSize={limit}
                onAddNew={openAddDialog}
                onRowClick={(staffitem) => {
                  setViewData(staffitem);
                  setViewDialogOpen(true);
                }}
                emptyMessage="No staffs found. Click 'Add Staff' to create one."
                hasMore={hasMore}
                serverSidePagination={true}
                currentPage={currentPage}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                onSearch={handleSearch}
                onPageSizeChange={handlePageSizeChange}
                onViewMobile={(staff) => {
                  setViewData(staff);
                  setViewDialogOpen(true);
                }}
                onEditMobile={(staff) => openEditDialog(staff)}
                onDeleteMobile={(staff) => deleteStaff(staff.staff_id)}
                onRefresh={loadStaff}
              />
            </>
            {/* )} */}
          </CardContent>
        </Card>
      </div>
      {/* </div> */}

      {/* CLASS DIALOG */}

      {/* Add/Edit Teacher Dialog */}
      <AddStaffDialog
        // key={dialogKey}
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        staffToEdit={selectedStaff}
        onSuccess={loadStaff}
        roles={roles}
      />

      <BulkImportDialog
        open={bulkOpen}
        setOpen={setBulkOpen}
        importType="staff"
        refreshTable={loadStaff}
      />

      <DetailsDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        title="Staff Profile"
        data={viewData}
        image={viewData?.user_avatar_url}
        fields={[
          { icon: User, label: "Full Name", key: "user_name" },
          { icon: Shield, label: "Employee Code", key: "employee_code" },
          { icon: Mail, label: "Email Address", key: "user_email" },
          { icon: IdCardLanyardIcon, label: "Aadhar Number", key: "user_adhar_no" },
          { icon: Briefcase, label: "Department", key: "department" },
          { icon: GraduationCap, label: "Qualification", key: "qualification" },
          { icon: GraduationCap, label: "Bio", key: "bio" },
          { icon: Calendar, label: "Hire Date", value: viewData?.hire_date ? new Date(viewData.hire_date).toLocaleDateString() : "-" },
          { icon: Phone, label: "Phone Number", key: "user_phone" },
          { icon: MapPin, label: "Address", key: "user_address" },
        ]}
      />
    </div>
  );
}