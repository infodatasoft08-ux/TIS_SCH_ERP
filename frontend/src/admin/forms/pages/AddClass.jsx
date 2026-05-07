import React, { useEffect, useState } from "react";
import API from "@/api";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// shadcn components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ChevronDown, FilePen, Trash2, Library, GraduationCap, BookOpen } from "lucide-react";
import DataTable from "@/widgets/DataTable";
import { toast } from "sonner";
import AddSubjectDialog from "./AddSubject";
import AddGradesDialog from "./AddGrades";
import AddClassDialog from "./addNewClass";


export default function AcademicFormsAdmin() {
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classDropDown, setClassDropDown] = useState([]);
  const [message, setMessage] = useState(null);

  const [hasTeacherLoaded, setHasTeacherLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [classOffset, setClassOffset] = useState(0);
  const [gradeOffset, setGradeOffset] = useState(0);
  const [subjectOffset, setSubjectOffset] = useState(0);
  const [classHasMore, setClassHasMore] = useState(true);
  const [gradeHasMore, setGradeHasMore] = useState(true);
  const [subjectHasMore, setSubjectHasMore] = useState(true);
  const [isClassFetchingMore, setIsClassFetchingMore] = useState(false);
  const [isGradeFetchingMore, setIsGradeFetchingMore] = useState(false);
  const [isSubjectFetchingMore, setIsSubjectFetchingMore] = useState(false);


  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(null);

  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);


  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadGrades(),
        loadSubjects(),
        loadClass(),
        loadTeacher(),
        loadClassDropDown()
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load subjects
  async function loadSubjects(reset = false, newOffset = subjectOffset, newLimit = limit, newSearch = search) {
    if (reset) {
      newOffset = 0;
      setSubjectHasMore(true);
    }
    setIsLoading(true);
    try {
      const response = await API.get(`/admin/get/subjects?limit=${newLimit}&offset=${newOffset}&q=${newSearch}`);
      const newSubjects = response.data.subjects || [];

      // Always replace for the current page
      setSubjects(newSubjects);

      setSubjectHasMore(newSubjects.length === newLimit);
      setSubjectOffset(newOffset);
      setLimit(newLimit);
      setSearch(newSearch);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load subjects" });
    } finally {
      setIsLoading(false);
      setIsSubjectFetchingMore(false);
    }
  }

  // Load grades
  async function loadGrades(reset = false, newOffset = gradeOffset, newLimit = limit, newSearch = search) {
    if (reset) {
      newOffset = 0;
      setGradeHasMore(true);
    }
    setIsLoading(true);
    try {
      const response = await API.get(`/admin/get/grades?limit=${newLimit}&offset=${newOffset}&q=${newSearch}`);
      const newGrades = response.data.grades || [];

      // Always replace for the current page
      setGrades(newGrades);

      setGradeHasMore(newGrades.length === newLimit);
      setGradeOffset(newOffset);
      setLimit(newLimit);
      setSearch(newSearch);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load grades" });
    } finally {
      setIsLoading(false);
      setIsGradeFetchingMore(false);
    }
  }

  // Load classes
  async function loadClass(reset = false, newOffset = classOffset, newLimit = limit, newSearch = search) {
    if (reset) {
      newOffset = 0;
      setClassHasMore(true);
    }
    setIsLoading(true);
    try {
      const response = await API.get(`/admin/get/classes?limit=${newLimit}&offset=${newOffset}&q=${newSearch}`);
      const newClasses = response.data.classes || [];

      // Always replace for the current page
      setClasses(newClasses);

      setClassHasMore(newClasses.length === newLimit);
      setClassOffset(newOffset);
      setLimit(newLimit);
      setSearch(newSearch);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load classes" });
    } finally {
      setIsLoading(false);
      setIsClassFetchingMore(false);
    }
  }

  const handleClassNext = () => { if (classHasMore) loadClass(false, classOffset + limit, limit, search); };
  const handleClassPrev = () => { if (classOffset >= limit) loadClass(false, classOffset - limit, limit, search); };
  const handleClassSearch = (newSearchTerm) => {
    loadClass(true, 0, limit, newSearchTerm);
  };
  const handleClassPageSizeChange = (newPageSize) => {
    loadClass(true, 0, newPageSize, search);
  };
  const classCurrentPage = Math.floor(classOffset / limit) + 1;

  const handleGradeNext = () => { if (gradeHasMore) loadGrades(false, gradeOffset + limit, limit, search); };
  const handleGradePrev = () => { if (gradeOffset >= limit) loadGrades(false, gradeOffset - limit, limit, search); };
  const handleGradeSearch = (newSearchTerm) => {
    loadGrades(true, 0, limit, newSearchTerm);
  };
  const handleGradePageSizeChange = (newPageSize) => {
    loadGrades(true, 0, newPageSize, search);
  };
  const gradeCurrentPage = Math.floor(gradeOffset / limit) + 1;

  const handleSubjectNext = () => { if (subjectHasMore) loadSubjects(false, subjectOffset + limit, limit, search); };
  const handleSubjectPrev = () => { if (subjectOffset >= limit) loadSubjects(false, subjectOffset - limit, limit, search); };
  const handleSubjectSearch = (newSearchTerm) => {
    loadSubjects(true, 0, limit, newSearchTerm);
  };
  const handleSubjectPageSizeChange = (newPageSize) => {
    loadSubjects(true, 0, newPageSize, search);
  };
  const subjectCurrentPage = Math.floor(subjectOffset / limit) + 1;

  //load Teacher
  async function loadTeacher() {
    if (hasTeacherLoaded && teachers.length > 0) return;
    try {
      const response = await API.get("/teachers/get/teacher");
      setTeachers(response.data.teachers || []);
      setHasTeacherLoaded(true)
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load teachers" });
    }
  }

  //load Class Dropdown
  async function loadClassDropDown() {
    try {
      const response = await API.get("/admin/get/grades");
      setClassDropDown(response.data.grades || []);
    } catch (err) {
      setMessage({ type: "error", text: "Failed to load classes" });
    }
  }

  async function deleteSubject(subject) {
    if (!confirm("Delete this subject?")) return;
    try {
      await API.delete(`admin/delete/subjects/${subject.id}`);
      setMessage({ type: "success", text: "Subject deleted" });
      toast.success(`Subject ${subject.name} deleted`);
      await loadSubjects(true);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to update class";
      setMessage({ type: "error", text: "Failed to delete subject" });
      toast.error(msg);
    }
  }


  async function deleteGrade(grade) {
    if (!confirm("Delete this grade?")) return;
    try {
      await API.delete(`admin/delete/grades/${grade.id}`);
      setMessage({ type: "success", text: "Grade deleted" });
      toast.success(`Grade ${grade.name} deleted`);
      await loadGrades(true);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to delete class";
      setMessage({ type: "error", text: "Failed to delete grade" });
      toast.error(msg);
    }
  }


  async function deleteClass(id) {
    if (!confirm("Delete this class?")) return;
    try {
      await API.delete(`admin/delete/classes/${id}`);
      setMessage({ type: "success", text: "Class deleted" });
      toast.success("Class deleted successfully");
      await loadClass(true);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to delete class";
      setMessage({ type: "error", text: "Failed to delete class" });
      toast.error(msg);
    }
  }



  // Open Subject edit dialog
  function openEditSubjectDialog(subject) {
    setSelectedSubject(subject);
    setIsDialogOpen(true);
  }

  // Open Subject add dialog
  function openAddSubjectDialog() {
    setSelectedSubject(null);
    setIsDialogOpen(true);
  }

  // Close Subject dialog
  function handleSubjectDialogClose() {
    setIsDialogOpen(false);
    setTimeout(() => setSelectedSubject(null), 100);
  }




  // Open Grade edit dialog
  function openEditGradeDialog(grade) {
    setSelectedGrade(grade);
    setIsGradeDialogOpen(true);
  }

  // Open Grade add dialog
  function openAddGradeDialog() {
    setSelectedGrade(null); // Fixed: was setSelectedSubject
    setIsGradeDialogOpen(true);
  }

  // Close Grade dialog
  function handleGradeDialogClose() {
    setIsGradeDialogOpen(false);
    setTimeout(() => setSelectedGrade(null), 100);
  }




  // Open Class edit dialog
  function openEditClassDialog(classes) {
    setSelectedClass(classes);
    setIsClassDialogOpen(true);
  }

  // Open Class add dialog
  function openAddClassDialog() {
    setSelectedClass(null);
    setIsClassDialogOpen(true);
  }

  // Close Class dialog
  function handleClassDialogClose() {
    setIsClassDialogOpen(false);
    setTimeout(() => setSelectedClass(null), 100);
  }



  const subjectColumns = React.useMemo(
    () => [
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => <div>{row.getValue("code")}</div>,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <div>{row.getValue("name")}</div>,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => <div>{row.getValue("description") || "-"}</div>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const subject = row.original;

          return (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-blue-50 text-blue-700 rounded-full"
                onClick={() => openEditSubjectDialog(subject)}
              >
                <FilePen className="h-4 w-4" />
                <span className="ml-1">Update</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-red-50 text-red-700"
                onClick={() => deleteSubject(subject)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      }
    ],
    []
  );

  const gradeColumns = React.useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Class Name",
        cell: ({ row }) => <div>{row.getValue("name")}</div>,
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => <div>{row.getValue("description") || "-"}</div>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const grade = row.original;

          return (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-blue-50 text-blue-700 rounded-full"
                onClick={() => openEditGradeDialog(grade)}
              >
                <FilePen className="h-4 w-4" />
                <span className="ml-1">Update</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-red-50 text-red-700"
                onClick={() => deleteGrade(grade)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      }
    ],
    []
  );

  const classColumns = React.useMemo(
    () => [
      {
        accessorKey: "grade_name",
        header: "Class Name",
        cell: ({ row }) => <div>{row.getValue("grade_name") || "-"}</div>,
      },
      {
        accessorKey: "name",
        header: "Section",
        cell: ({ row }) => <div>{row.getValue("name") || "-"}</div>,
      },
      {
        accessorKey: "supervisor_teacher_id",
        header: "Class Teacher",
        cell: ({ row }) => {
          const classes = row.original;
          if (classes.supervisor_name) {
            return <div>{classes.supervisor_name}</div>;
          }
          const teacher = teachers.find(t => (t.teacher_id === classes.supervisor_teacher_id) || (t.id === classes.supervisor_teacher_id));
          return <div>{teacher ? (teacher.user_name || teacher.name) : (classes.supervisor_teacher_id || "-")}</div>;
        },
      },
      {
        accessorKey: "room",
        header: "Room",
        cell: ({ row }) => <div>{row.getValue("room") || "-"}</div>,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const classes = row.original;

          return (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-blue-50 text-blue-700 rounded-full"
                onClick={() => openEditClassDialog(classes)}
              >
                <FilePen className="h-4 w-4" />
                <span className="ml-1">Update</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 bg-red-50 text-red-700"
                onClick={() => deleteClass(classes.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      }
    ],
    [teachers]
  );


  return (
    <div className="p-2 w-full mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Academic Management</h1>
        <p className="text-muted-foreground">Manage your school's classes, grades, and subjects from one place.</p>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${message.type === "error" ? "bg-red-50 text-red-800 border border-red-100" : "bg-green-50 text-green-800 border border-green-100"
            }`}
        >
          <div className={`h-2 w-2 rounded-full ${message.type === "error" ? "bg-red-600" : "bg-green-600"}`} />
          {message.text}
        </div>
      )}

      <Tabs defaultValue="classes" className="w-full">
        <TabsList className="flex flex-col sm:grid w-full sm:grid-cols-3 mb-8 sm:h-14 h-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl gap-2">
          <TabsTrigger value="classes" className="rounded-xl font-bold py-3 transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-gray-700 w-full">
            <Library className="w-4 h-4 mr-2" />
            Classes Section
          </TabsTrigger>
          <TabsTrigger value="grades" className="rounded-xl font-bold py-3 transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-gray-700 w-full">
            <GraduationCap className="w-4 h-4 mr-2" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="subjects" className="rounded-xl font-bold py-3 transition-all data-[state=active]:bg-white data-[state=active]:shadow-lg dark:data-[state=active]:bg-gray-700 w-full">
            <BookOpen className="w-4 h-4 mr-2" />
            Subjects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4 outline-none">
          <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
            <CardContent className="pt-6">
              <DataTable
                data={classes}
                columns={classColumns}
                title="Classes Section"
                description="View and manage all active classes Section"
                isLoading={isLoading}
                addButtonText="Add Class Section"
                enableSearch={true}
                searchPlaceholder="Search class section..."
                enableColumnVisibility={true}
                enablePagination={true}
                onAddNew={openAddClassDialog}
                pageSize={limit}
                onSearch={handleClassSearch}
                onPageSizeChange={handleClassPageSizeChange}
                emptyMessage="No class section found. Click 'Add Class Section' to create one."
                hasMore={classHasMore}
                serverSidePagination={true}
                currentPage={classCurrentPage}
                onNextPage={handleClassNext}
                onPrevPage={handleClassPrev}
                onEditMobile={(cls) => openEditClassDialog(cls)}
                onDeleteMobile={(cls) => deleteClass(cls.id)}
                onRefresh={loadClass}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="space-y-4 outline-none">
          <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
            <CardContent className="pt-6">
              <DataTable
                data={grades}
                columns={gradeColumns}
                title="Classes"
                description="Manage academic Classes and levels"
                isLoading={isLoading}
                addButtonText="Add Class"
                enableSearch={true}
                searchPlaceholder="Search Class..."
                enableColumnVisibility={true}
                enablePagination={true}
                onAddNew={openAddGradeDialog}
                pageSize={limit}
                onSearch={handleGradeSearch}
                onPageSizeChange={handleGradePageSizeChange}
                emptyMessage="No Class found. Click 'Add Class' to create one."
                hasMore={gradeHasMore}
                serverSidePagination={true}
                currentPage={gradeCurrentPage}
                onNextPage={handleGradeNext}
                onPrevPage={handleGradePrev}
                onEditMobile={(grade) => openEditGradeDialog(grade)}
                onDeleteMobile={(grade) => deleteGrade(grade)}
                onRefresh={loadGrades}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4 outline-none">
          <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
            <CardContent className="pt-6">
              <DataTable
                data={subjects}
                columns={subjectColumns}
                title="Subjects"
                description="Configure curriculum subjects and codes"
                isLoading={isLoading}
                addButtonText="Add Subject"
                enableSearch={true}
                searchPlaceholder="Search subject..."
                enableColumnVisibility={true}
                enablePagination={true}
                onAddNew={openAddSubjectDialog}
                pageSize={limit}
                onSearch={handleSubjectSearch}
                onPageSizeChange={handleSubjectPageSizeChange}
                emptyMessage="No subject found. Click 'Add Subject' to create one."
                hasMore={subjectHasMore}
                serverSidePagination={true}
                currentPage={subjectCurrentPage}
                onNextPage={handleSubjectNext}
                onPrevPage={handleSubjectPrev}
                onEditMobile={(subject) => openEditSubjectDialog(subject)}
                onDeleteMobile={(subject) => deleteSubject(subject)}
                onRefresh={loadSubjects}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      {/* SUBJECT DIALOG */}
      <AddSubjectDialog
        open={isDialogOpen}
        onOpenChange={handleSubjectDialogClose}
        subjectToEdit={selectedSubject}
        onSuccess={loadSubjects}
      />

      {/* GRADE DIALOG */}
      <AddGradesDialog
        open={isGradeDialogOpen}
        onOpenChange={handleGradeDialogClose}
        gradeToEdit={selectedGrade}
        onSuccess={loadGrades}
      />

      {/* CLASS DIALOG */}
      <AddClassDialog
        open={isClassDialogOpen}
        onOpenChange={handleClassDialogClose}
        classToEdit={selectedClass}
        onSuccess={loadClassDropDown}
        grade={classDropDown}
        teacher={teachers}
      />
    </div>
  );
}
