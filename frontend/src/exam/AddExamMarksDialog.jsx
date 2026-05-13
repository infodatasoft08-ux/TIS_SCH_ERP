import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import API from "@/api";
import { toast } from "sonner";

export default function AddExamMarksDialog({ open, onOpenChange, exam, onSuccess }) {
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState({}); // { student_id: { subject_id: { attendance_status, marks_obtained, grade } } }
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open && exam && (exam.class_id || exam.grade_id)) {
            fetchStudentsAndExistingMarks();
        } else {
            setStudents([]);
            setMarksData({});
        }
    }, [open, exam]);

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

            // Initialize marksData
            const initialMarks = {};
            fetchedStudents.forEach(student => {
                initialMarks[student.id] = {};
                exam.subjects?.forEach(sub => {
                    initialMarks[student.id][sub.subject_id] = {
                        student_academic_id: student.student_academic_id || student.academic_record_id || student.academic_id || null, // Need valid academic ID, usually student record has it
                        attendance_status: 'Present',
                        marks_obtained: '',
                        grade: ''
                    };
                });
            });

            // Populate with existing results
            existingResults.forEach(res => {
                if (initialMarks[res.student_id] && initialMarks[res.student_id][res.subject_id]) {
                    initialMarks[res.student_id][res.subject_id] = {
                        student_academic_id: res.student_academic_id,
                        attendance_status: res.attendance_status,
                        marks_obtained: res.marks_obtained !== null ? res.marks_obtained : '',
                        grade: res.grade || ''
                    };
                }
            });

            // HACK: student array might not have student_academic_id at root if it's just student list.
            // But let's assume API returns `academic_id` or we fetch it. We'll handle nulls on backend if needed, or pass the academic_record_id.
            // If student obj has `academic_record_id` we use it.
            fetchedStudents.forEach(st => {
                if (initialMarks[st.id]) {
                    Object.keys(initialMarks[st.id]).forEach(subId => {
                        initialMarks[st.id][subId].student_academic_id = st.academic_record_id || st.id; // Fallback
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
        setMarksData(prev => {
            const updated = { ...prev };
            const studentData = { ...updated[studentId] };
            const subjectData = { ...studentData[subjectId] };

            subjectData[field] = value;

            if (field === 'marks_obtained' && subjectData.attendance_status === 'Present') {
                const groupSub = exam.subjects.find(s => s.subject_id.toString() === subjectId.toString());
                if (groupSub) {
                    subjectData.grade = calculateGrade(value, groupSub.max_marks, groupSub.passing_marks);
                }
            } else if (field === 'attendance_status' && value === 'Absent') {
                subjectData.grade = 'AB';
                subjectData.marks_obtained = '';
            } else if (field === 'attendance_status' && value === 'Present') {
                subjectData.grade = '';
            }

            studentData[subjectId] = subjectData;
            updated[studentId] = studentData;
            return updated;
        });
    };

    const handleSubmit = async () => {
        const payloadMarks = [];
        Object.keys(marksData).forEach(studentId => {
            Object.keys(marksData[studentId]).forEach(subjectId => {
                const d = marksData[studentId][subjectId];
                if (d.marks_obtained !== '' || d.attendance_status === 'Absent') {
                    payloadMarks.push({
                        student_id: parseInt(studentId),
                        student_academic_id: d.student_academic_id,
                        subject_id: parseInt(subjectId),
                        attendance_status: d.attendance_status,
                        marks_obtained: d.marks_obtained !== '' ? parseFloat(d.marks_obtained) : null
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
            toast.success("Marks saved successfully and exam marked as Over");
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save marks");
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
                        <div className="space-y-8">
                            {students.map(student => (
                                <div key={student.id} className="border rounded-xl p-4 shadow-sm">
                                    <div className="font-semibold text-lg border-b pb-2 mb-4 flex justify-between">
                                        <span>{student.user_name} || {student.grade_name} || {student.class_name}</span>
                                        <span className="text-sm dark:text-gray-300 text-gray-600 font-normal">Roll No: {student.roll_no || student.admission_number || 'N/A'}</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[200px]">Subject</TableHead>
                                                    <TableHead>Total Marks</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Marks Obtained</TableHead>
                                                    <TableHead>Calculated Grade</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {exam.subjects?.filter(s => {
                                                    const n = s.subject_name?.toLowerCase().trim();
                                                    return !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
                                                }).map(sub => {
                                                    const mData = marksData[student.id]?.[sub.subject_id] || {};
                                                    return (
                                                        <TableRow key={sub.subject_id}>
                                                            <TableCell className="font-medium">{sub.subject_name}</TableCell>
                                                            <TableCell>{sub.max_marks}</TableCell>
                                                            <TableCell>
                                                                <Select
                                                                    value={mData.attendance_status || 'Present'}
                                                                    onValueChange={(val) => handleMarkChange(student.id, sub.subject_id, 'attendance_status', val)}
                                                                >
                                                                    <SelectTrigger className="w-[110px]">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="Present">Present</SelectItem>
                                                                        <SelectItem value="Absent">Absent</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    className="w-24"
                                                                    value={mData.marks_obtained || ''}
                                                                    disabled={mData.attendance_status === 'Absent'}
                                                                    onChange={(e) => handleMarkChange(student.id, sub.subject_id, 'marks_obtained', e.target.value)}
                                                                    max={sub.max_marks}
                                                                    min="0"
                                                                />
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
                            ))}
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
