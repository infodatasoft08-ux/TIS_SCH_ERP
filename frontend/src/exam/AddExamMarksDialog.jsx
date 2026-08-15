import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import API from "@/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Helper: render a single number input for a mark sub-field
function MarkInput({ label, fieldKey, maxVal, value, disabled, onChange }) {
    return (
        <div className="flex items-center space-x-1">
            <span className="text-xs text-muted-foreground font-semibold whitespace-nowrap">{label}:</span>
            <Input
                type="number"
                className="w-16 h-8 text-xs p-1"
                value={value || ''}
                disabled={disabled}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                max={maxVal}
                min="0"
            />
            <span className="text-xs text-muted-foreground">/{maxVal}</span>
        </div>
    );
}

// Mobile mark input
function MobileMarkInput({ label, fieldKey, maxVal, value, disabled, onChange }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">{label} (/{maxVal}):</span>
            <Input
                type="number"
                className="w-20 h-8 text-xs"
                value={value || ''}
                disabled={disabled}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                max={maxVal}
                min="0"
            />
        </div>
    );
}

const isTrue = (val) => val === 1 || val === true || val === '1' || val === 'true' || (val && val.data && val.data[0] === 1) || (typeof Buffer !== 'undefined' && Buffer.isBuffer(val) && val[0] === 1);

export default function AddExamMarksDialog({ open, onOpenChange, exam, initialMode = "add", onSuccess }) {
    const [students, setStudents] = useState([]);
    const [marksData, setMarksData] = useState({});
    const [remarksData, setRemarksData] = useState({});
    const [principalRemarksData, setPrincipalRemarksData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mode, setMode] = useState(initialMode);
    const [totalWorkingDays, setTotalWorkingDays] = useState(exam?.total_working_days || 102);
    const [ptmDate, setPtmDate] = useState(exam?.ptm_date ? exam.ptm_date.split('T')[0] : '');
    const [globalNextClass, setGlobalNextClass] = useState('');
    const [studentsWithExistingMarks, setStudentsWithExistingMarks] = useState(new Set());

    const uniqueSubjects = useMemo(() => {
        if (!exam || !Array.isArray(exam.subjects)) return [];
        const mergedMap = new Map();
        
        exam.subjects.forEach(s => {
            const n = s.subject_name?.toLowerCase().trim();
            const isExcluded = (n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
            if (isExcluded) return;

            const key = s.subject_id || s.subject_name;
            if (!mergedMap.has(key)) {
                // Deep copy components array
                const components = Array.isArray(s.components) ? s.components.map(c => ({...c})) : [];
                mergedMap.set(key, { ...s, components });
            } else {
                const existing = mergedMap.get(key);
                if (Array.isArray(s.components)) {
                    s.components.forEach(newComp => {
                        // avoid duplicate components by component_id
                        if (!existing.components.find(c => c.component_id === newComp.component_id)) {
                            existing.components.push({...newComp});
                        }
                    });
                }
            }
        });
        
        return Array.from(mergedMap.values());
    }, [exam]);

    useEffect(() => {
        if (open && exam && (exam.class_id || exam.grade_id)) {
            setMode(initialMode);
            setTotalWorkingDays(exam.total_working_days || 102);
            setPtmDate(exam.ptm_date ? exam.ptm_date.split('T')[0] : '');
            fetchStudentsAndExistingMarks();
        } else {
            setStudents([]);
            setMarksData({});
            setRemarksData({});
            setPrincipalRemarksData({});
            setStudentsWithExistingMarks(new Set());
            setMode("add");
        }
    }, [open, exam, initialMode]);

    const emptySubjectMarks = (student) => ({
        student_academic_id: student.academic_id || student.student_academic_id || student.academic_record_id || null,
        attendance_status: 'Present',
        components: [],
        marks_obtained: '',
        grade: ''
    });

    const fetchStudentsAndExistingMarks = async () => {
        setIsLoading(true);
        try {
            let fetchUrl = `/students/get/student?grade_id=${exam.grade_id}&limit=500`;
            if (!exam.grade_id && exam.class_id) {
               fetchUrl = `/students/get/student?class_id=${exam.class_id}&limit=500`;
            }

            const [studentsRes, resultsRes] = await Promise.all([
                API.get(fetchUrl),
                API.get(`/exam/list/exam/${exam.id}/results`)
            ]);

            let fetchedStudents = studentsRes.data.students || [];

            if (exam.section_ids && exam.section_ids.length > 0) {
                fetchedStudents = fetchedStudents.filter(st => exam.section_ids.includes(st.class_id));
            } else if (exam.class_id) {
                fetchedStudents = fetchedStudents.filter(st => st.class_id === exam.class_id);
            }

            const existingResults = resultsRes.data.results || [];

            setStudents(fetchedStudents);

            const initialMarks = {};
            const initialRemarks = {};
            const initialPrincipalRemarks = {};
            fetchedStudents.forEach(student => {
                const sId = String(student.id);
                initialMarks[sId] = {};
                uniqueSubjects.forEach(sub => {
                    const subId = String(sub.subject_id);
                    initialMarks[sId][subId] = emptySubjectMarks(student);
                });
            });

            const withMarks = new Set();
            existingResults.forEach(res => {
                const sId = String(res.student_id);
                const subId = String(res.subject_id);

                const hasRealMarks = (res.components && res.components.length > 0) ||
                    (res.marks_obtained !== null && res.marks_obtained !== '') ||
                    res.attendance_status === 'Absent';

                if (hasRealMarks) withMarks.add(sId);

                if (res.teacher_remark) initialRemarks[sId] = res.teacher_remark;
                if (res.principal_remark) initialPrincipalRemarks[sId] = res.principal_remark;

                if (initialMarks[sId] && initialMarks[sId][subId]) {
                    const toStr = (v) => (v !== null && v !== undefined) ? v : '';
                    initialMarks[sId][subId] = {
                        student_academic_id: res.student_academic_id,
                        attendance_status: res.attendance_status,
                        components: res.components || [],
                        marks_obtained: res.marks_obtained !== null ? res.marks_obtained : '',
                        grade: res.grade || '',
                        is_existing: true
                    };
                }
            });

            setStudentsWithExistingMarks(withMarks);
            if (withMarks.size === 0) setMode("add");
            else setMode(initialMode);

            fetchedStudents.forEach(st => {
                const sId = String(st.id);
                if (initialMarks[sId]) {
                    Object.keys(initialMarks[sId]).forEach(subId => {
                        if (!initialMarks[sId][subId].student_academic_id) {
                            initialMarks[sId][subId].student_academic_id = st.academic_id || st.student_academic_id || st.academic_record_id || st.id;
                        }
                    });
                }
            });

            setMarksData(initialMarks);
            setRemarksData(initialRemarks);
            setPrincipalRemarksData(initialPrincipalRemarks);
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
        const totalMarks = parseFloat(maxMarks);
        if (isNaN(numMarks) || isNaN(totalMarks) || totalMarks <= 0) return '';
        const passMarks = parseFloat(passingMarks) || 35;
        if (numMarks < passMarks) return 'F';
        const percentage = (numMarks / totalMarks) * 100;
        if (percentage >= 91) return 'A+';
        if (percentage >= 81) return 'A';
        if (percentage >= 71) return 'B+';
        if (percentage >= 61) return 'B';
        if (percentage >= 51) return 'C';
        if (percentage >= 41) return 'D';
        return 'P';
    };

    // Field -> max mark map for validation
    

    

    const handleMarkChange = (studentId, subjectId, field, value) => {
        const sId = String(studentId);
        const subId = String(subjectId);
        const groupSub = uniqueSubjects.find(s => String(s.subject_id) === subId);

        setMarksData(prev => {
            const updated = { ...prev };
            const studentData = { ...updated[sId] };
            const subjectData = { ...studentData[subId] };

            if (field.startsWith('comp_')) {
                const compId = parseInt(field.split('_')[1]);
                let compArr = subjectData.components || [];
                compArr = [...compArr]; // clone array
                const idx = compArr.findIndex(c => c.component_id === compId);

                // Clamp value to max component marks
                if (groupSub && Array.isArray(groupSub.components)) {
                    const compDef = groupSub.components.find(c => c.component_id === compId);
                    if (compDef && value !== '') {
                        let numVal = parseFloat(value);
                        if (!isNaN(numVal)) {
                            const max = parseFloat(compDef.max_marks || groupSub.max_marks || 0);
                            if (numVal > max) value = max.toString();
                            if (numVal < 0) value = '0';
                        }
                    }
                }

                if (idx >= 0) compArr[idx].marks_obtained = value;
                else compArr.push({ component_id: compId, marks_obtained: value });
                subjectData.components = compArr;

                if (subjectData.attendance_status === 'Present') {
                    let total = 0;
                    let anyFilled = false;
                    for (const c of compArr) {
                        if (c.marks_obtained !== '' && c.marks_obtained !== null && c.marks_obtained !== undefined) {
                            total += parseFloat(c.marks_obtained) || 0;
                            anyFilled = true;
                        }
                    }
                    if (!anyFilled) {
                        subjectData.marks_obtained = '';
                        subjectData.grade = '';
                    } else {
                        // round total so we don't show .00 if it's an integer
                        total = Number.isInteger(total) ? total : Number(total.toFixed(2));
                        subjectData.marks_obtained = total;
                        subjectData.grade = calculateGrade(total, groupSub.max_marks, groupSub.passing_marks);
                    }
                }
            } else {
                subjectData[field] = value;
                if (field === 'attendance_status' && value === 'Absent') {
                    subjectData.grade = 'AB';
                    subjectData.marks_obtained = '';
                    subjectData.components = [];
                }
                if (field === 'grade' && subjectData.attendance_status === 'Present') {
                    if (groupSub && (groupSub.subject_type === 'co-scholastic' || groupSub.subject_type === 'skill-based')) {
                         subjectData.marks_obtained = '';
                    }
                }
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
                const groupSub = uniqueSubjects.find(s => s.subject_id.toString() === subjectId.toString());
                
                const hasValidMarks = groupSub && (
                    (d.components && d.components.some(c => c.marks_obtained !== '')) ||
                    ((groupSub.subject_type === 'co-scholastic' || groupSub.subject_type === 'skill-based') && d.grade !== '')
                );

                if (hasValidMarks || d.attendance_status === 'Absent' || d.is_existing) {
                    payloadMarks.push({
                        student_id: parseInt(studentId),
                        student_academic_id: d.student_academic_id,
                        subject_id: parseInt(subjectId),
                        attendance_status: d.attendance_status,
                        components: d.attendance_status === 'Present' ? d.components : [],
                        grade: d.grade === 'none' ? null : (d.grade || null),
                        teacher_remark: remarksData[studentId] || null,
                        principal_remark: principalRemarksData[studentId] || null,
                        next_class: globalNextClass || null
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
                total_working_days: totalWorkingDays ? parseInt(totalWorkingDays) : null,
                ptm_date: ptmDate || null,
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

    // Label map for sub-fields
    

    

    const renderMarkInputs = (sub, mData, disabled, studentId, isMobile = false) => {
        if (sub.subject_type === 'co-scholastic' || sub.subject_type === 'skill-based') {
            return (
                <div className="flex flex-wrap gap-4 items-center">
                    <Select
                        value={mData.grade || ''}
                        disabled={mData.attendance_status === 'Absent' || disabled}
                        onValueChange={(val) => handleMarkChange(studentId, sub.subject_id, 'grade', val)}
                    >
                        <SelectTrigger className="w-[80px] h-8 text-xs">
                            <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Null / Clear</SelectItem>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            );
        }

        const inputs = [];
        if (Array.isArray(sub.components)) {
            for (const comp of sub.components) {
                // Ensure maxVal doesn't show .00
                const rawMax = parseFloat(comp.max_marks || sub.max_marks || 0);
                const maxVal = Number.isInteger(rawMax) ? rawMax : rawMax.toFixed(2);
                
                const label = comp.name;
                const fieldKey = `comp_${comp.component_id}`;
                const onChange = (fk, v) => handleMarkChange(studentId, sub.subject_id, fk, v);
                
                let val = '';
                if (Array.isArray(mData.components)) {
                    const cData = mData.components.find(c => c.component_id === comp.component_id);
                    if (cData) {
                        const parsedV = parseFloat(cData.marks_obtained);
                        val = (isNaN(parsedV) || cData.marks_obtained === '') ? cData.marks_obtained : (Number.isInteger(parsedV) ? parsedV.toString() : parsedV.toString());
                    }
                }
                
                if (isMobile) {
                    inputs.push(
                        <MobileMarkInput key={fieldKey} label={label} fieldKey={fieldKey} maxVal={maxVal}
                            value={val} disabled={mData.attendance_status === 'Absent' || disabled}
                            onChange={onChange} />
                    );
                } else {
                    inputs.push(
                        <MarkInput key={fieldKey} label={label} fieldKey={fieldKey} maxVal={maxVal}
                            value={val} disabled={mData.attendance_status === 'Absent' || disabled}
                            onChange={onChange} />
                    );
                }
            }
        }

        // Determine displayed total without .00
        let displayTotal = '-';
        if (mData.marks_obtained !== '' && mData.marks_obtained !== undefined) {
             const t = parseFloat(mData.marks_obtained);
             displayTotal = Number.isInteger(t) ? t : t;
        }

        const subMaxRaw = parseFloat(sub.max_marks || 0);
        const displaySubMax = Number.isInteger(subMaxRaw) ? subMaxRaw : subMaxRaw.toFixed(2);

        const totalDisplay = (
            <div className={`flex items-center space-x-1 border-l pl-3 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded ${isMobile ? 'justify-between border-t pt-2 mt-1 border-l-0 pl-0' : ''}`}>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total:</span>
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                    {displayTotal}
                </span>
                <span className="text-xs text-muted-foreground">/{displaySubMax}</span>
            </div>
        );

        if (isMobile) {
            return (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-md border">
                    {inputs}
                    {totalDisplay}
                </div>
            );
        }

        return (
            <div className="flex flex-wrap gap-2.5 w-full items-center">
                {inputs}
                {totalDisplay}
            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-screen h-[100dvh] max-w-none border-0 rounded-none p-4 sm:p-6 sm:w-full sm:max-w-5xl sm:h-auto sm:max-h-[90vh] sm:border sm:rounded-3xl flex flex-col"
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
                            {/* Mode Toggle */}
                            <div className="flex flex-col md:flex-row bg-slate-100 dark:bg-slate-800 dark:text-white p-1 rounded-xl w-full mb-4 gap-1">
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

                            {/* Additional Exam Settings: Total Working Days, PTM Date, Next Class */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Total Working Days</label>
                                    <Input
                                        type="number"
                                        className="h-8 text-xs bg-white dark:bg-slate-800"
                                        value={totalWorkingDays}
                                        onChange={(e) => setTotalWorkingDays(e.target.value)}
                                        placeholder="e.g. 102"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">PTM Date</label>
                                    <Input
                                        type="date"
                                        className="h-8 text-xs bg-white dark:bg-slate-800"
                                        value={ptmDate}
                                        onChange={(e) => setPtmDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Promoted To Class (Optional)</label>
                                    <Input
                                        type="text"
                                        className="h-8 text-xs bg-white dark:bg-slate-800"
                                        value={globalNextClass}
                                        onChange={(e) => setGlobalNextClass(e.target.value)}
                                        placeholder="e.g. II (Auto-derived if empty)"
                                    />
                                </div>
                            </div>

                            {/* Student Rows */}
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
                                                <div key={student.id} className={`border rounded-xl p-1 shadow-sm transition-opacity ${isDisabled ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/10' : ''}`}>
                                                    <div className="font-semibold text-lg border-b pb-2 mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                                        <span>{student.user_name} || {student.grade_name} || {student.class_name}</span>
                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 sm:mt-0">
                                                            {isAlreadySubmitted && (
                                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs py-0.5 font-semibold">
                                                                    Marks Submitted
                                                                </Badge>
                                                            )}
                                                            <span className="text-sm dark:text-gray-300 text-gray-600 font-normal">Roll No: {student.roll_no || student.admission_number || 'N/A'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Desktop Table */}
                                                    <div className="overflow-x-auto hidden md:block">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="w-[180px]">Subject</TableHead>
                                                                    <TableHead className="w-[90px]">Total Marks</TableHead>
                                                                    <TableHead className="w-[100px]">Passing Marks</TableHead>
                                                                    <TableHead className="w-[110px]">Status</TableHead>
                                                                    <TableHead>Marks Obtained</TableHead>
                                                                    <TableHead className="w-[120px]">Calculated Grade</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {uniqueSubjects.map(sub => {
                                                                    const mData = marksData[String(student.id)]?.[String(sub.subject_id)] || {};
                                                                    return (
                                                                        <TableRow key={sub.subject_id}>
                                                                            <TableCell className="font-medium">{sub.subject_name}</TableCell>
                                                                            <TableCell>{sub.subject_type === 'co-scholastic' || sub.subject_type === 'skill-based' ? '-' : Number.isInteger(parseFloat(sub.max_marks)) ? parseInt(sub.max_marks) : sub.max_marks}</TableCell>
                                                                            <TableCell>{sub.subject_type === 'co-scholastic' || sub.subject_type === 'skill-based' ? '-' : Number.isInteger(parseFloat(sub.passing_marks)) ? parseInt(sub.passing_marks) : sub.passing_marks}</TableCell>
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
                                                                                {renderMarkInputs(sub, mData, isDisabled, student.id, false)}
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

                                                    {/* Mobile View */}
                                                    <div className="md:hidden space-y-4 mt-4">
                                                        {uniqueSubjects.map(sub => {
                                                            const mData = marksData[String(student.id)]?.[String(sub.subject_id)] || {};
                                                            return (
                                                                <div key={sub.subject_id} className="border rounded-lg p-3 bg-white dark:bg-slate-950 shadow-sm space-y-3">
                                                                    <div className="flex justify-between items-center border-b pb-2">
                                                                        <div>
                                                                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{sub.subject_name}</div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                Max: {sub.subject_type === 'co-scholastic' || sub.subject_type === 'skill-based' ? '-' : sub.max_marks} |
                                                                                Pass: {sub.subject_type === 'co-scholastic' || sub.subject_type === 'skill-based' ? '-' : sub.passing_marks}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-xs text-muted-foreground">Grade</div>
                                                                            <div className={`font-bold ${mData.grade === 'F' || mData.grade === 'AB' ? 'text-red-500' : 'text-green-600'}`}>
                                                                                {mData.grade || '-'}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex flex-col gap-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs font-semibold">Status:</span>
                                                                            <Select
                                                                                value={mData.attendance_status || 'Present'}
                                                                                disabled={isDisabled}
                                                                                onValueChange={(val) => handleMarkChange(student.id, sub.subject_id, 'attendance_status', val)}
                                                                            >
                                                                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="Present">Present</SelectItem>
                                                                                    <SelectItem value="Absent">Absent</SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                        {renderMarkInputs(sub, mData, isDisabled, student.id, true)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Teacher and Principal Remark */}
                                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                                        <div>
                                                            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Teacher's Remark</label>
                                                            <Input
                                                                placeholder="Enter remark for this student's overall performance..."
                                                                value={remarksData[String(student.id)] || ''}
                                                                disabled={isDisabled}
                                                                onChange={(e) => setRemarksData(prev => ({ ...prev, [String(student.id)]: e.target.value }))}
                                                                className="max-w-2xl"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">Principal's Remark</label>
                                                            <Input
                                                                placeholder="Enter principal's remark for this student..."
                                                                value={principalRemarksData[String(student.id)] || ''}
                                                                disabled={isDisabled}
                                                                onChange={(e) => setPrincipalRemarksData(prev => ({ ...prev, [String(student.id)]: e.target.value }))}
                                                                className="max-w-2xl"
                                                            />
                                                        </div>
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
