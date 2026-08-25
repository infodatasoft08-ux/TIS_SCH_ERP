import React, { useEffect, useState } from "react";
import API from "@/api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AdvancedComboboxFormField } from "@/widgets/AdvancedComboboxFormField";
import { ComboboxFormField } from "@/widgets/comboboxFormField";
import { GraduationCap, Save, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
    student_id: z.string().min(1, "Student is required"),
    academic_year_id: z.coerce.string().min(1, "Academic Year is required"),
    class_id: z.coerce.string().min(1, "Class is required"),
    grade_id: z.coerce.string().min(1, "Grade is required"),
    roll_no: z.string().min(1, "Roll No is required"),
    result_status: z.enum(["pass", "fail", "detained"]),
    promoted_from_grade_id: z.string().optional(),
});

export default function AddAcademicRecordDialog({ 
    open, 
    onOpenChange, 
    recordToEdit, 
    onSuccess, 
    students = [], 
    classes = [], 
    grades = [],
    existingRecords = []
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [academicYears, setAcademicYears] = useState([]);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            student_id: "",
            academic_year_id: "",
            class_id: "",
            grade_id: "",
            roll_no: "",
            result_status: "pass",
            promoted_from_grade_id: "",
        }
    });

    const selectedStudentId = form.watch("student_id");
    const selectedAcademicYearId = form.watch("academic_year_id");
    const selectedGradeId = form.watch("grade_id");

    const filteredSections = React.useMemo(() => {
        if (!selectedGradeId) return classes;
        return classes.filter(cls => cls.grade_id.toString() === selectedGradeId.toString());
    }, [classes, selectedGradeId]);

    // Reset form on open/edit
    useEffect(() => {
        if (open) {
            if (recordToEdit) {
                form.reset({
                    student_id: recordToEdit.student_id ? recordToEdit.student_id.toString() : "",
                    academic_year_id: recordToEdit.academic_year_id ? recordToEdit.academic_year_id.toString() : "",
                    class_id: recordToEdit.class_id ? recordToEdit.class_id.toString() : "",
                    grade_id: recordToEdit.grade_id ? recordToEdit.grade_id.toString() : "",
                    roll_no: recordToEdit.roll_no || "",
                    result_status: recordToEdit.result_status || "pass",
                    promoted_from_grade_id: recordToEdit.promoted_from_grade_id ? recordToEdit.promoted_from_grade_id.toString() : "",
                });
            } else {
                form.reset({
                    student_id: "",
                    academic_year_id: "",
                    class_id: "",
                    grade_id: "",
                    roll_no: "",
                    result_status: "pass",
                    promoted_from_grade_id: "",
                });
            }
        }
    }, [open, recordToEdit, form]);

    // Fetch lightweight academic years (no heavy limit=5000 call needed!)
    useEffect(() => {
        async function fetchAcademicYears() {
            try {
                const res = await API.get("/admin/get/academic-years");
                setAcademicYears(res.data.academic_years || []);
            } catch (err) {
                console.error("Failed to fetch academic years", err);
            }
        }
        if (open) fetchAcademicYears();
    }, [open]);

    // Helper: Extract student's existing academic info cleanly from pre-loaded student or record data
    const getStudentAcademicInfo = React.useCallback((studentObj) => {
        if (!studentObj) return null;
        
        // 1. Check current page records first
        const fromRecords = existingRecords.find(r => r.student_id.toString() === studentObj.id.toString());
        if (fromRecords) return fromRecords;

        // 2. Fallback to student object's existing academic join attributes from students API
        if (studentObj.academic_id || studentObj.grade_name || studentObj.class_name) {
            return {
                id: studentObj.academic_id,
                student_id: studentObj.id,
                academic_year_id: studentObj.academic_year_id,
                grade_id: studentObj.grade_id,
                class_id: studentObj.class_id,
                roll_no: studentObj.roll_no,
                grade_name: studentObj.grade_name,
                class_name: studentObj.class_name,
                academic_year_name: studentObj.academic_year,
                result_status: studentObj.result_status || 'pass'
            };
        }
        return null;
    }, [existingRecords]);

    // Selected student's record summary
    const selectedStudentObj = React.useMemo(() => {
        if (!selectedStudentId) return null;
        return students.find(s => s.id.toString() === selectedStudentId.toString());
    }, [selectedStudentId, students]);

    const existingStudentRec = React.useMemo(() => {
        return getStudentAcademicInfo(selectedStudentObj);
    }, [selectedStudentObj, getStudentAcademicInfo]);

    // When selecting a student in "Add" mode, auto-fill existing details if present
    const handleStudentSelect = (newStudentId) => {
        form.setValue("student_id", newStudentId, { shouldValidate: true });
        if (!recordToEdit && newStudentId) {
            const st = students.find(s => s.id.toString() === newStudentId.toString());
            const existingRec = getStudentAcademicInfo(st);
            if (existingRec) {
                if (existingRec.academic_year_id && !form.getValues("academic_year_id")) {
                    form.setValue("academic_year_id", existingRec.academic_year_id.toString(), { shouldValidate: true });
                }
                if (existingRec.grade_id) {
                    form.setValue("grade_id", existingRec.grade_id.toString(), { shouldValidate: true });
                }
                if (existingRec.class_id) {
                    form.setValue("class_id", existingRec.class_id.toString(), { shouldValidate: true });
                }
                if (existingRec.roll_no) {
                    form.setValue("roll_no", existingRec.roll_no, { shouldValidate: true });
                }
                if (existingRec.result_status) {
                    form.setValue("result_status", existingRec.result_status, { shouldValidate: true });
                }
            }
        }
    };

    async function onSubmit(values) {
        setIsSubmitting(true);
        try {
            if (recordToEdit) {
                await API.put(`/academic/update/${recordToEdit.id}`, values);
                toast.success("Record updated successfully");
            } else {
                await API.post("/academic/create", values);
                toast.success("Academic record saved successfully");
            }
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to save record");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full h-full max-w-none sm:max-w-[700px] sm:h-auto h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-xl m-0 p-0 overflow-hidden flex flex-col left-0 top-0 translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] border-0 shadow-2xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex-shrink-0">
                    <DialogHeader className="p-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <GraduationCap className="h-6 w-6 text-emerald-100" />
                            {recordToEdit ? "Edit Academic Record" : "Add Academic Record"}
                        </DialogTitle>
                        <p className="text-emerald-100/80 text-sm mt-1">
                            {recordToEdit ? "Update existing student record details." : "Create or update an academic session record for a student."}
                        </p>
                    </DialogHeader>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden min-h-0 bg-background">
                        <div className="p-6 space-y-5 flex-grow overflow-y-auto min-h-0 pr-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <FormItem className="col-span-1 sm:col-span-3">
                                    <FormField
                                        control={form.control}
                                        name="student_id"
                                        render={({ field }) => (
                                            <AdvancedComboboxFormField
                                                field={{
                                                    ...field,
                                                    onChange: handleStudentSelect
                                                }}
                                                items={students}
                                                valueKey="id"
                                                labelKey="user_name"
                                                searchKey="user_name"
                                                placeholder="Select Student"
                                                searchPlaceholder="Search student..."
                                                emptyMessage="No student found."
                                                label="Student *"
                                                required
                                                renderItem={(student) => {
                                                    const rec = getStudentAcademicInfo(student);
                                                    return (
                                                        <div className="flex items-center justify-between w-full py-0.5">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-sm">{student.user_name}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Admission: {student.admission_no} {student.grade_name ? `• ${student.grade_name}` : ''}
                                                                </span>
                                                            </div>
                                                            <div className="ml-2 flex-shrink-0">
                                                                {rec ? (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                        {rec.grade_name || "Has Record"}
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/50">
                                                                        <AlertCircle className="h-3 w-3" />
                                                                        No Record
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                                renderSelected={(selectedStudent) => {
                                                    const rec = getStudentAcademicInfo(selectedStudent);
                                                    return (
                                                        <div className="flex justify-between items-center w-full">
                                                            <div className="flex flex-col text-left">
                                                                <span className="font-medium">{selectedStudent.user_name}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Admission: {selectedStudent.admission_no}
                                                                </span>
                                                            </div>
                                                            {rec && (
                                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[11px]">
                                                                    Existing: {rec.grade_name || "Record Found"}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    );
                                                }}
                                            />
                                        )}
                                    />
                                </FormItem>

                                <FormField
                                    control={form.control}
                                    name="grade_id"
                                    render={({ field, fieldState }) => (
                                        <ComboboxFormField
                                            field={{
                                                ...field,
                                                onChange: (newGradeId) => {
                                                    field.onChange(newGradeId);
                                                    if (newGradeId) {
                                                        const availableSections = classes.filter(cls => cls.grade_id.toString() === newGradeId.toString());
                                                        if (availableSections.length === 1) {
                                                            form.setValue("class_id", availableSections[0].id.toString(), { shouldValidate: true });
                                                        } else if (availableSections.length > 1) {
                                                            const currentSection = form.getValues("class_id");
                                                            if (currentSection) {
                                                                const belongs = availableSections.some(cls => cls.id.toString() === currentSection.toString());
                                                                if (!belongs) {
                                                                    form.setValue("class_id", "", { shouldValidate: true });
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                            fieldState={fieldState}
                                            items={grades}
                                            valueKey="id"
                                            labelKey="name"
                                            searchKey="name"
                                            placeholder="Select Class"
                                            searchPlaceholder="Search Class..."
                                            emptyMessage="No Class found."
                                            label="Class *"
                                            required
                                        />
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="class_id"
                                    render={({ field, fieldState }) => (
                                        <ComboboxFormField
                                            field={{
                                                ...field,
                                                onChange: (newClassId) => {
                                                    field.onChange(newClassId);
                                                    if (newClassId) {
                                                        const selectedClassData = classes.find(cls => cls.id.toString() === newClassId.toString());
                                                        if (selectedClassData) {
                                                            if (form.getValues("grade_id") !== selectedClassData.grade_id.toString()) {
                                                                form.setValue("grade_id", selectedClassData.grade_id.toString(), { shouldValidate: true });
                                                            }
                                                        }
                                                    }
                                                }
                                            }}
                                            fieldState={fieldState}
                                            items={filteredSections}
                                            valueKey="id"
                                            labelKey="name"
                                            searchKey="name"
                                            placeholder="Select Section"
                                            searchPlaceholder="Search class..."
                                            emptyMessage="No class found."
                                            label="Class Section *"
                                            required
                                        />
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="academic_year_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Academic Year *</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="bg-gray-50 dark:bg-gray-900">
                                                        <SelectValue placeholder="Select Year" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {academicYears.map((ay) => (
                                                            <SelectItem key={ay.id} value={ay.id.toString()}>
                                                                {ay.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <FormField
                                    control={form.control}
                                    name="roll_no"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Roll No *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Enter Roll No" className="bg-gray-50 dark:bg-gray-900" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="result_status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Result Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="bg-gray-50 dark:bg-gray-900">
                                                        <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="pass" className="text-emerald-600 font-medium">Pass</SelectItem>
                                                    <SelectItem value="fail" className="text-red-500 font-medium">Fail</SelectItem>
                                                    <SelectItem value="detained" className="text-orange-500 font-medium">Detained</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="promoted_from_grade_id"
                                    render={({ field, fieldState }) => (
                                        <ComboboxFormField
                                            field={field}
                                            fieldState={fieldState}
                                            items={grades}
                                            valueKey="id"
                                            labelKey="name"
                                            searchKey="name"
                                            placeholder="Select Grade"
                                            searchPlaceholder="Search grade..."
                                            emptyMessage="No grade found."
                                            label="Promoted From (Opt)"
                                        />
                                    )}
                                />
                            </div>

                            {existingStudentRec && !recordToEdit && (
                                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                    <span>
                                        <strong>Note:</strong> Selected student already has a record ({existingStudentRec.grade_name || ''}). Submitting will update their session record cleanly.
                                    </span>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-6 border-t flex-shrink-0 gap-2 mt-0 bg-gray-50/50 dark:bg-gray-900/50">
                            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                                <X className="h-4 w-4 mr-1" /> Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">Saving...</span>
                                ) : (
                                    <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Save Record</span>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
