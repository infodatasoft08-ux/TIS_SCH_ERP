import React, { useEffect, useState } from "react";
import API from "@/api";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// shadcn components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { ChevronDown, ArrowUpDown, FilePen, Trash2, Check, ChevronsUpDown, FileDown, FileUp, Shield, MapPin, IdCardLanyardIcon } from "lucide-react"; // Added missing imports
// import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import DataTable from "@/widgets/DataTable";
// import toast from "react-hot-toast";
import { toast } from "sonner";
import AddTeacherDialog from "@/teacher/Forms/pages/AddTeachers";
import BulkImportDialog from "@/pages/BulkImportDialog";
import { exportToCSV, exportToExcel, exportToPDF } from "@/utils/exportHelper";
import DetailsDialog from "@/components/DetailsDialog";
import { User, Mail, Phone, Calendar, Briefcase, GraduationCap, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function TeachersOperation() {
  const [teachers, setTeachers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [dialogKey, setDialogKey] = useState(Date.now());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewData, setViewData] = useState(null);

  // Pagination states
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Load teachers and roles
  async function loadTeachers(reset = false, newOffset = offset, newLimit = limit, newSearch = search) {
    if (reset) {
      setIsLoading(true);
      newOffset = 0;
      setHasMore(true);
    } else {
      setIsLoading(true); // Always show loading when changing pages
    }

    try {
      const [teachersRes, rolesRes] = await Promise.all([
        API.get(`/teachers/get/teacher?limit=${newLimit}&offset=${newOffset}&q=${newSearch}`),
        // Roles don't need pagination for our dialogs, so just fetch once or return prev
        reset ? API.get("getmenu/get/allroles") : Promise.resolve({ data: { roles: roles } })
      ]);

      const newTeachers = teachersRes.data.teachers || [];

      // Always replace the data for the current page
      setTeachers(newTeachers);
      if (reset) {
        setRoles(rolesRes.data.roles || []);
      }

      setHasMore(newTeachers.length === newLimit);
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
    if (hasMore) loadTeachers(false, offset + limit, limit, search);
  };

  const handlePrevPage = () => {
    if (offset >= limit) loadTeachers(false, offset - limit, limit, search);
  };

  const handleSearch = (newSearchTerm) => {
    loadTeachers(true, 0, limit, newSearchTerm);
  };

  const handlePageSizeChange = (newSize) => {
    loadTeachers(true, 0, newSize, search);
  };

  const currentPage = Math.floor(offset / limit) + 1;

  useEffect(() => {
    loadTeachers(true);
  }, []);

  // Delete teacher
  async function deleteTeacher(id) {
    if (!confirm("Are you sure you want to delete this teacher?")) return;

    try {
      await API.delete(`/teachers/delete/teacher/${id}`);
      toast.success("Teacher deleted successfully");
      loadTeachers(true);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to delete teacher";
      toast.error(msg);
    }
  }

  // Open edit dialog
  function openEditDialog(teacher) {
    console.log("Opening edit dialog with teacher:", teacher);
    setSelectedTeacher(teacher);
    setDialogKey(Date.now());
    setIsDialogOpen(true);
  }

  // Open add dialog
  function openAddDialog() {
    console.log("Opening add dialog");
    setSelectedTeacher(null);
    setDialogKey(Date.now());
    setIsDialogOpen(true);
  }

  // Close dialog
  function handleDialogClose() {
    setIsDialogOpen(false);
    setTimeout(() => setSelectedTeacher(null), 100);
  }

  const handleExport = (type) => {
    if (teachers.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = teachers.map(s => ({
      "Employee Code": s.employee_code,
      "Teacher Name": s.user_name,
      "Email": s.user_email,
      "Qualification": s.qualification,
      "Hire Date": new Date(s.hire_date).toLocaleDateString(),
    }));

    if (type === 'excel') exportToExcel(exportData, 'Teachers_List');
    if (type === 'csv') exportToCSV(exportData, 'Teachers_List');
    if (type === 'pdf') {
      const columns = [
        { header: 'Employee Code', dataKey: 'Employee Code' },
        { header: 'Teacher Name', dataKey: 'Teacher Name' },
        { header: 'Email', dataKey: 'Email' },
        { header: 'Qualification', dataKey: 'Qualification' },
        { header: 'Hire Date', dataKey: 'Hire Date' }
      ];
      exportToPDF(columns, exportData, 'Teachers List', 'teachers_list');
    }
  };

  const teacherColumns = React.useMemo(
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
                {row.getValue("user_name")?.charAt(0) || "T"}
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
        header: "Teacher Name",
        cell: ({ row }) => <div>{row.getValue("user_name") || "-"}</div>
      },
      {
        accessorKey: "user_email",
        header: "Email",
        cell: ({ row }) => <div>{row.getValue("user_email") || "-"}</div>
      },
      // {
      //   accessorKey: "phone",
      //   header: "Phone",
      //   cell: ({ row }) => <div>{row.getValue("phone") || "-"}</div>,
      // },
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
      // {
      //   accessorKey: "bio",
      //   header: "Bio",
      //   cell: ({ row }) => <div>{row.getValue("bio") || "-"}</div>,
      // },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const teacher = row.original;

          return (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-emerald-50 text-emerald-700 rounded-full"
                onClick={() => {
                  setViewData(teacher);
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
                  console.log("Teacher data being passed:", teacher);
                  // openTeacherDialog(teacher);
                  openEditDialog(teacher);
                }}
              >
                <FilePen className="h-4 w-4" />
                <span className="ml-1">Update</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-red-50 text-red-700"
                onClick={() => deleteTeacher(teacher.teacher_id)} // Fixed to use _id
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
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 shadow-lg text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Teacher Management</h1>
            <p className="mt-2 text-blue-100/90 text-lg max-w-xl">
              Manage faculty members, assign roles, and view profiles.
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

      <div className="px-2 md:px-6 max-w-7xl mx-auto">
        <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <DataTable
              data={teachers}
              columns={teacherColumns}
              title="Teacher List"
              description="Manage all teachers in your institution"
              isLoading={isLoading}
              addButtonText="Add Teacher"
              enableSearch={true}
              searchPlaceholder="Search Teacher..."
              enableColumnVisibility={true}
              enablePagination={true}
              pageSize={limit}
              onAddNew={openAddDialog}
              hasMore={hasMore}
              onRowClick={(teacheritem) => {
                setViewData(teacheritem);
                setViewDialogOpen(true);
              }}
              emptyMessage="No teachers found. Click 'Add Teacher' to create one."
              serverSidePagination={true}
              currentPage={currentPage}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
              onSearch={handleSearch}
              onPageSizeChange={handlePageSizeChange}
              onViewMobile={(teacher) => {
                setViewData(teacher);
                setViewDialogOpen(true);
              }}
              onEditMobile={(teacher) => openEditDialog(teacher)}
              onDeleteMobile={(teacher) => deleteTeacher(teacher.teacher_id)}
              onRefresh={loadTeachers}
            />
          </CardContent>
        </Card>
      </div>

      {/* CLASS DIALOG */}

      {/* Add/Edit Teacher Dialog */}
      <AddTeacherDialog
        // key={dialogKey}
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        teacherToEdit={selectedTeacher}
        onSuccess={loadTeachers}
        roles={roles}
      />

      <BulkImportDialog
        open={bulkOpen}
        setOpen={setBulkOpen}
        importType="teachers"
        refreshTable={loadTeachers}
      />

      <DetailsDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        title="Teacher Profile"
        data={viewData}
        image={viewData?.user_avatar_url}
        fields={[
          { icon: User, label: "Full Name", key: "user_name" },
          { icon: Shield, label: "Employee Code", key: "employee_code" },
          { icon: Mail, label: "Email Address", key: "user_email" },
          { icon: IdCardLanyardIcon, label: "Aadhar Number", key: "user_adhar_no" },
          { icon: Briefcase, label: "Qualification", key: "qualification" },
          { icon: Calendar, label: "Hire Date", value: viewData?.hire_date ? new Date(viewData.hire_date).toLocaleDateString() : "-" },
          { icon: Phone, label: "Phone Number", key: "user_phone" },
          { icon: GraduationCap, label: "Bio", key: "bio" },
          { icon: MapPin, label: "Address", key: "user_address" },
        ]}
      />
    </div>
  );
}