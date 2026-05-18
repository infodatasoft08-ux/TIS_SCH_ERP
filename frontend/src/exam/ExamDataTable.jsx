import React, { useEffect, useState } from "react";
import API from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import ExamList from "./ExamList.jsx";
import AddExamMarksDialog from "./AddExamMarksDialog.jsx";
import CreateExamDialog from "./CreateExamDialog.jsx";
import CreateRoutineDialog from "./CreateRoutineDialog.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Printer, TrendingUp, Filter, Calendar, Download, Lock, FileText } from "lucide-react";
import StudentPerformanceReport from "./StudentPerformanceReport.jsx";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ExamDataTable() {
    const [exams, setExams] = useState([]);
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState(null);
    const [grades, setGrades] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [studentSummaries, setStudentSummaries] = useState([]);
    const [isAddMarksDialogOpen, setIsAddMarksDialogOpen] = useState(false);
    const [isRoutineDialogOpen, setIsRoutineDialogOpen] = useState(false);
    const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const [filterGrade, setFilterGrade] = useState("all");
    const [filterAcademicYear, setFilterAcademicYear] = useState("all");
    const [filterSearch, setFilterSearch] = useState("");

    // Filter states for Exams tab
    const [filterExamsGrade, setFilterExamsGrade] = useState("all");
    const [filterExamsAcademicYear, setFilterExamsAcademicYear] = useState("all");
    const [filterExamsSearch, setFilterExamsSearch] = useState("");

    // Pagination states
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    async function loadExams(reset = false, newOffset = offset) {
        if (reset) {
            setIsLoading(true);
            newOffset = 0;
            setHasMore(true);
        } else {
            setIsLoading(true);
        }

        try {
            let examsUrl = `/exam/list/exams?limit=${limit}&offset=${newOffset}`;
            if (filterExamsGrade !== "all") examsUrl += `&grade_id=${filterExamsGrade}`;
            if (filterExamsAcademicYear !== "all") examsUrl += `&academic_year_id=${filterExamsAcademicYear}`;
            if (filterExamsSearch) examsUrl += `&q=${encodeURIComponent(filterExamsSearch)}`;

            const promises = [
                API.get(examsUrl)
            ];

            if (reset) {
                promises.push(API.get("/students/get/student"));
                promises.push(API.get("/admin/get/classes"));
                promises.push(API.get("/admin/get/grades"));
                promises.push(API.get("/admin/get/subjects"));
                promises.push(API.get("/admin/get/academic-years"));
                promises.push(API.get("/exam/list/all-student-summaries"));
            }

            const results = await Promise.all(promises);
            const examsRes = results[0];
            const newExams = examsRes.data.exams || [];

            setExams(newExams);

            if (reset) {
                setStudents(results[1].data.students || []);
                setClasses(results[2].data.classes || []);
                setGrades(results[3].data.grades || []);
                setSubjects(results[4].data.subjects || []);

                // Fix: Get academic years from academic_years or years or academicYears
                const ayData = results[5].data.academic_years || results[5].data.years || results[5].data.academicYears || [];
                setAcademicYears(ayData);

                setStudentSummaries(results[6].data.studentSummaries || []);
            }

            setHasMore(newExams.length === limit);
            setOffset(newOffset);

        } catch (err) {
            const msg = err.response?.data?.error || "Failed to load data";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    }

    const handleNextPage = () => {
        if (hasMore) loadExams(false, offset + limit);
    };

    const handlePrevPage = () => {
        if (offset >= limit) loadExams(false, offset - limit);
    };

    const currentPage = Math.floor(offset / limit) + 1;

    useEffect(() => {
        loadExams(true);
    }, [filterExamsGrade, filterExamsAcademicYear, filterExamsSearch]);

    async function deleteExam(id) {
        if (!confirm("Are you sure you want to delete this exam?")) return;

        try {
            await API.delete(`/exam/delete/exam/${id}`);
            toast.success("Exam deleted successfully");
            loadExams(true);
        } catch (err) {
            const msg = err.response?.data?.error || "Failed to delete exam";
            toast.error(msg);
        }
    }

    async function togglePublish(exam) {
        const newStatus = exam.status === 'Published' ? 'Draft' : 'Published';
        try {
            await API.put(`/exam/update/exams/${exam.id}`, { status: newStatus });
            toast.success(`Exam ${newStatus} successfully`);
            loadExams(true);
        } catch (err) {
            toast.error("Failed to update status");
        }
    }

    async function toggleResultsPublish(exam) {
        const newState = !exam.is_results_published;
        try {
            await API.put(`/exam/update/exams/${exam.id}`, { is_results_published: newState });
            toast.success(`Results ${newState ? 'published' : 'unpublished'} successfully`);
            loadExams(true);
        } catch (err) {
            toast.error("Failed to update results publication status");
        }
    }

    function openEditDialog(exam) {
        setSelectedExam(exam);
        setIsDialogOpen(true);
    }

    function openAddDialog() {
        setSelectedExam(null);
        setIsDialogOpen(true);
    }

    function openAddMarksDialog(exam) {
        setSelectedExam(exam);
        setIsAddMarksDialogOpen(true);
    }

    function openRoutineDialog(exam) {
        setSelectedExam(exam);
        setIsRoutineDialogOpen(true);
    }

    function handleDialogClose() {
        setIsDialogOpen(false);
        setTimeout(() => setSelectedExam(null), 100);
    }

    function handleAddMarksDialogClose() {
        setIsAddMarksDialogOpen(false);
        setTimeout(() => setSelectedExam(null), 100);
    }

    function handleRoutineDialogClose() {
        setIsRoutineDialogOpen(false);
        setTimeout(() => setSelectedExam(null), 100);
    }

    const filteredSummaries = studentSummaries.filter(s => {
        const matchesGrade = filterGrade === "all" || s.grade_id?.toString() === filterGrade;
        const matchesYear = filterAcademicYear === "all" || s.academic_year_id?.toString() === filterAcademicYear;
        const matchesSearch = s.name?.toLowerCase().includes(filterSearch.toLowerCase()) ||
            s.roll_no?.toString().includes(filterSearch);
        return matchesGrade && matchesYear && matchesSearch;
    });

    const openPerformanceReport = (student) => {
        setSelectedStudent(student);
        setIsReportDialogOpen(true);
    };

    const generateMarksheetPDF = (student, exam) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text("NIYATI PUBLIC SCHOOL", 105, 15, { align: "center" });
        doc.setFontSize(14);
        doc.text("EXAMINATION MARKSHEET", 105, 25, { align: "center" });

        doc.setLineWidth(0.5);
        doc.line(20, 30, 190, 30);

        // Student Info
        doc.setFontSize(10);
        doc.text(`Student Name: ${student.name}`, 20, 40);
        doc.text(`Roll No: ${student.roll_no || 'N/A'}`, 20, 45);
        doc.text(`Grade: ${student.grade_name || 'N/A'}`, 20, 50);

        doc.text(`Exam: ${exam.name}`, 140, 40);
        doc.text(`Date: ${new Date(exam.date).toLocaleDateString()}`, 140, 45);
        doc.text(`Academic Year: ${student.academic_year_name || 'N/A'}`, 140, 50);

        // Table
        const tableBody = exam.subjects.map(sub => [
            sub.subject_name,
            sub.max_marks,
            sub.attendance_status === 'Absent' ? 'AB' : sub.marks_obtained,
            sub.grade || '-'
        ]);

        autoTable(doc, {
            startY: 60,
            head: [['Subject', 'Max Marks', 'Marks Obtained', 'Grade']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillStyle: [79, 70, 229] },
        });

        // Summary
        const totalMax = exam.subjects.reduce((acc, sub) => acc + (sub.max_marks || 0), 0);
        const totalObtained = exam.subjects.reduce((acc, sub) => acc + (sub.marks_obtained || 0), 0);
        const percentage = ((totalObtained / totalMax) * 100).toFixed(2);

        const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 70) + 10;
        doc.text(`Total Marks: ${totalObtained} / ${totalMax}`, 20, finalY);
        doc.text(`Percentage: ${percentage}%`, 20, finalY + 5);

        doc.save(`${student.name}_${exam.name}_Marksheet.pdf`);
    };

    const isMobileApp = typeof window !== 'undefined' && window.ReactNativeWebView;

    const handleMarksheetAction = async (student, exam, action) => {
        setIsGenerating(true);
        const loadingToast = toast.loading(`Generating marksheet for ${student.name}...`);
        try {
            const res = await API.post('/exam/generate-marksheet', {
                student_id: student.id,
                exam_id: exam.id
            }, {
                responseType: 'blob'
            });

            toast.dismiss(loadingToast);

            // if (!res.data) {
            //     toast.error("Failed to generate marksheet.");
            //     return;
            // }

            const blob = new Blob([res.data], {
                type: "application/pdf",
            });

            // =========================
            // REACT NATIVE EXPO APP
            // =========================
            if (isMobileApp && res.data) {
                const reader = new FileReader();

                reader.onloadend = () => {
                    try {
                        const base64 = reader.result.split(",")[1];

                        window.ReactNativeWebView.postMessage(
                            JSON.stringify({
                                type: action, // print or download
                                fileName: `Marksheet_${student.name}_${exam.name}.pdf`,
                                payload: {
                                    base64,
                                },
                            })
                        );

                        toast.success(
                            `Marksheet sent to mobile app for ${action}.`
                        );
                    } catch (e) {
                        console.error(e);
                        toast.error("Failed to process PDF for mobile app.");
                    }
                };

                reader.readAsDataURL(blob);

                return;
            } else if (!res.data) {
                toast.error("Failed to generate marksheet.");
                return;
            }


            if (res.data) {
                // const blob = new Blob([res.data], { type: 'application/pdf' });
                const blobUrl = window.URL.createObjectURL(blob);

                if (action === 'download') {

                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `Marksheet_${student.name}_${exam.name}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
                } else if (action === 'print') {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = blobUrl;
                    document.body.appendChild(iframe);

                    iframe.onload = () => {
                        setTimeout(() => {
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                        }, 500);
                    };
                }
            } else {
                toast.error('Failed to generate marksheet.');
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            let errMsg = 'Generation failed.';
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const obj = JSON.parse(text);
                    errMsg = obj.error || obj.message || errMsg;
                } catch (_) { }
            } else {
                errMsg = err.response?.data?.error || err.message || errMsg;
            }
            toast.error('Generation failed: ' + errMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAdmitCardAction = async (student, exam, action) => {
        setIsGenerating(true);
        const loadingToast = toast.loading(`Generating admit card for ${student.name}...`);
        try {
            const res = await API.post('/exam/generate-admit-card', {
                student_id: student.id,
                exam_id: exam.id
            }, {
                responseType: 'blob'
            });

            toast.dismiss(loadingToast);

            // =========================
            // REACT NATIVE EXPO APP
            // =========================
            if (isMobileApp && res.data) {
                const reader = new FileReader();

                reader.onloadend = () => {
                    try {
                        const base64 = reader.result.split(",")[1];

                        window.ReactNativeWebView.postMessage(
                            JSON.stringify({
                                type: action, // print or download
                                fileName: `AdmitCard_${student.name}_${exam.name}.pdf`,
                                payload: {
                                    base64,
                                },
                            })
                        );

                        toast.success(
                            `Admit Card sent to mobile app for ${action}.`
                        );
                    } catch (e) {
                        console.error(e);
                        toast.error("Failed to process PDF for mobile app.");
                    }
                };

                reader.readAsDataURL(blob);

                return;
            } else if (!res.data) {
                toast.error("Failed to generate admit card.");
                return;
            }

            if (res.data) {
                const blob = new Blob([res.data], { type: 'application/pdf' });
                const blobUrl = window.URL.createObjectURL(blob);

                if (action === 'download') {
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `AdmitCard_${student.name}_${exam.name}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
                } else if (action === 'print') {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = blobUrl;
                    document.body.appendChild(iframe);

                    iframe.onload = () => {
                        setTimeout(() => {
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                        }, 500);
                    };
                }
            } else {
                toast.error('Failed to generate admit card.');
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            let errMsg = 'Generation failed.';
            if (err.response?.data instanceof Blob) {
                try {
                    const text = await err.response.data.text();
                    const obj = JSON.parse(text);
                    errMsg = obj.error || obj.message || errMsg;
                } catch (_) { }
            } else {
                errMsg = err.response?.data?.error || err.message || errMsg;
            }
            toast.error('Generation failed: ' + errMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    const generatePerformanceReportPDF = (student) => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text("NIYATI PUBLIC SCHOOL", 105, 15, { align: "center" });
        doc.setFontSize(14);
        doc.text("CONSOLIDATED PERFORMANCE REPORT", 105, 25, { align: "center" });

        doc.setFontSize(10);
        doc.text(`Student: ${student.name}`, 20, 40);
        doc.text(`Roll No: ${student.roll_no}`, 20, 45);
        doc.text(`Grade: ${student.grade_name}`, 20, 50);

        let currentY = 60;
        student.exams.forEach(exam => {
            doc.setFontSize(12);
            doc.text(`Exam: ${exam.name} (${new Date(exam.date).toLocaleDateString()})`, 20, currentY);

            const tableBody = exam.subjects.map(sub => [
                sub.subject_name,
                sub.max_marks,
                sub.attendance_status === 'Absent' ? 'AB' : sub.marks_obtained,
                sub.grade
            ]);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Subject', 'Max Marks', 'Marks Obtained', 'Grade']],
                body: tableBody,
                theme: 'striped',
                headStyles: { fillColor: [99, 102, 241] },
            });

            currentY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY + 40) + 15;

            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }
        });

        doc.save(`${student.name}_Performance_Report.pdf`);
    };

    return (
        <div className="space-y-4 md:space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 pb-20">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 md:p-10 shadow-xl text-white mx-2 md:mx-0">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                    <div>
                        <h1 className="text-2xl md:text-5xl font-extrabold tracking-tight">Examination System</h1>
                        <p className="mt-2 md:mt-4 text-blue-100/90 text-sm md:text-xl max-w-2xl leading-relaxed">
                            A centralized hub for assessment planning, results management, and comprehensive student academic tracking.
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-2 md:px-6 max-w-7xl mx-auto w-full">
                <Tabs defaultValue="exams" className="w-full">
                    <TabsList className="flex flex-col md:grid md:grid-cols-2 mb-6 md:mb-8 bg-gray-100/50 dark:bg-gray-800/70 p-1.5 rounded-2xl h-auto md:h-13 gap-1.5 shadow-inner">
                        <TabsTrigger value="exams" className="w-full rounded-xl text-sm md:text-xl py-3 md:py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-lg transition-all duration-300">
                            Management & Exams
                        </TabsTrigger>
                        <TabsTrigger value="reports" className="w-full rounded-xl text-sm md:text-xl py-3 md:py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-lg transition-all duration-300">
                            Student Reports & Analytics
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="exams" className="space-y-4">
                        <Card className="border-0 shadow-lg overflow-hidden rounded-3xl bg-white dark:bg-gray-900/40 backdrop-blur-sm">
                            <CardContent className="p-3 md:p-8">
                                <div className="flex flex-col lg:flex-row gap-4 md:gap-6 mb-8">
                                    <div className="flex-1 relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search exam name..."
                                            className="w-full pl-11 pr-4 py-3 md:py-2 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 bg-gray-50/50 dark:bg-gray-950/50 text-sm md:text-base transition-all"
                                            value={filterExamsSearch}
                                            onChange={(e) => setFilterExamsSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 lg:flex gap-2 md:gap-1">
                                        <div className="w-full lg:w-48">
                                            <Select value={filterExamsGrade} onValueChange={setFilterExamsGrade}>
                                                <SelectTrigger className="bg-gray-50/50 dark:bg-gray-950/50 border-2 border-gray-100 dark:border-gray-800 rounded-2xl h-full py-3 md:py-4 shadow-none focus:ring-4 focus:ring-primary/10">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Filter className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0 text-muted-foreground" />
                                                        <SelectValue placeholder="Grade" className="truncate" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl shadow-2xl">
                                                    <SelectItem value="all">All Grades</SelectItem>
                                                    {grades.map(g => (
                                                        <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-full lg:w-56">
                                            <Select value={filterExamsAcademicYear} onValueChange={setFilterExamsAcademicYear}>
                                                <SelectTrigger className="bg-gray-50/50 dark:bg-gray-950/50 border-2 border-gray-100 dark:border-gray-800 rounded-2xl h-full py-3 md:py-4 shadow-none focus:ring-4 focus:ring-primary/10">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Calendar className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0 text-muted-foreground" />
                                                        <SelectValue placeholder="Academic Year" className="truncate" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl shadow-2xl">
                                                    <SelectItem value="all">All Years</SelectItem>
                                                    {academicYears.map(y => (
                                                        <SelectItem key={y.id} value={y.id.toString()}>{y.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                <ExamList
                                    exams={exams}
                                    onAddMarks={openAddMarksDialog}
                                    onAddExam={openAddDialog}
                                    onEditExam={openEditDialog}
                                    onCreateRoutine={openRoutineDialog}
                                    onTogglePublish={togglePublish}
                                    onToggleResultsPublish={toggleResultsPublish}
                                    deleteExam={deleteExam}
                                    hasMore={hasMore}
                                    isLoading={isLoading}
                                    currentPage={currentPage}
                                    onNextPage={handleNextPage}
                                    onPrevPage={handlePrevPage}
                                    onRefresh={() => loadExams(true)}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="reports" className="space-y-6">
                        <Card className="border-0 shadow-lg overflow-hidden rounded-3xl bg-white dark:bg-gray-900/40 backdrop-blur-sm">
                            <CardContent className="p-3 md:p-8">
                                <div className="flex flex-col lg:flex-row gap-4 md:gap-6 mb-8">
                                    <div className="flex-1 relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search name or roll number..."
                                            className="w-full pl-11 pr-4 py-3 md:py-2 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 bg-gray-50/50 dark:bg-gray-950/50 text-sm md:text-base transition-all"
                                            value={filterSearch}
                                            onChange={(e) => setFilterSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 lg:flex gap-3 md:gap-4">
                                        <div className="w-full lg:w-48">
                                            <Select value={filterGrade} onValueChange={setFilterGrade}>
                                                <SelectTrigger className="bg-gray-50/50 dark:bg-gray-950/50 border-2 border-gray-100 dark:border-gray-800 rounded-2xl h-full py-3 md:py-4 shadow-none focus:ring-4 focus:ring-primary/10">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Filter className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0 text-muted-foreground" />
                                                        <SelectValue placeholder="Grade" className="truncate" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl shadow-2xl">
                                                    <SelectItem value="all">All Grades</SelectItem>
                                                    {grades.map(g => (
                                                        <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-full lg:w-56">
                                            <Select value={filterAcademicYear} onValueChange={setFilterAcademicYear}>
                                                <SelectTrigger className="bg-gray-50/50 dark:bg-gray-950/50 border-2 border-gray-100 dark:border-gray-800 rounded-2xl h-full py-3 md:py-4 shadow-none focus:ring-4 focus:ring-primary/10">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Calendar className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0 text-muted-foreground" />
                                                        <SelectValue placeholder="Academic Year" className="truncate" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl shadow-2xl">
                                                    <SelectItem value="all">All Years</SelectItem>
                                                    {academicYears.map(y => (
                                                        <SelectItem key={y.id} value={y.id.toString()}>{y.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border">
                                    <Table>
                                        <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                                            <TableRow>
                                                <TableHead>Roll No</TableHead>
                                                <TableHead>Student Name</TableHead>
                                                <TableHead>Grade</TableHead>
                                                <TableHead>Exams Taken</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                        Loading summaries...
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredSummaries.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                        No students found matching filters.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredSummaries.map((student) => (
                                                    <TableRow key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                                                        <TableCell className="font-medium">{student.roll_no || 'N/A'}</TableCell>
                                                        <TableCell>{student.name}</TableCell>
                                                        <TableCell>{student.grade_name || 'N/A'}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                                {student.exams.map(ex => (
                                                                    <Badge key={ex.id} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                                                        {ex.name} ({new Date(ex.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant="outline" size="sm" className="gap-2">
                                                                            <Printer className="h-3.5 w-3.5" /> Marksheet
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-64 p-2 shadow-xl rounded-xl border border-gray-100 dark:border-gray-800">
                                                                        <div className="space-y-1">
                                                                            <p className="text-xs font-semibold px-2 py-1.5 border-b mb-1.5 text-muted-foreground uppercase tracking-wider">Select Exam Action</p>
                                                                            {student.exams.map(ex => (
                                                                                <div key={ex.id} className="flex items-center justify-between group rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 transition-colors">
                                                                                    <span className="text-sm font-medium pl-1 text-gray-700 dark:text-gray-300">{ex.name}</span>
                                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                                                                                            onClick={() => handleMarksheetAction(student, ex, 'download')}
                                                                                            title="Download PDF"
                                                                                            disabled={isGenerating}
                                                                                        >
                                                                                            <Download className="h-4 w-4" />
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                                                                            onClick={() => handleMarksheetAction(student, ex, 'print')}
                                                                                            title="Print directly"
                                                                                            disabled={isGenerating}
                                                                                        >
                                                                                            <Printer className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>

                                                                {student.due_cleared ? (
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button variant="outline" size="sm" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-900 dark:hover:bg-indigo-950/30">
                                                                                <FileText className="h-3.5 w-3.5" /> Admit Card
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-64 p-2 shadow-xl rounded-xl border border-gray-100 dark:border-gray-800">
                                                                            <div className="space-y-1">
                                                                                <p className="text-xs font-semibold px-2 py-1.5 border-b mb-1.5 text-muted-foreground uppercase tracking-wider">Select Admit Card</p>
                                                                                {student.exams.map(ex => (
                                                                                    <div key={ex.id} className="flex items-center justify-between group rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-1.5 transition-colors">
                                                                                        <span className="text-sm font-medium pl-1 text-gray-700 dark:text-gray-300">{ex.name}</span>
                                                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                                                                                                onClick={() => handleAdmitCardAction(student, ex, 'download')}
                                                                                                title="Download Admit Card"
                                                                                                disabled={isGenerating}
                                                                                            >
                                                                                                <Download className="h-4 w-4" />
                                                                                            </Button>
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                                                                                onClick={() => handleAdmitCardAction(student, ex, 'print')}
                                                                                                title="Print Admit Card"
                                                                                                disabled={isGenerating}
                                                                                            >
                                                                                                <Printer className="h-4 w-4" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                ) : (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="gap-2 text-rose-500 border-rose-200 bg-rose-50/50 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:border-rose-950 dark:bg-rose-950/10 cursor-not-allowed"
                                                                        title="Admit Card locked: Student has pending fee dues."
                                                                    >
                                                                        <Lock className="h-3.5 w-3.5" /> Dues Pending
                                                                    </Button>
                                                                )}

                                                                <Button
                                                                    variant="default"
                                                                    size="sm"
                                                                    onClick={() => openPerformanceReport(student)}
                                                                    className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                                                                >
                                                                    <TrendingUp className="h-3.5 w-3.5" /> Performance Report
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <CreateExamDialog
                    key={selectedExam ? `edit-${selectedExam.id}` : 'add-new'}
                    open={isDialogOpen}
                    onOpenChange={handleDialogClose}
                    examToEdit={selectedExam}
                    onSuccess={loadExams}
                    classes={classes}
                    subjects={subjects}
                    grades={grades}
                />

                <AddExamMarksDialog
                    key={selectedExam ? `marks-${selectedExam.id}` : 'add-marks'}
                    open={isAddMarksDialogOpen}
                    onOpenChange={handleAddMarksDialogClose}
                    exam={selectedExam}
                    onSuccess={loadExams}
                />

                <CreateRoutineDialog
                    key={selectedExam ? `routine-${selectedExam.id}` : 'create-routine'}
                    open={isRoutineDialogOpen}
                    onOpenChange={handleRoutineDialogClose}
                    exam={selectedExam}
                    onSuccess={loadExams}
                />

                <StudentPerformanceReport
                    open={isReportDialogOpen}
                    onOpenChange={setIsReportDialogOpen}
                    student={selectedStudent}
                />
            </div>
        </div>
    );
}
