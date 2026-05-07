import React, { useEffect, useState } from "react";
import API from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilePen, Trash2, CalendarDays } from "lucide-react";
import DataTable from "@/widgets/DataTable";
import { toast } from "sonner";
import AcademicYearDialog from "./AcademicYearDialog";
import { useAuth } from "@/auth/AuthContext";

export default function AcademicYearDataTable() {
  const [academicYears, setAcademicYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const { user } = useAuth();

  // Pagination states
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  async function loadAcademicYears(reset = false, newOffset = offset, newLimit = limit, newSearch = search) {
    if (reset) {
      setIsLoading(true);
      newOffset = 0;
      setHasMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await API.get(`/admin/get/academic-years?limit=${newLimit}&offset=${newOffset}&search=${newSearch}`);
      const newYears = res.data.academic_years || [];

      // Always replace for the current page
      setAcademicYears(newYears);

      setHasMore(newYears.length === newLimit);
      setOffset(newOffset);
      setLimit(newLimit);
      setSearch(newSearch);

    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load academic years");
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }

  const handleNextPage = () => { if (hasMore) loadAcademicYears(false, offset + limit, limit, search); };
  const handlePrevPage = () => { if (offset >= limit) loadAcademicYears(false, offset - limit, limit, search); };
  const handleSearch = (newSearchTerm) => {
    loadAcademicYears(true, 0, limit, newSearchTerm);
  };

  const handlePageSizeChange = (newSize) => {
    loadAcademicYears(true, 0, newSize, search);
  };

  const currentPage = Math.floor(offset / limit) + 1;

  useEffect(() => {
    loadAcademicYears(true);
  }, []);

  async function deleteAcademicYear(id) {
    if (!confirm("Are you sure you want to delete this academic year? all the records of this academic year will be deleted")) return;
    try {
      await API.delete(`/admin/delete/academic-year/${id}`);
      toast.success("Academic year deleted successfully");
      loadAcademicYears(true);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete academic year");
    }
  }

  const columns = [
    {
      accessorKey: "name",
      header: "Academic Year",
      cell: ({ row }) => <div className="font-semibold text-blue-600">{row.getValue("name")}</div>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${row.getValue("status") === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
          }`}>
          {row.getValue("status")}
        </span>
      )
    },
    {
      accessorKey: "created_at",
      header: "Created On",
      cell: ({ row }) => <div>{new Date(row.getValue("created_at")).toLocaleDateString()}</div>
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 bg-blue-50 text-blue-700 hover:bg-blue-100"
            onClick={() => {
              setSelectedYear(row.original);
              setIsDialogOpen(true);
            }}
          >
            <FilePen className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 bg-red-50 text-red-700 hover:bg-red-100"
            onClick={() => deleteAcademicYear(row.original.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-6 h-6 text-blue-200" />
              <h1 className="text-3xl font-extrabold tracking-tight">Academic Year Data</h1>
            </div>
            <p className="text-blue-100/90 text-lg max-w-xl">
              Configure and manage academic school years for tracking enrollments and records.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <Card className="border-0 shadow-lg overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
          <CardContent className="pt-6">
            <DataTable
              data={academicYears}
              columns={columns}
              title="Academic Years"
              description="List of all configured academic periods"
              isLoading={isLoading}
              addButtonText="New Academic Year"
              onAddNew={() => {
                setSelectedYear(null);
                setIsDialogOpen(true);
              }}
              pageSize={limit}
              enableSearch={true}
              searchPlaceholder="Search year..."
              hasMore={hasMore}
              serverSidePagination={true}
              currentPage={currentPage}
              onNextPage={handleNextPage}
              onPrevPage={handlePrevPage}
              onSearch={handleSearch}
              onPageSizeChange={handlePageSizeChange}
              onEditMobile={(year) => {
                setSelectedYear(year);
                setIsDialogOpen(true);
              }}
              onDeleteMobile={(year) => deleteAcademicYear(year.id)}
              onRefresh={loadAcademicYears}
            />
          </CardContent>
        </Card>
      </div>

      <AcademicYearDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        yearToEdit={selectedYear}
        onSuccess={loadAcademicYears}
      />
    </div>
  );
}
