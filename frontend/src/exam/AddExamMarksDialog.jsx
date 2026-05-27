import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import API from "@/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AddExamMarksDialog({ open, onOpenChange, exam, initialMode = "add", onSuccess }) {
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState({}); // { student_id: { subject_id: { attendance_status, marks_obtained, grade } } }
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mode, setMode] = useState(initialMode); // "add" or "update"
    const [studentsWithExistingMarks, setStudentsWithExistingMarks] = useState(new Set());

    useEffect(() => {
        if (open && exam && (exam.class_id || exam.grade_id)) {
            setMode(initialMode);
            fetchStudentsAndExistingMarks();
        } else {
            setStudents([]);
            setMarksData({});
            setStudentsWithExistingMarks(new Set());
            setMode("add");
        }
    }, [open, exam, initialMode]);

    const fetchStudentsAndExistingMarks = async () => {
        setIsLoading(true);
        try {
            // Fetch students in the class or grade
            const fetchUrl = exam.class_id ? `/students/get/student?class_id=${exam.class_id}&limit=500` : `/students/get/student?grade_id=${exam.grade_id}&limit=500`;
            const [studentsRes, resultsRes] = await Promise.all([
                API.get(fetchUrl),
                API.get(`/exam/list/exam/${exam.id}/results`)
            ]);

            const fetchedStudents = studentsRes.data.students || [];
            const existingResults = resultsRes.data.results || [];

            setStudents(fetchedStudents);

            // Initialize marksData with stringified keys
            const initialMarks = {};
            fetchedStudents.forEach(student => {
                const sId = String(student.id);
                initialMarks[sId] = {};
                exam.subjects?.forEach(sub => {
                    const subId = String(sub.subject_id);
                    initialMarks[sId][subId] = {
                        student_academic_id: student.academic_id || student.student_academic_id || student.academic_record_id || null, // Need valid academic ID, usually student record has it
                        attendance_status: 'Present',
                        theory_marks_obtained: '',
                        lab_marks_obtained: '',
                        oral_marks_obtained: '',
                        marks_obtained: '',
                        grade: ''
                    };
                });
            });

            // Populate with existing results using stringified keys
            const withMarks = new Set();
            existingResults.forEach(res => {
                const sId = String(res.student_id);
                const subId = String(res.subject_id);

                // Determine if this result has actual marks filled or is absent
                const hasRealMarks = (res.theory_marks_obtained !== null && res.theory_marks_obtained !== '') ||
                    (res.lab_marks_obtained !== null && res.lab_marks_obtained !== '') ||
                    (res.oral_marks_obtained !== null && res.oral_marks_obtained !== '') ||
                    (res.marks_obtained !== null && res.marks_obtained !== '') ||
                    res.attendance_status === 'Absent';

                if (hasRealMarks) {
                    withMarks.add(sId);
                }

                if (initialMarks[sId] && initialMarks[sId][subId]) {
                    initialMarks[sId][subId] = {
                        student_academic_id: res.student_academic_id,
                        attendance_status: res.attendance_status,
                        theory_marks_obtained: res.theory_marks_obtained !== null && res.theory_marks_obtained !== undefined ? res.theory_marks_obtained : '',
                        lab_marks_obtained: res.lab_marks_obtained !== null && res.lab_marks_obtained !== undefined ? res.lab_marks_obtained : '',
                        oral_marks_obtained: res.oral_marks_obtained !== null && res.oral_marks_obtained !== undefined ? res.oral_marks_obtained : '',
                        marks_obtained: res.marks_obtained !== null ? res.marks_obtained : '',
                        grade: res.grade || ''
                    };
                }
            });
            setStudentsWithExistingMarks(withMarks);
            if (withMarks.size === 0) {
                setMode("add");
            } else {
                setMode(initialMode);
            }

            // HACK: student array might not have student_academic_id at root if it's just student list.
            // But let's assume API returns `academic_id` or we fetch it. We'll handle nulls on backend if needed, or pass the academic_record_id.
            // If student obj has `academic_record_id` we use it.
            fetchedStudents.forEach(st => {
                const sId = String(st.id);
                if (initialMarks[sId]) {
                    Object.keys(initialMarks[sId]).forEach(subId => {
                        initialMarks[sId][subId].student_academic_id = st.academic_id || st.student_academic_id || st.academic_record_id || st.id; // Fallback
                    });
                }
            });

            setMarksData(initialMarks);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch students or results");
        } finally {
            setIsLoading(false);
        }
    };

    const calculateGrade = (marks, maxMarks, passingMarks) => {
        if (marks === '' || marks === null) return '';
        const numMarks = parseFloat(marks);
        if (isNaN(numMarks)) return '';

        const percentage = (numMarks / maxMarks) * 100;
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B';
        if (percentage >= 60) return 'C';
        if (percentage >= passingMarks) return 'P';
        return 'F';
    };

    const handleMarkChange = (studentId, subjectId, field, value) => {
        const sId = String(studentId);
        const subId = String(subjectId);
        setMarksData(prev => {
            const updated = { ...prev };
            const studentData = { ...updated[sId] };
            const subjectData = { ...studentData[subId] };

            subjectData[field] = value;

            if (subjectData.attendance_status === 'Present') {
                const groupSub = exam.subjects.find(s => String(s.subject_id) === subId);
                if (groupSub) {
                    const th = groupSub.has_theory ? (parseFloat(field === 'theory_marks_obtained' ? value : subjectData.theory_marks_obtained) || 0) : 0;
                    const lb = groupSub.has_lab ? (parseFloat(field === 'lab_marks_obtained' ? value : subjectData.lab_marks_obtained) || 0) : 0;
                    const or = groupSub.has_oral ? (parseFloat(field === 'oral_marks_obtained' ? value : subjectData.oral_marks_obtained) || 0) : 0;

                    const total = th + lb + or;
                    subjectData.marks_obtained = total;
                    subjectData.grade = calculateGrade(total, groupSub.max_marks, groupSub.passing_marks);
                }
            } else if (subjectData.attendance_status === 'Absent') {
                subjectData.grade = 'AB';
                subjectData.marks_obtained = '';
                subjectData.theory_marks_obtained = '';
                subjectData.lab_marks_obtained = '';
                subjectData.oral_marks_obtained = '';
            } else if (subjectData.attendance_status === 'Present') {
                subjectData.grade = '';
            }

            studentData[subId] = subjectData;
            updated[sId] = studentData;
            return updated;
        });
    };

    const handleSubmit = async () => {
        const payloadMarks = [];
        Object.keys(marksData).forEach(studentId => {
            Object.keys(marksData[studentId]).forEach(subjectId => {
                const d = marksData[studentId][subjectId];
                const groupSub = exam.subjects.find(s => s.subject_id.toString() === subjectId.toString());
                const hasValidMarks = groupSub && (
                    (groupSub.has_theory && d.theory_marks_obtained !== '') ||
                    (groupSub.has_lab && d.lab_marks_obtained !== '') ||
                    (groupSub.has_oral && d.oral_marks_obtained !== '')
                );

                if (hasValidMarks || d.attendance_status === 'Absent') {
                    payloadMarks.push({
                        student_id: parseInt(studentId),
                        student_academic_id: d.student_academic_id,
                        subject_id: parseInt(subjectId),
                        attendance_status: d.attendance_status,
                        theory_marks_obtained: d.attendance_status === 'Present' && groupSub.has_theory && d.theory_marks_obtained !== '' ? parseFloat(d.theory_marks_obtained) : null,
                        lab_marks_obtained: d.attendance_status === 'Present' && groupSub.has_lab && d.lab_marks_obtained !== '' ? parseFloat(d.lab_marks_obtained) : null,
                        oral_marks_obtained: d.attendance_status === 'Present' && groupSub.has_oral && d.oral_marks_obtained !== '' ? parseFloat(d.oral_marks_obtained) : null
                    });
                }
            });
        });

        if (payloadMarks.length === 0) {
            toast.error("No marks entered");
            return;
        }

        setIsSubmitting(true);
        try {
            await API.post(`/exam/insert/exam/${exam.id}/results`, {
                exam_group_id: exam.id,
                marks: payloadMarks
            });
            toast.success("Marks saved successfully");
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to save marks");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl rounded-3xl max-h-[90vh] flex flex-col"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Add Marks for {exam?.name}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 pr-2">
                    {isLoading ? (
                        <div className="text-center py-10">Loading students...</div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">No students found for this exam.</div>
                    ) : (
                        <div className="space-y-6">
                            {/* Mode Toggle Button Group */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 dark:text-white p-1 rounded-xl w-fit mb-4 gap-1">
                                <Button
                                    variant={mode === 'add' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setMode('add')}
                                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${mode === 'add' ? 'bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm' : ''}`}
                                >
                                    Add Marks (Pending)
                                </Button>
                                <Button
                                    variant={mode === 'update' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => setMode('update')}
                                    className={`rounded-lg px-4 py-1.5 text-xs font-semibold ${mode === 'update' ? 'bg-white dark:bg-slate-900 text-black dark:text-white shadow-sm' : ''}`}
                                    disabled={studentsWithExistingMarks.size === 0}
                                    title={studentsWithExistingMarks.size === 0 ? "No student marks recorded yet" : ""}
                                >
                                    Update Marks (Completed: {studentsWithExistingMarks.size})
                                </Button>
                            </div>

                            {/* Render Student Rows */}
                            {(() => {
                                const displayedStudents = mode === 'update'
                                    ? students.filter(st => studentsWithExistingMarks.has(String(st.id)))
                                    : students;

                                if (displayedStudents.length === 0) {
                                    return (
                                        <div className="text-center py-12 border rounded-2xl bg-slate-50 dark:bg-slate-900/20">
                                            <p className="text-muted-foreground font-semibold">No students in this view</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-8">
                                        {displayedStudents.map(student => {
                                            const isAlreadySubmitted = studentsWithExistingMarks.has(String(student.id));
                                            const isDisabled = isAlreadySubmitted && mode === 'add';

                                            return (
                                                <div key={student.id} className={`border rounded-xl p-4 shadow-sm transition-opacity ${isDisabled ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/10' : ''}`}>
                                                    <div className="font-semibold text-lg border-b pb-2 mb-4 flex justify-between items-center">
                                                        <span>{student.user_name} || {student.grade_name} || {student.class_name}</span>
                                                        <div className="flex items-center gap-3">
                                                            {isAlreadySubmitted && (
                                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs py-0.5 font-semibold">
                                                                    Marks Submitted
                                                                </Badge>
                                                            )}
                                                            <span className="text-sm dark:text-gray-300 text-gray-600 font-normal">Roll No: {student.roll_no || student.admission_number || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="w-[180px]">Subject</TableHead>
                                                                    <TableHead className="w-[90px]">Total Marks</TableHead>
                                                                    <TableHead className="w-[110px]">Status</TableHead>
                                                                    <TableHead>Marks Obtained</TableHead>
                                                                    <TableHead className="w-[120px]">Calculated Grade</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {exam.subjects?.filter(s => {
                                                                    const n = s.subject_name?.toLowerCase().trim();
                                                                    return !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
                                                                }).map(sub => {
                                                                    const mData = marksData[String(student.id)]?.[String(sub.subject_id)] || {};
                                                                    return (
                                                                        <TableRow key={sub.subject_id}>
                                                                            <TableCell className="font-medium">{sub.subject_name}</TableCell>
                                                                            <TableCell>{sub.max_marks}</TableCell>
                                                                            <TableCell>
                                                                                <Select
                                                                                    value={mData.attendance_status || 'Present'}
                                                                                    disabled={isDisabled}
                                                                                    onValueChange={(val) => handleMarkChange(student.id, sub.subject_id, 'attendance_status', val)}
                                                                                >
                                                                                    <SelectTrigger className="w-[100px]">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="Present">Present</SelectItem>
                                                                                        <SelectItem value="Absent">Absent</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <div className="flex flex-wrap gap-4 items-center">
                                                                                    {sub.has_theory === 1 && (
                                                                                        <div className="flex items-center space-x-1">
                                                                                            <span className="text-xs text-muted-foreground font-semibold">Theory:</span>
                                                                                            <Input
                                                                                                type="number"
                                                                                                className="w-16 h-8 text-xs p-1"
                                                                                                value={mData.theory_marks_obtained || ''}
                                                                                                disabled={mData.attendance_status === 'Absent' || isDisabled}
                                                                                                onChange={(e) => handleMarkChange(student.id, sub.subject_id, 'theory_marks_obtained', e.target.value)}
                                                                                                max={sub.theory_max_marks || sub.max_marks}
                                                                                                min="0"
                                                                                            />
                                                                                            <span className="text-xs text-muted-foreground">/{sub.theory_max_marks}</span>
                                                                                        </div>
                                                                                    )}

                                                                                    {sub.has_lab === 1 && (
                                                                                        <div className="flex items-center space-x-1">
                                                                                            <span className="text-xs text-muted-foreground font-semibold">Lab:</span>
                                                                                            <Input
                                                                                                type="number"
                                                                                                className="w-16 h-8 text-xs p-1"
                                                                                                value={mData.lab_marks_obtained || ''}
                                                                                                disabled={mData.attendance_status === 'Absent' || isDisabled}
                                                                                                onChange={(e) => handleMarkChange(student.id, sub.subject_id, 'lab_marks_obtained', e.target.value)}
                                                                                                max={sub.lab_max_marks}
                                                                                                min="0"
                                                                                            />
                                                                                            <span className="text-xs text-muted-foreground">/{sub.lab_max_marks}</span>
                                                                                        </div>
                                                                                    )}

                                                                                    {sub.has_oral === 1 && (
                                                                                        <div className="flex items-center space-x-1">
                                                                                            <span className="text-xs text-muted-foreground font-semibold">Oral:</span>
                                                                                            <Input
                                                                                                type="number"
                                                                                                className="w-16 h-8 text-xs p-1"
                                                                                                value={mData.oral_marks_obtained || ''}
                                                                                                disabled={mData.attendance_status === 'Absent' || isDisabled}
                                                                                                onChange={(e) => handleMarkChange(student.id, sub.subject_id, 'oral_marks_obtained', e.target.value)}
                                                                                                max={sub.oral_max_marks}
                                                                                                min="0"
                                                                                            />
                                                                                            <span className="text-xs text-muted-foreground">/{sub.oral_max_marks}</span>
                                                                                        </div>
                                                                                    )}

                                                                                    <div className="flex items-center space-x-1 border-l pl-3 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
                                                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total:</span>
                                                                                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                                                                                            {mData.marks_obtained !== '' && mData.marks_obtained !== undefined ? mData.marks_obtained : '0'}
                                                                                        </span>
                                                                                        <span className="text-xs text-muted-foreground">/{sub.max_marks}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <span className={`font-bold ${mData.grade === 'F' || mData.grade === 'AB' ? 'text-red-500' : 'text-green-600'}`}>
                                                                                    {mData.grade || '-'}
                                                                                </span>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    );
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 mt-2 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || students.length === 0}>
                        {isSubmitting ? "Submitting..." : "Submit All Marks"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
