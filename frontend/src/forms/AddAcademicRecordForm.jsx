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
import { GraduationCap, Save, X } from "lucide-react";

const schema = z.object({
    student_id: z.string().min(1, "Student is required"),
    academic_year_id: z.coerce.string().min(1, "Academic Year is required"),
    class_id: z.coerce.string().min(1, "Class is required"),
    grade_id: z.coerce.string().min(1, "Grade is required"),
    roll_no: z.string().min(1, "Roll No is required"),
    result_status: z.enum(["pass", "fail", "detained"]),
    promoted_from_grade_id: z.string().optional(),
});

export default function AddAcademicRecordDialog({ open, onOpenChange, recordToEdit, onSuccess, students = [], classes = [], grades = [] }) {
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

    async function onSubmit(values) {
        setIsSubmitting(true);
        try {
            if (recordToEdit) {
                await API.put(`/academic/update/${recordToEdit.id}`, values);
                toast.success("Record updated successfully");
            } else {
                await API.post("/academic/create", values);
                toast.success("Record created successfully");
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
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-0 shadow-2xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                    <DialogHeader className="p-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <GraduationCap className="h-6 w-6 text-emerald-100" />
                            {recordToEdit ? "Edit Academic Record" : "Add Academic Record"}
                        </DialogTitle>
                        <p className="text-emerald-100/80 text-sm mt-1">
                            {recordToEdit ? "Update existing student record details." : "Create a new academic record for a student."}
                        </p>
                    </DialogHeader>
                </div>

                <div className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <FormItem className="col-span-1 sm:col-span-3">
                                    <FormField
                                        control={form.control}
                                        name="student_id"
                                        render={({ field }) => (
                                            <AdvancedComboboxFormField
                                                field={field}
                                                items={students}
                                                valueKey="id"
                                                labelKey="user_name"
                                                searchKey="user_name"
                                                placeholder="Select Student"
                                                searchPlaceholder="Search student..."
                                                emptyMessage="No student found."
                                                label="Student *"
                                                required
                                                renderItem={(student) => (
                                                    <div className="flex flex-col">
                                                        <span>{student.user_name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Admission: {student.admission_no}
                                                        </span>
                                                    </div>
                                                )}
                                                renderSelected={(selectedStudent) => (
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-medium">{selectedStudent.user_name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Admission: {selectedStudent.admission_no}
                                                        </span>
                                                    </div>
                                                )}
                                            />
                                        )}
                                    />
                                </FormItem>

                                <FormField
                                    control={form.control}
                                    name="class_id"
                                    render={({ field, fieldState }) => (
                                        <ComboboxFormField
                                            field={{ ...field, error: fieldState.error }}
                                            items={classes}
                                            valueKey="id"
                                            labelKey="name"
                                            searchKey="name"
                                            placeholder="Select Class"
                                            searchPlaceholder="Search class..."
                                            emptyMessage="No class found."
                                            label="Class Section *"
                                            required
                                        />
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="grade_id"
                                    render={({ field, fieldState }) => (
                                        <ComboboxFormField
                                            field={{ ...field, error: fieldState.error }}
                                            items={grades}
                                            valueKey="id"
                                            labelKey="name"
                                            searchKey="name"
                                            placeholder="Select Grade"
                                            searchPlaceholder="Search grade..."
                                            emptyMessage="No grade found."
                                            label="Grade *"
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
                                    render={({ field }) => (
                                        <ComboboxFormField
                                            field={field}
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

                            <DialogFooter className="mt-6 gap-2">
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
                </div>
            </DialogContent>
        </Dialog>
    );
}
