import React, { useEffect, useState, useMemo } from "react";
import API from "@/api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowUpCircle, Check, ChevronsUpDown, X, Users, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
    source_grade_id: z.string().optional(),
    student_ids: z.array(z.coerce.string()).min(1, "Select at least one student"),
    academic_year_id: z.coerce.string().min(1, "Target Academic Year is required"),
    class_id: z.coerce.string().optional(),
    grade_id: z.coerce.string().min(1, "Target Class is required"),
});

export default function BulkPromoteForm({ open, onOpenChange, onSuccess, grades = [], classes = [], academicYears = [] }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allStudents, setAllStudents] = useState([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [studentSearchOpen, setStudentSearchOpen] = useState(false);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            source_grade_id: "",
            student_ids: [],
            academic_year_id: "",
            class_id: "",
            grade_id: "",
        }
    });

    const sourceGradeId = form.watch("source_grade_id");
    const selectedStudentIds = form.watch("student_ids");

    // Fetch students when source grade changes
    useEffect(() => {
        async function fetchStudents() {
            if (!open) return;
            setIsLoadingStudents(true);
            try {
                // Fetch students based on source grade filter
                const gradeId = sourceGradeId === "all" ? "" : sourceGradeId;
                const res = await API.get(`/students/get/student?limit=1000&grade_id=${gradeId}`);
                setAllStudents(res.data.students || []);
                // Clear selected students when source grade changes to avoid cross-grade promotion errors
                // form.setValue("student_ids", []);
            } catch (err) {
                console.error("Failed to fetch students", err);
                toast.error("Failed to fetch students for selected class");
            } finally {
                setIsLoadingStudents(false);
            }
        }
        fetchStudents();
    }, [sourceGradeId, open, form]);

    async function onSubmit(values) {
        setIsSubmitting(true);
        try {
            await API.post("/academic/bulk-promote", {
                student_ids: values.student_ids,
                academic_year_id: values.academic_year_id,
                grade_id: values.grade_id,
                class_id: values.class_id
            });
            toast.success("Students promoted successfully");
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to promote students");
        } finally {
            setIsSubmitting(false);
        }
    }

    const toggleStudent = (id) => {
        const current = form.getValues("student_ids");
        const idStr = id.toString();
        if (current.includes(idStr)) {
            form.setValue("student_ids", current.filter(i => i !== idStr));
        } else {
            form.setValue("student_ids", [...current, idStr]);
        }
    };

    const selectAll = () => {
        const allIds = allStudents.map(s => s.id.toString());
        form.setValue("student_ids", allIds);
    };

    const deselectAll = () => {
        form.setValue("student_ids", []);
    };

    const selectedStudentsCount = selectedStudentIds.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden border-0 shadow-2xl" onInteractOutside={(e) => e.preventDefault()}>
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
                    <DialogHeader className="p-0">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Users className="h-6 w-6 text-emerald-100" />
                            Bulk Promotion
                        </DialogTitle>
                        <p className="text-emerald-100/80 text-sm mt-1">
                            Promote multiple students to the next academic year and class.
                        </p>
                    </DialogHeader>
                </div>

                <div className="p-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Side: Source & Selection */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Step 1: Select Students</h3>
                                    
                                    <FormField
                                        control={form.control}
                                        name="source_grade_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Filter Students by Current Class</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="All Classes" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Classes</SelectItem>
                                                        {grades.map((g) => (
                                                            <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="student_ids"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Students ({selectedStudentsCount} selected)</FormLabel>
                                                <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                className={cn(
                                                                    "w-full justify-between h-auto min-h-[40px] py-2 px-3",
                                                                    !field.value.length && "text-muted-foreground"
                                                                )}
                                                            >
                                                                <div className="flex flex-wrap gap-1 max-w-[90%]">
                                                                    {field.value.length > 0 ? (
                                                                        field.value.slice(0, 2).map((id) => {
                                                                            const s = allStudents.find(st => st.id.toString() === id);
                                                                            return s ? (
                                                                                <Badge key={id} variant="secondary" className="font-normal">
                                                                                    {s.user_name}
                                                                                </Badge>
                                                                            ) : null;
                                                                        })
                                                                    ) : (
                                                                        "Select Students"
                                                                    )}
                                                                    {field.value.length > 2 && (
                                                                        <Badge variant="secondary" className="font-normal">
                                                                            +{field.value.length - 2} more
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[400px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Search student..." />
                                                            <div className="flex items-center justify-between p-2 border-b">
                                                                <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-xs">Select All</Button>
                                                                <Button type="button" variant="ghost" size="sm" onClick={deselectAll} className="text-xs">Deselect All</Button>
                                                            </div>
                                                            <CommandList>
                                                                <CommandEmpty>{isLoadingStudents ? "Loading..." : "No student found."}</CommandEmpty>
                                                                <CommandGroup>
                                                                    <ScrollArea className="h-64">
                                                                        {allStudents.map((student) => (
                                                                            <CommandItem
                                                                                key={student.id}
                                                                                value={student.user_name}
                                                                                onSelect={() => toggleStudent(student.id)}
                                                                                className="cursor-pointer"
                                                                            >
                                                                                <div className="flex items-center gap-2 w-full">
                                                                                    <Checkbox 
                                                                                        checked={field.value.includes(student.id.toString())}
                                                                                        onCheckedChange={() => toggleStudent(student.id)}
                                                                                    />
                                                                                    <div className="flex flex-col">
                                                                                        <span className="font-medium">{student.user_name}</span>
                                                                                        <span className="text-xs text-muted-foreground">Adm: {student.admission_no} | Class: {student.grade_name}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </CommandItem>
                                                                        ))}
                                                                    </ScrollArea>
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Right Side: Target Promotion */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Step 2: Target Promotion</h3>

                                    <FormField
                                        control={form.control}
                                        name="academic_year_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Promote to Academic Year *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Academic Year" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {academicYears.map((ay) => (
                                                            <SelectItem key={ay.id} value={ay.id.toString()}>{ay.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="grade_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Promote to Class *</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Class" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {grades.map((g) => (
                                                            <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="class_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Promote to Section (Optional)</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Section" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {classes.filter(c => c.grade_id.toString() === form.watch("grade_id")).map((c) => (
                                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs mt-4">
                                        <strong>Note:</strong> Students marked as <strong>'fail'</strong> in their current record will remain in the same class but will be updated to the new academic year.
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-8 gap-2">
                                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                                    <X className="h-4 w-4 mr-1" /> Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting || selectedStudentsCount === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]">
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">Promoting...</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4" /> Bulk Promote</span>
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
