import React, { useEffect, useState, useMemo } from 'react';
import API from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FilePen, Trash2, Library, BookOpen } from 'lucide-react';
import DataTable from '@/widgets/DataTable';
import { toast } from 'sonner';
import AddSubjectDialog from '../../forms/pages/AddSubject';

export default function SubjectDataTable() {
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Pagination states
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const loadSubjects = async (reset = false, newOffset = offset, newLimit = limit, newSearch = search) => {
    if (reset) {
      setIsLoading(true);
      newOffset = 0;
      setHasMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await API.get(`/admin/get/subjects?limit=${newLimit}&offset=${newOffset}&q=${newSearch}`);
      const newSubjects = res.data.subjects || [];

      // Always replace for the current page
      setSubjects(newSubjects);

      setHasMore(newSubjects.length === limit);
      setOffset(newOffset);
      setLimit(newLimit);
      setSearch(newSearch);

    } catch (err) {
      console.error("Error loading subjects:", err);
      toast.error("Failed to load subjects");
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const handleNextPage = () => { if (hasMore) loadSubjects(false, offset + limit, limit, search); };
  const handlePrevPage = () => { if (offset >= limit) loadSubjects(false, offset - limit, limit, search); };
  const handleSearch = (newSearchTerm) => {
    loadSubjects(true, 0, limit, newSearchTerm);
  };

  const handlePageSizeChange = (newSize) => {
    loadSubjects(true, 0, newSize, search);
  };
  const currentPage = Math.floor(offset / limit) + 1;

  useEffect(() => {
    loadSubjects(true);
  }, []);

  const deleteSubject = async (id) => {
    if (!confirm("Are you sure you want to delete this subject? This might affect existing grade assignments and timetables.")) return;
    try {
      await API.delete(`/admin/delete/subjects/${id}`);
      toast.success("Subject deleted successfully");
      loadSubjects(true);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.error || "Failed to delete subject");
    }
  };

  const columns = useMemo(() => [
    {
      accessorKey: "image_url",
      header: "Icon",
      cell: ({ row }) => (
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
          {row.getValue("image_url") ? (
            <img
              src={row.getValue("image_url")}
              alt={row.original.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <BookOpen className="h-5 w-5 text-primary" />
          )}
        </div>
      )
    },
    {
      accessorKey: "name",
      header: "Subject Name",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.getValue("name")}</span>
          <span className="text-xs text-muted-foreground font-mono">{row.original.code}</span>
        </div>
      )
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-[300px]">
          {row.getValue("description") || "No description provided"}
        </span>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const subject = row.original;
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
              onClick={() => {
                setSelectedSubject(subject);
                setIsDialogOpen(true);
              }}
            >
              <FilePen className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              onClick={() => deleteSubject(subject.id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        );
      }
    }
  ], []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 p-8 shadow-2xl text-white">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                <Library className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Academic Subjects</h1>
            </div>
            <p className="text-blue-100 max-w-2xl text-lg opacity-90">
              Define and manage the curriculum subjects. These subjects can then be assigned to specific grades and teachers.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => {
              setSelectedSubject(null);
              setIsDialogOpen(true);
            }}
            className="bg-white text-indigo-700 hover:bg-blue-50 font-bold shadow-lg transition-all hover:scale-105"
          >
            <Library className="mr-2 h-5 w-5" />
            New Subject
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            data={subjects}
            columns={columns}
            isLoading={isLoading}
            enableSearch={true}
            searchPlaceholder="Search subjects by name or code..."
            title="Subject Repository"
            description="View and manage all active academic subjects in the system"
            emptyMessage="No subjects found. Create your first subject to get started!"
            hasMore={hasMore}
            serverSidePagination={true}
            currentPage={currentPage}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            onEditMobile={(subject) => {
              setSelectedSubject(subject);
              setIsDialogOpen(true);
            }}
            onDeleteMobile={(subject) => deleteSubject(subject.id)}
            onRefresh={loadSubjects}
            pageSize={limit}
            onSearch={handleSearch}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>

      <AddSubjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        subjectToEdit={selectedSubject}
        onSuccess={loadSubjects}
      />
    </div>
  );
}