import React, { useEffect, useState } from "react";
import API from "@/api";
// import { Button } from "@/components/ui/button"; // Not used directly if DataTable handles add button logic or we use standard button in actions
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilePen, Trash2, UserPen } from "lucide-react";
import DataTable from "@/widgets/DataTable";
import { toast } from "sonner";
import AddAcademicRecordDialog from "../forms/AddAcademicRecordForm.jsx";
import PromoteStudentToNextClassDialog from "@/forms/PromotStudentToNextClassForm.jsx";
import BulkPromoteForm from "./forms/BulkPromoteForm.jsx";
import { useAuth } from "@/auth/AuthContext.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";

export default function AcademicRecordsPage() {
    const [records, setRecords] = useState([]);
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [grades, setGrades] = useState([]);
    const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
    const [isBulkPromoteDialogOpen, setIsBulkPromoteDialogOpen] = useState(false);
    const [academicYears, setAcademicYears] = useState([]);

    // Pagination states
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");
    const [offset, setOffset] = useState(0);
    const [selectedGrade, setSelectedGrade] = useState("");
    const [selectedYear, setSelectedYear] = useState("");
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const { user } = useAuth();

    // Load initial data
    async function loadRecords(reset = false, newOffset = offset, newLimit = limit, newSearch = search, newGrade = selectedGrade, newYear = selectedYear) {
        if (reset) {
            setIsLoading(true);
            newOffset = 0;
            setHasMore(true);
        } else {
            setIsLoading(true);
        }

        try {
            const promises = [
                API.get(`/academic/get?limit=${newLimit}&offset=${newOffset}&q=${newSearch}&grade_id=${newGrade}&academic_year_id=${newYear}`)
            ];

            if (reset) {
                promises.push(API.get("/students/get/student"));
                promises.push(API.get("/admin/get/classes"));
                promises.push(API.get("/admin/get/grades"));
                promises.push(API.get("/admin/get/academic-years"));
            }

            const results = await Promise.all(promises);
            const recordsRes = results[0];
            const newRecords = recordsRes.data.academic_records || [];

            // Always replace the data for the current page
            setRecords(newRecords);

            if (reset) {
                if (results[1]) setStudents(results[1].data.students || []);
                if (results[2]) setClasses(results[2].data.classes || []);
                if (results[3]) setGrades(results[3].data.grades || []);
                if (results[4]) setAcademicYears(results[4].data.academic_years || []);
            }

            setHasMore(newRecords.length === newLimit);
            setOffset(newOffset);
            setLimit(newLimit);
            setSearch(newSearch);
            setSelectedGrade(newGrade);
            setSelectedYear(newYear);
        } catch (err) {
            const msg = err.response?.data?.error || "Failed to load data";
            toast.error(msg);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    }

    const handleNextPage = () => {
        if (hasMore) loadRecords(false, offset + limit, limit, search, selectedGrade, selectedYear);
    };

    const handlePrevPage = () => {
        if (offset >= limit) loadRecords(false, offset - limit, limit, search, selectedGrade, selectedYear);
    };

    const handleSearch = (newSearchTerm) => {
        loadRecords(true, 0, limit, newSearchTerm, selectedGrade, selectedYear);
    };

    const handleGradeChange = (newGrade) => {
        const grade = newGrade === "all" ? "" : newGrade;
        loadRecords(true, 0, limit, search, grade, selectedYear);
    };

    const handleYearChange = (newYear) => {
        const year = newYear === "all" ? "" : newYear;
        loadRecords(true, 0, limit, search, selectedGrade, year);
    };

    const handlePageSizeChange = (newSize) => {
        loadRecords(true, 0, newSize, search, selectedGrade, selectedYear);
    };

    const currentPage = Math.floor(offset / limit) + 1;

    useEffect(() => {
        loadRecords(true);
    }, []);

    // Delete record
    async function deleteRecord(id) {
        if (!confirm("Are you sure you want to delete this record?")) return;

        try {
            await API.delete(`/academic/delete/${id}`);
            toast.success("Record deleted successfully");
            loadRecords(true);
        } catch (err) {
            const msg = err.response?.data?.error || "Failed to delete record";
            toast.error(msg);
        }
    }

    // Open edit dialog
    function openEditDialog(record) {
        setSelectedRecord(record);
        // console.log("mayank record: ", record);
        setIsDialogOpen(true);
    }

    // Open promote dialog
    function openPromoteDialog(record) {
        setSelectedRecord(record);
        setIsPromoteDialogOpen(true);
    }

    // Open add dialog
    function openAddDialog() {
        setSelectedRecord(null);
        setIsDialogOpen(true);
    }

    // Close dialog
    function handleDialogClose() {
        setIsDialogOpen(false);
        setTimeout(() => setSelectedRecord(null), 100);
    }

    // Close promote dialog
    function handlePromoteDialogClose() {
        setIsPromoteDialogOpen(false);
        setTimeout(() => setSelectedRecord(null), 100);
    }

    // Columns
    const columns = React.useMemo(
        () => [
            {
                accessorKey: "student_name",
                header: "Student Name",
                cell: ({ row }) => <div>{row.getValue("student_name") || "N/A"}</div>
            },
            {
                accessorKey: "academic_year_name",
                header: "Academic Year",
                cell: ({ row }) => <div className="font-medium text-blue-600">{row.getValue("academic_year_name") || row.getValue("academic_year") || "-"}</div>
            },
            {
                accessorKey: "roll_no",
                header: "Roll No",
                cell: ({ row }) => <div>{row.getValue("roll_no") || "-"}</div>
            },
            {
                accessorKey: "result_status",
                header: "Result Status",
                cell: ({ row }) => <div className="capitalize">{row.getValue("result_status") || "-"}</div>
            },
            {
                accessorKey: "grade_name",
                header: "Class",
                cell: ({ row }) => <div className="capitalize">{row.getValue("grade_name") || "-"}</div>
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => {
                    const record = row.original;
                    return (
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 bg-blue-50 text-blue-700"
                                onClick={() => openEditDialog(record)}
                            >
                                <FilePen className="h-4 w-4" />
                                <span className="ml-1">Edit</span>
                            </Button>
                            {user.role_id === 3 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 bg-red-50 text-red-700"
                                    onClick={() => deleteRecord(record.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 bg-red-50 text-red-700"
                                onClick={() => openPromoteDialog(record)}
                            >
                                <UserPen className="h-4 w-4" />
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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 shadow-lg text-white">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Academic Records</h1>
                        <p className="mt-2 text-emerald-100/90 text-lg max-w-xl">
                            Manage student academic history, track promotions, and maintain comprehensive records.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={() => setIsBulkPromoteDialogOpen(true)}
                            className="bg-white text-emerald-700 hover:bg-emerald-50 border-0"
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Bulk Promote
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-2 md:px-6 max-w-7xl mx-auto">
                <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <DataTable
                            data={records}
                            columns={columns}
                            title="Academic Records"
                            description="Manage student academic history and promotions"
                            isLoading={isLoading}
                            addButtonText="Add Record"
                            enableSearch={true}
                            searchPlaceholder="Search records..."
                            enableColumnVisibility={true}
                            enablePagination={true}
                            pageSize={limit}
                            onAddNew={openAddDialog}
                            emptyMessage="No records found. Click 'Add Record' to create one."
                            hasMore={hasMore}
                            serverSidePagination={true}
                            currentPage={currentPage}
                            onNextPage={handleNextPage}
                            onPrevPage={handlePrevPage}
                            onSearch={handleSearch}
                            onPageSizeChange={handlePageSizeChange}
                            leftOfSearch={
                                <div className="flex gap-2">
                                    <Select onValueChange={handleYearChange} value={selectedYear}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="All Years" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Years</SelectItem>
                                            {academicYears.map((ay) => (
                                                <SelectItem key={ay.id} value={ay.id.toString()}>{ay.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select onValueChange={handleGradeChange} value={selectedGrade}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="All Classes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Classes</SelectItem>
                                            {grades.map((g) => (
                                                <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            }
                            onEditMobile={(record) => openEditDialog(record)}
                            onDeleteMobile={(record) => deleteRecord(record.id)}
                            onPromoteMobile={(record) => openPromoteDialog(record)}
                            onRefresh={loadRecords}
                        />
                    </CardContent>
                </Card>

                <AddAcademicRecordDialog
                    open={isDialogOpen}
                    onOpenChange={handleDialogClose}
                    recordToEdit={selectedRecord}
                    onSuccess={loadRecords}
                    students={students}
                    classes={classes}
                    grades={grades}
                />
                <PromoteStudentToNextClassDialog
                    open={isPromoteDialogOpen}
                    onOpenChange={handlePromoteDialogClose}
                    recordToPromote={selectedRecord}
                    onSuccess={loadRecords}
                    students={students}
                    classes={classes}
                    grades={grades}
                />
                <BulkPromoteForm
                    open={isBulkPromoteDialogOpen}
                    onOpenChange={setIsBulkPromoteDialogOpen}
                    onSuccess={loadRecords}
                    grades={grades}
                    classes={classes}
                    academicYears={academicYears}
                />
            </div>
        </div>
    );
}
