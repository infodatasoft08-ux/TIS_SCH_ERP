import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, CheckCircle, Clock, FileText, Printer, Award, BookOpen, FileSpreadsheet } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import API from '@/api';

const formatTime12Hour = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
};

const isAcademicSubject = (sub) => {
    if (!sub) return false;
    const n = (sub.subject_name || '').toLowerCase().trim();
    if (n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break') return false;
    const st = (sub.subject_type || '').toLowerCase().trim();
    if (st === 'co-scholastic' || st === 'coscholastic' || st === 'co_scholastic' || st === 'co-curricular' || st === 'activity' || st === 'non-academic') return false;
    if (n.includes('spoken english') || n.includes('spoken hindi') || n.includes('art & craft') || n.includes('work education') || n.includes('health & physical') || n.includes('co-scholastic')) return false;
    return true;
};

const formatExamCategory = (sub) => {
    if (!sub) return 'Written';
    
    const cat = (sub.exam_category || '').toLowerCase();
    
    // If it's a written exam, just return the category name
    if (!cat.includes('oral') && !cat.includes('practical') && !cat.includes('viva')) {
        return sub.exam_category || 'Written';
    }

    // For Oral/Practical routines, dynamically check which components are assigned
    const components = [];
    if (sub.oral_max_marks > 0) components.push('Oral');
    if (sub.reading_max_marks > 0) components.push('Reading');
    if (sub.writing_comp_max_marks > 0) components.push('Writing');
    if (sub.dictation_max_marks > 0) components.push('Dictation');
    if (sub.recitation_max_marks > 0) components.push('Recitation');
    if (sub.lab_max_marks > 0) components.push('Lab');
    if (sub.ia_pr_max_marks > 0) components.push('I.A./PR');
    
    if (components.length > 0) {
        return components.join(', ');
    }
    
    return sub.exam_category;
};

const CheckExams = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Routine Dialog State
    const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
    const [selectedExamForRoutine, setSelectedExamForRoutine] = useState(null);

    // Marks / Marksheet Dialog State
    const [marksDialogOpen, setMarksDialogOpen] = useState(false);
    const [selectedExamForMarks, setSelectedExamForMarks] = useState(null);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const response = await API.get('/exam/student/exams');
            setExams(response.data.exams || []);
        } catch (error) {
            console.error("Error fetching exams:", error);
            toast.error("Failed to load exams");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenRoutine = (exam) => {
        setSelectedExamForRoutine(exam);
        setRoutineDialogOpen(true);
    };

    const handleOpenMarks = (exam) => {
        setSelectedExamForMarks(exam);
        setMarksDialogOpen(true);
    };

    const filteredExams = exams.filter(exam => {
        return exam.name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const isExamOver = (exam) => {
        if (exam.status === 'Over') return true;
        if (exam.end_date) {
            const endDate = new Date(exam.end_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (endDate < today) return true;
        }
        return false;
    };

    // Filter Routine Subjects into Academic, Written & Oral
    const routineAcademicSubjects = useMemo(() => {
        if (!selectedExamForRoutine || !Array.isArray(selectedExamForRoutine.subjects)) return [];
        return selectedExamForRoutine.subjects.filter(isAcademicSubject);
    }, [selectedExamForRoutine]);

    const { writtenRoutine, oralRoutine } = useMemo(() => {
        const written = [];
        const oral = [];
        routineAcademicSubjects.forEach(s => {
            const cat = (s.exam_category || '').toLowerCase();
            if (cat.includes('oral') || cat.includes('practical') || cat.includes('viva')) {
                oral.push(s);
            } else {
                written.push(s);
            }
        });
        return { writtenRoutine: written, oralRoutine: oral };
    }, [routineAcademicSubjects]);

    // Deduplicate and merge subjects for marksheet view (excluding co-scholastic)
    const uniqueMarksSubjects = useMemo(() => {
        if (!selectedExamForMarks || !Array.isArray(selectedExamForMarks.subjects)) return [];
        const map = new Map();
        selectedExamForMarks.subjects.forEach(s => {
            if (!isAcademicSubject(s)) return;
            const key = s.subject_id || s.subject_name;
            if (!map.has(key)) {
                map.set(key, { ...s });
            } else {
                const existing = map.get(key);
                const pick = (a, b) => (a !== null && a !== undefined && a !== '' && a !== '-') ? a : b;
                existing.marks_obtained = pick(existing.marks_obtained, s.marks_obtained);
                existing.result_grade = pick(existing.result_grade, s.result_grade);
                existing.attendance_status = pick(existing.attendance_status, s.attendance_status);

                existing.written_marks_obtained = pick(existing.written_marks_obtained, s.written_marks_obtained);
                existing.reading_marks_obtained = pick(existing.reading_marks_obtained, s.reading_marks_obtained);
                existing.writing_comp_marks_obtained = pick(existing.writing_comp_marks_obtained, s.writing_comp_marks_obtained);
                existing.dictation_marks_obtained = pick(existing.dictation_marks_obtained, s.dictation_marks_obtained);
                existing.recitation_marks_obtained = pick(existing.recitation_marks_obtained, s.recitation_marks_obtained);
                existing.oral_marks_obtained = pick(existing.oral_marks_obtained, s.oral_marks_obtained);
                existing.theory_marks_obtained = pick(existing.theory_marks_obtained, s.theory_marks_obtained);
                existing.lab_marks_obtained = pick(existing.lab_marks_obtained, s.lab_marks_obtained);
                existing.ia_pr_marks_obtained = pick(existing.ia_pr_marks_obtained, s.ia_pr_marks_obtained);

                existing.written_max_marks = existing.written_max_marks || s.written_max_marks;
                existing.reading_max_marks = existing.reading_max_marks || s.reading_max_marks;
                existing.writing_comp_max_marks = existing.writing_comp_max_marks || s.writing_comp_max_marks;
                existing.dictation_max_marks = existing.dictation_max_marks || s.dictation_max_marks;
                existing.recitation_max_marks = existing.recitation_max_marks || s.recitation_max_marks;
                existing.oral_max_marks = existing.oral_max_marks || s.oral_max_marks;
                existing.theory_max_marks = existing.theory_max_marks || s.theory_max_marks;
                existing.lab_max_marks = existing.lab_max_marks || s.lab_max_marks;
                existing.ia_pr_max_marks = existing.ia_pr_max_marks || s.ia_pr_max_marks;
            }
        });
        return Array.from(map.values());
    }, [selectedExamForMarks]);

    const renderRoutineTable = (subjectsList, title, badgeColor) => (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                    {title}
                </h4>
                <Badge variant="outline" className={cn("text-[10px] sm:text-xs", badgeColor)}>
                    {subjectsList.length} Schedule(s)
                </Badge>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900 border-b">
                        <tr>
                            <th className="p-3 font-semibold">Subject</th>
                            <th className="p-3 font-semibold">Category / Sub Subject</th>
                            <th className="p-3 font-semibold">Exam Date</th>
                            <th className="p-3 font-semibold">Sitting / Timing</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {subjectsList.map((sub, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{sub.subject_name}</td>
                                <td className="p-3">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 font-semibold">
                                        {formatExamCategory(sub)}
                                    </Badge>
                                </td>
                                <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                                    {sub.exam_date ? format(new Date(sub.exam_date), 'dd MMM yyyy (EEEE)') : 'N/A'}
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-400">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-primary">{sub.sitting || 'Single Sitting'}</span>
                                        {sub.start_time && (
                                            <span className="text-[11px] text-muted-foreground">
                                                {formatTime12Hour(sub.start_time)} - {formatTime12Hour(sub.end_time)}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List View */}
            <div className="sm:hidden space-y-2.5">
                {subjectsList.map((sub, idx) => (
                    <div key={idx} className="border rounded-lg p-3 bg-card shadow-xs space-y-2 text-xs">
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{sub.subject_name}</span>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 font-semibold text-[10px]">
                                {formatExamCategory(sub)}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between text-muted-foreground text-[11px] border-t pt-2">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                                <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>{sub.exam_date ? format(new Date(sub.exam_date), 'dd MMM yyyy') : 'N/A'}</span>
                            </div>
                            <div className="text-right">
                                <span className="font-semibold text-primary block text-[11px]">{sub.sitting || 'Single Sitting'}</span>
                                {sub.start_time && (
                                    <span className="text-[10px] text-slate-500">
                                        {formatTime12Hour(sub.start_time)} - {formatTime12Hour(sub.end_time)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Exams & Routines</h1>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1">Check exam schedules, routines, and detailed subject marks & grades.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search exams..."
                            className="pl-9 w-full md:w-[250px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-24 bg-muted/50 rounded-t-xl" />
                            <CardContent className="h-32 mt-4 space-y-2">
                                <div className="h-4 bg-muted rounded w-3/4" />
                                <div className="h-4 bg-muted rounded w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filteredExams.length === 0 ? (
                <div className="text-center py-12 border rounded-xl bg-muted/10 mx-auto max-w-2xl">
                    <div className="bg-muted/30 p-4 rounded-full w-fit mx-auto mb-4">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">No exams found</h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                        {searchQuery ? "Try adjusting your filters." : "You don't have any exams scheduled yet."}
                    </p>
                    {searchQuery && (
                        <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2 text-xs">
                            Clear all filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredExams.map((exam) => {
                        const over = isExamOver(exam);
                        const isPublished = exam.is_results_published === 1 || exam.is_results_published === true;
                        const academicSubCount = new Set((exam.subjects || []).filter(isAcademicSubject).map(s => s.subject_id || s.subject_name)).size;
                        return (
                            <Card key={exam.id} className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50 overflow-hidden flex flex-col h-full">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <Badge variant="secondary" className="mb-2 font-normal text-[10px] uppercase tracking-wider text-muted-foreground">
                                                Session: {exam.academic_year_name || 'N/A'}
                                            </Badge>
                                            <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">{exam.name}</CardTitle>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge className={cn("whitespace-nowrap text-[10px] sm:text-xs", over ? "bg-slate-600 text-white" : "bg-blue-600 text-white")}>
                                                {over ? "Exam Over" : "Upcoming"}
                                            </Badge>
                                        </div>
                                    </div>
                                    <CardDescription className="flex flex-col gap-2 mt-1 text-xs">
                                        <div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                                                <span>{exam.start_date ? format(new Date(exam.start_date), 'dd/MM/yyyy') : ''} {exam.end_date ? `to ${format(new Date(exam.end_date), 'dd/MM/yyyy')}` : ''}</span>
                                            </div>

                                            <div className="flex flex-col gap-1 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border text-slate-700 dark:text-slate-300">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-slate-500">Exam Type:</span>
                                                    <span className="font-medium text-right">{exam.custom_exam_name || exam.exam_type}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-slate-500">Roll No:</span>
                                                    <span className="font-medium">{exam.roll_no || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-slate-500">Class & Section:</span>
                                                    <span className="font-medium">{exam.class_name} - {exam.section_name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3 flex-grow space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="flex flex-col p-2 bg-muted/40 rounded-lg">
                                            <span className="text-muted-foreground text-[10px]">Academic Subjects</span>
                                            <span className="font-bold text-sm sm:text-base text-primary">{academicSubCount}</span>
                                        </div>
                                        <div className="flex flex-col p-2 bg-muted/40 rounded-lg">
                                            <span className="text-muted-foreground text-[10px]">Result Status</span>
                                            <span className={`font-bold text-[11px] sm:text-xs ${isPublished ? "text-green-600" : "text-amber-600"}`}>
                                                {isPublished ? "Published" : "Pending"}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {isPublished && (
                                        <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 p-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors" onClick={() => handleOpenMarks(exam)}>
                                            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                            <span className="text-[11px] sm:text-xs font-bold text-center">Results Published! Click to view Marks.</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-3 border-t bg-muted/5 flex flex-col sm:flex-row gap-2">
                                    <Button variant="outline" className="w-full sm:flex-1 text-xs gap-1.5" onClick={() => handleOpenRoutine(exam)}>
                                        <BookOpen className="h-3.5 w-3.5 text-blue-600 shrink-0" /> Exam Routine
                                    </Button>
                                    <Button 
                                        variant={isPublished ? "default" : "outline"} 
                                        className={`w-full sm:flex-1 text-xs gap-1.5 ${isPublished ? "bg-green-600 hover:bg-green-700 text-white" : ""}`} 
                                        onClick={() => handleOpenMarks(exam)}
                                    >
                                        <Award className="h-3.5 w-3.5 shrink-0" /> Marksheet & Marks
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* DIALOG 1: EXAM ROUTINE DIALOG */}
            <Dialog open={routineDialogOpen} onOpenChange={setRoutineDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-xl">
                    <DialogHeader className="pb-3 border-b">
                        <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-600 shrink-0" />
                            <span className="truncate">{selectedExamForRoutine?.name} - Routine</span>
                        </DialogTitle>
                        <DialogDescription className="text-[11px] sm:text-xs">
                            Date sheet and timetable for {selectedExamForRoutine?.class_name} ({selectedExamForRoutine?.academic_year_name})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 overflow-y-auto flex-grow space-y-6 min-h-0 pr-1">
                        {routineAcademicSubjects.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8 text-xs">No academic routine schedules found for this exam.</p>
                        ) : oralRoutine.length > 0 ? (
                            <>
                                {renderRoutineTable(writtenRoutine, "Written Exam Routine", "bg-blue-50 text-blue-700 border-blue-200")}
                                {renderRoutineTable(oralRoutine, "Oral / Practical Exam Routine", "bg-amber-50 text-amber-700 border-amber-200")}
                            </>
                        ) : (
                            renderRoutineTable(writtenRoutine, "Exam Routine", "bg-blue-50 text-blue-700 border-blue-200")
                        )}
                    </div>

                    <DialogFooter className="pt-3 border-t">
                        <Button type="button" variant="outline" className="w-full sm:w-auto text-xs" onClick={() => setRoutineDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DIALOG 2: MARKS / MARKSHEET DIALOG */}
            <Dialog open={marksDialogOpen} onOpenChange={setMarksDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-4 sm:p-6 rounded-xl">
                    <DialogHeader className="pb-3 border-b">
                        <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                            <Award className="h-5 w-5 text-amber-500 shrink-0" />
                            <span className="truncate">{selectedExamForMarks?.name} - Marksheet</span>
                        </DialogTitle>
                        <DialogDescription className="text-[11px] sm:text-xs">
                            Subject wise marks breakdown and overall grade performance
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 overflow-y-auto flex-grow space-y-6 min-h-0 pr-1">
                        {selectedExamForMarks && (
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                <div>
                                    <span className="text-muted-foreground block text-[10px]">Student Name:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{selectedExamForMarks.user_name || 'Student'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px]">Class & Section:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedExamForMarks.class_name} - {selectedExamForMarks.section_name}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px]">Roll Number:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedExamForMarks.roll_no || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-[10px]">Status:</span>
                                    <Badge className={cn("text-[10px]", selectedExamForMarks.is_results_published ? "bg-green-600 text-white" : "bg-amber-600 text-white")}>
                                        {selectedExamForMarks.is_results_published ? "Published" : "Pending"}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        {!selectedExamForMarks?.is_results_published ? (
                            <div className="text-center py-10 border rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 p-6 space-y-2">
                                <Clock className="h-10 w-10 text-amber-500 mx-auto" />
                                <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm sm:text-base">Results Pending Publication</h4>
                                <p className="text-xs text-amber-700 dark:text-amber-400 max-w-md mx-auto">
                                    The results and subject marks for {selectedExamForMarks?.name} have not been published by the school administration yet. Please check back later.
                                </p>
                            </div>
                        ) : uniqueMarksSubjects.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8 text-xs">No academic subject marks recorded for this exam.</p>
                        ) : (
                            <>
                                {/* Desktop Table View */}
                                <div className="hidden md:block border rounded-xl overflow-hidden shadow-sm">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 dark:bg-slate-900 border-b">
                                            <tr>
                                                <th className="p-3 font-semibold">Subject</th>
                                                <th className="p-3 font-semibold text-center">Sub-Components Breakdown</th>
                                                <th className="p-3 font-semibold text-center">Total Marks</th>
                                                <th className="p-3 font-semibold text-center">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {uniqueMarksSubjects.map((sub, idx) => {
                                                const subComps = [];
                                                const pushIfVal = (label, val, maxVal) => {
                                                    if (val !== null && val !== undefined && val !== '' && val !== '-') {
                                                        subComps.push({ label, val: Math.round(Number(val)), maxVal: maxVal ? Math.round(Number(maxVal)) : null });
                                                    }
                                                };

                                                pushIfVal('Written', sub.written_marks_obtained, sub.written_max_marks);
                                                pushIfVal('Reading', sub.reading_marks_obtained, sub.reading_max_marks);
                                                pushIfVal('Writing', sub.writing_comp_marks_obtained, sub.writing_comp_max_marks);
                                                pushIfVal('Dictation', sub.dictation_marks_obtained, sub.dictation_max_marks);
                                                pushIfVal('Recitation', sub.recitation_marks_obtained, sub.recitation_max_marks);
                                                pushIfVal('Oral', sub.oral_marks_obtained, sub.oral_max_marks);
                                                pushIfVal('Theory', sub.theory_marks_obtained, sub.theory_max_marks);
                                                pushIfVal('Lab', sub.lab_marks_obtained, sub.lab_max_marks);
                                                pushIfVal('I.A./PR', sub.ia_pr_marks_obtained, sub.ia_pr_max_marks);

                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{sub.subject_name}</td>
                                                        <td className="p-3">
                                                            {subComps.length === 0 ? (
                                                                <span className="text-slate-400 italic text-center block">-</span>
                                                            ) : (
                                                                <div className="flex flex-wrap items-center justify-center gap-1.5">
                                                                    {subComps.map((c, cIdx) => (
                                                                        <span key={cIdx} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-medium border text-slate-700 dark:text-slate-300">
                                                                            {c.label}: <strong className="text-primary">{c.val}</strong> {c.maxVal ? `/${c.maxVal}` : ''}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                                            {sub.attendance_status === 'Absent' ? (
                                                                <span className="text-red-500 font-bold">Absent</span>
                                                            ) : (
                                                                <span>
                                                                    {sub.marks_obtained !== null && sub.marks_obtained !== undefined ? Math.round(Number(sub.marks_obtained)) : '-'}
                                                                    <span className="text-xs text-muted-foreground font-normal"> / {sub.max_marks}</span>
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <Badge variant="outline" className={cn(
                                                                sub.result_grade === 'F' || sub.result_grade === 'AB' ? 'bg-red-50 text-red-600 border-red-200 font-bold' :
                                                                    sub.result_grade ? 'bg-green-50 text-green-700 border-green-200 font-bold' : 'bg-gray-50 text-gray-500'
                                                            )}>
                                                                {sub.result_grade || '-'}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards View */}
                                <div className="md:hidden space-y-3">
                                    {uniqueMarksSubjects.map((sub, idx) => {
                                        const subComps = [];
                                        const pushIfVal = (label, val, maxVal) => {
                                            if (val !== null && val !== undefined && val !== '' && val !== '-') {
                                                subComps.push({ label, val: Math.round(Number(val)), maxVal: maxVal ? Math.round(Number(maxVal)) : null });
                                            }
                                        };

                                        pushIfVal('Written', sub.written_marks_obtained, sub.written_max_marks);
                                        pushIfVal('Reading', sub.reading_marks_obtained, sub.reading_max_marks);
                                        pushIfVal('Writing', sub.writing_comp_marks_obtained, sub.writing_comp_max_marks);
                                        pushIfVal('Dictation', sub.dictation_marks_obtained, sub.dictation_max_marks);
                                        pushIfVal('Recitation', sub.recitation_marks_obtained, sub.recitation_max_marks);
                                        pushIfVal('Oral', sub.oral_marks_obtained, sub.oral_max_marks);
                                        pushIfVal('Theory', sub.theory_marks_obtained, sub.theory_max_marks);
                                        pushIfVal('Lab', sub.lab_marks_obtained, sub.lab_max_marks);
                                        pushIfVal('I.A./PR', sub.ia_pr_marks_obtained, sub.ia_pr_max_marks);

                                        return (
                                            <div key={idx} className="border rounded-xl p-3 bg-card shadow-xs space-y-2.5 text-xs">
                                                <div className="flex justify-between items-center border-b pb-2">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{sub.subject_name}</span>
                                                    <Badge variant="outline" className={cn(
                                                        sub.result_grade === 'F' || sub.result_grade === 'AB' ? 'bg-red-50 text-red-600 border-red-200 font-bold' :
                                                            sub.result_grade ? 'bg-green-50 text-green-700 border-green-200 font-bold' : 'bg-gray-50 text-gray-500'
                                                    )}>
                                                        Grade: {sub.result_grade || '-'}
                                                    </Badge>
                                                </div>

                                                {subComps.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 py-1">
                                                        {subComps.map((c, cIdx) => (
                                                            <span key={cIdx} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-medium border text-slate-700 dark:text-slate-300">
                                                                {c.label}: <strong className="text-primary">{c.val}</strong> {c.maxVal ? `/${c.maxVal}` : ''}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border">
                                                    <span className="text-muted-foreground text-[11px] font-medium">Total Subject Marks:</span>
                                                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                                        {sub.attendance_status === 'Absent' ? (
                                                            <span className="text-red-500 font-bold">Absent</span>
                                                        ) : (
                                                            <span>
                                                                {sub.marks_obtained !== null && sub.marks_obtained !== undefined ? Math.round(Number(sub.marks_obtained)) : '-'}
                                                                <span className="text-xs text-muted-foreground font-normal"> / {sub.max_marks}</span>
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter className="pt-3 border-t flex flex-col sm:flex-row justify-between items-center gap-2">
                        {selectedExamForMarks?.is_results_published ? (
                            <Button onClick={() => window.print()} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs">
                                <Printer className="h-4 w-4" /> Print / Download Marksheet
                            </Button>
                        ) : <div />}
                        <Button type="button" variant="outline" className="w-full sm:w-auto text-xs" onClick={() => setMarksDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CheckExams;