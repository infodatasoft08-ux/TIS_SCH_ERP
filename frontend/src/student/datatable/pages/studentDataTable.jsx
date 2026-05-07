// pages/StudentsPage.jsx
import React, { useEffect, useState } from "react";
import API from "@/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, FilePen, FileUp, IdCardLanyardIcon, PhoneCall, Printer, Trash2, User2 } from "lucide-react";
import DataTable from "@/widgets/DataTable";
// import toast from "react-hot-toast";
import { toast } from "sonner";
import AddStudentDialog from "@/student/forms/pages/addStudentForm";
import AddParentDialog from "@/student/forms/pages/addParentForm";
import { exportToExcel, exportToPDF, exportToCSV } from "@/utils/exportHelper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown } from "lucide-react";
import BulkImportDialog from "@/pages/BulkImportDialog";
import DetailsDialog from "@/components/DetailsDialog";
import { User, Mail, Phone, Calendar, MapPin, GraduationCap, Eye, Hash, ShieldCheck } from 'lucide-react';
import { useAuth } from "@/auth/AuthContext";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [dialogKey, setDialogKey] = useState(Date.now());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const { user } = useAuth();

  // Pagination and search states
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Load students and classes
  async function loadStudents(reset = false, newOffset = offset, newLimit = limit, newSearch = search, newGrade = selectedGrade) {
    if (reset) {
      setIsLoading(true);
      newOffset = 0;
      setHasMore(true);
    } else {
      setIsLoading(true); // Always show loading when changing pages
    }

    try {
      const [studentsRes, classesRes, gradesRes] = await Promise.all([
        API.get(`/students/get/student?limit=${newLimit}&offset=${newOffset}&q=${newSearch}&grade_id=${newGrade}`),
        // only need to fetch classes once really, but kept as is for simplicity
        reset ? API.get("/admin/get/classes") : Promise.resolve({ data: { classes: classes } }),
        reset ? API.get("/admin/get/grades") : Promise.resolve({ data: { grades: grades } })
      ]);

      const newStudents = studentsRes.data.students || [];

      // Always replace the data for the current page
      setStudents(newStudents);
      if (reset) {
        setClasses(classesRes.data.classes || []);
        setGrades(gradesRes.data.grades || []);
      }

      setHasMore(newStudents.length === newLimit);
      setOffset(newOffset);
      setLimit(newLimit);
      setSearch(newSearch);
      setSelectedGrade(newGrade);

    } catch (err) {
      const msg = err.response?.data?.error || "Failed to load data";
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }

  const handleNextPage = () => {
    if (hasMore) loadStudents(false, offset + limit, limit, search, selectedGrade);
  };

  const handlePrevPage = () => {
    if (offset >= limit) loadStudents(false, offset - limit, limit, search, selectedGrade);
  };

  const handleSearch = (newSearchTerm) => {
    loadStudents(true, 0, limit, newSearchTerm, selectedGrade);
  };

  const handleGradeChange = (newGrade) => {
    const grade = newGrade === "all" ? "" : newGrade;
    loadStudents(true, 0, limit, search, grade);
  };

  const handlePageSizeChange = (newSize) => {
    loadStudents(true, 0, newSize, search, selectedGrade);
  };

  const currentPage = Math.floor(offset / limit) + 1;

  useEffect(() => {
    loadStudents(true);
  }, []);

  // Delete student
  async function deleteStudent(id) {
    if (!confirm("Are you sure you want to delete this student? if you delete this student then all the data of this student will also be deleted")) return;

    try {
      await API.delete(`/students/delete/student/${id}`);
      toast.success("Student deleted successfully");
      loadStudents(true);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to delete student";
      toast.error(msg);
    }
  }

  // Print student form
  async function handlePrint(studentId) {
    const loadingToast = toast.loading("Preparing Admission Form...");
    try {
      const response = await API.get(`/students/download/admission-form/${studentId}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Admission_Form_${studentId}.pdf`);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success("Admission form downloaded successfully");
    } catch (err) {
      toast.dismiss(loadingToast);
      const msg = err.response?.data?.error || "Failed to download admission form";
      toast.error(msg);
      console.error(err);
    }
  }

  const isMobileApp = typeof window !== 'undefined' && window.ReactNativeWebView;

  const handlePrintAdmissionForm = async (studentId) => {
    const loadingToast = toast.loading("Preparing Admission Form...");
    if (!studentId) return;
    try {
      const res = await API.get(`/students/download/admission-form/${studentId}`, {
        responseType: "blob",
      });
      // const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      // const printWindow = window.open(url, "_blank");
      // if (printWindow) {
      //   printWindow.onload = () => {
      //     printWindow.print();
      //   };
      // } else {
      //   toast.error("Pop-up blocked. Please allow pop-ups to print.");
      // }

      if (isMobileApp) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'print',
            payload: { base64 }
          }));
        };
        reader.readAsDataURL(res.data);
      } else {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
          toast.error("Pop-up blocked. Please allow pop-ups to print.");
        }
      }
    } catch (err) {
      console.error("Failed to print admission form", err);
      toast.error("Failed to generate admission form");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  // Open edit dialog
  function openEditDialog(student) {
    console.log("Opening edit dialog with student:", student);
    setSelectedStudent(student);
    setDialogKey(Date.now());
    setIsDialogOpen(true);
  }

  // Open add dialog
  function openAddDialog() {
    console.log("Opening add dialog");
    setSelectedStudent(null);
    setDialogKey(Date.now());
    setIsDialogOpen(true);
  }

  // Close dialog
  function handleDialogClose() {
    setIsDialogOpen(false);
    setTimeout(() => setSelectedStudent(null), 100);
  }

  const handleExport = (type) => {
    if (students.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = students.map(s => ({
      "Name": s.user_name,
      "Email": s.user_email,
      "Class": s.grade_name,
      "Section": s.class_name,
      "Roll No": s.roll_no,
      "Gender": s.user_gender,
      "Phone": s.user_phone,
      "Address": s.user_address,
      "Adhar No": s.user_adhar_no,
      "Admission Date": new Date(s.admission_date).toLocaleDateString(),
      "Status": s.status
    }));

    if (type === 'excel') exportToExcel(exportData, 'Students_List');
    if (type === 'csv') exportToCSV(exportData, 'Students_List');
    if (type === 'pdf') {
      const columns = [
        { header: 'Name', dataKey: 'Name' },
        { header: 'Email', dataKey: 'Email' },
        { header: 'Class', dataKey: 'Class' },
        { header: 'Section', dataKey: 'Section' },
        { header: 'Roll No', dataKey: 'Roll No' },
        { header: 'Gender', dataKey: 'Gender' },
        { header: 'Phone', dataKey: 'Phone' },
        { header: 'Address', dataKey: 'Address' },
        { header: 'Adhar No', dataKey: 'Adhar No' },
        { header: 'Admission Date', dataKey: 'Admission Date' },
        { header: 'Status', dataKey: 'Status' }
      ];
      exportToPDF(columns, exportData, 'Students List', 'students_list');
    }
  };

  // Student columns for DataTable
  const studentColumns = React.useMemo(
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
                {row.getValue("user_name")?.charAt(0) || "S"}
              </div>
            )}
          </div>
        )
      },
      {
        accessorKey: "user_name",
        header: "Student Name",
        cell: ({ row }) => <div>{row.getValue("user_name") || "-"}</div>
      },
      {
        accessorKey: "user_email",
        header: "Email",
        cell: ({ row }) => <div>{row.getValue("user_email") || "-"}</div>
      },
      {
        accessorKey: "class_name",
        header: "Section",
        cell: ({ row }) => <div>{row.getValue("class_name") || "-"}</div>
      },
      {
        accessorKey: "grade_name",
        header: "Class",
        cell: ({ row }) => <div>{row.getValue("grade_name") || "-"}</div>
      },
      {
        accessorKey: "roll_no",
        header: "Roll No",
        cell: ({ row }) => <div>{row.getValue("roll_no") || "-"}</div>
      },
      {
        accessorKey: "admission_date",
        header: "Admission Date",
        cell: ({ row }) => {
          const dateValue = row.getValue("admission_date");
          if (!dateValue) return <div>-</div>;
          return <div>{new Date(dateValue).toLocaleDateString("en-GB")}</div>;
        }
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <div className="capitalize">{row.getValue("status") || "-"}</div>
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const student = row.original;
          return (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-emerald-50 text-emerald-700 rounded-full"
                onClick={() => {
                  setViewData(student);
                  setViewDialogOpen(true);
                }}
              >
                <Eye className="h-4 w-4" />
                <span className="ml-1">View</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-blue-50 text-blue-700"
                onClick={() => openEditDialog(student)}
              >
                <FilePen className="h-4 w-4" />
                <span className="ml-1">Edit</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-purple-50 text-purple-700"
                // onClick={() => handlePrint(student.id)}
                onClick={() => handlePrintAdmissionForm(student.id)}
              >
                <Printer className="h-4 w-4" />
                <span className="ml-1">Print</span>
              </Button>
              {/* {user.role_id === 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 bg-red-50 text-red-700"
                  onClick={() => deleteStudent(student.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )} */}
            </div>
          );
        }
      }
    ],
    []
  );


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 shadow-lg text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Student Management</h1>
            <p className="mt-2 text-blue-100/90 text-lg max-w-xl">
              Manage student enrollments, profiles, and academic status efficiently.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              data={students}
              columns={studentColumns}
              isLoading={isLoading}
              pageSize={limit}
              addButtonText="Add Student"
              onAddNew={openAddDialog}
              enableSearch={true}
              searchPlaceholder="Search students..."
              title="Students List"
              description="Manage all enrolled students in the system."
              serverSidePagination={true}
              currentPage={currentPage}
              hasMore={hasMore}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
              onSearch={handleSearch}
              onPageSizeChange={handlePageSizeChange}
              onViewMobile={(student) => {
                setViewData(student);
                setViewDialogOpen(true);
              }}
              onEditMobile={(student) => openEditDialog(student)}
              onDeleteMobile={(student) => deleteStudent(student.id)}
              onRefresh={loadStudents}
              leftOfSearch={
                <Select onValueChange={handleGradeChange} value={selectedGrade}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {grades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id.toString()}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Student Dialog with key for re-render */}
      <AddStudentDialog
        // key={dialogKey} // This forces re-render when key changes
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        studentToEdit={selectedStudent}
        onSuccess={loadStudents}
        classes={classes}
      />

      <BulkImportDialog
        open={bulkOpen}
        setOpen={setBulkOpen}
        importType="students"
        refreshTable={loadStudents}
      />

      {/* <AddParentDialog
        open={isParentDialogOpen}
        onOpenChange={(open) => {
          setIsParentDialogOpen(open);
          if (!open) setSelectedStudent(null); // cleanup
        }}
        student={selectedStudent}
        parent={selectedStudentParent}
      /> */}

      <DetailsDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        title="Student Profile"
        data={viewData}
        image={viewData?.user_avatar_url}
        fields={[
          { icon: User, label: "Full Name", key: "user_name" },
          { icon: ShieldCheck, label: "Admission Number", key: "admission_no" },
          { icon: Hash, label: "Roll Number", key: "roll_no" },
          { icon: GraduationCap, label: "Class", key: "grade_name" },
          { icon: Briefcase, label: "Section", key: "class_name" },
          { icon: Mail, label: "Email Address", key: "user_email" },
          { icon: IdCardLanyardIcon, label: "Aadhar Number", key: "user_adhar_no" },
          { icon: Calendar, label: "Admission Date", value: viewData?.admission_date ? new Date(viewData.admission_date).toLocaleDateString() : "-" },
          { icon: Calendar, label: "Date of Birth", value: viewData?.date_of_birth ? new Date(viewData.date_of_birth).toLocaleDateString() : "-" },
          { icon: Phone, label: "Contact", key: "user_phone" },
          { icon: PhoneCall, label: "Fathers Contact", key: "parent_contact" },
          { icon: PhoneCall, label: "Mothers Contact", key: "mother_contect" },
          { icon: User, label: "Gender", key: "user_gender" },
          { icon: User2, label: "Fathers Name", key: "fathers_name" },
          { icon: User, label: "Mothers Name", key: "mothers_name" },
          { icon: MapPin, label: "Address", key: "user_address" },
          { icon: Briefcase, label: "Status", key: "status" },
        ]}
      />
    </div>
  );
}