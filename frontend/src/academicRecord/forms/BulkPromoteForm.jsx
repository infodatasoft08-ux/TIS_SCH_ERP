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


    const [progress, setProgress] = useState(0);
    const [promotedCount, setPromotedCount] = useState(0);
    const [totalToPromote, setTotalToPromote] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");

    const sourceGradeId = form.watch("source_grade_id");
    const selectedStudentIds = form.watch("student_ids");
    const targetGradeId = form.watch("grade_id");
    const targetClassId = form.watch("class_id");

    // Clear Selected Students on Filter Change & fetch students for selected source grade
    useEffect(() => {
        async function fetchStudents() {
            if (!open) return;
            setIsLoadingStudents(true);
            try {
                const gradeId = sourceGradeId === "all" ? "" : sourceGradeId;
                const res = await API.get(`/students/get/student?limit=1000&grade_id=${gradeId}`);
                setAllStudents(res.data.students || []);
                // Always clear student_ids when source grade changes to prevent accidental cross-grade promotions
                form.setValue("student_ids", []);
            } catch (err) {
                console.error("Failed to fetch students", err);
                toast.error("Failed to fetch students for selected class");
            } finally {
                setIsLoadingStudents(false);
            }
        }
        fetchStudents();
    }, [sourceGradeId, open, form]);

    // Filter section dropdown by target grade
    const filteredTargetSections = useMemo(() => {
        if (!targetGradeId) return [];
        return classes.filter(c => c.grade_id.toString() === targetGradeId.toString());
    }, [classes, targetGradeId]);

    // Auto-Reset Mismatched Sections when target grade changes
    useEffect(() => {
        if (targetGradeId && targetClassId) {
            const belongs = classes.some(c =>
                c.id.toString() === targetClassId.toString() &&
                c.grade_id.toString() === targetGradeId.toString()
            );
            if (!belongs) {
                form.setValue("class_id", "");
            }
        }
    }, [targetGradeId, targetClassId, classes, form]);

    async function onSubmit(values) {
        const total = values.student_ids.length;
        setIsSubmitting(true);
        setTotalToPromote(total);
        setPromotedCount(0);
        setProgress(5);
        setStatusMessage(`Preparing promotion for ${total} student${total > 1 ? 's' : ''}...`);

        // Progressive counter while promotion request processes
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                const next = prev + Math.floor(Math.random() * 15) + 5;
                const currentCount = Math.min(Math.floor((next / 100) * total), total - 1);
                setPromotedCount(currentCount);
                setStatusMessage(`Promoting student ${currentCount + 1} of ${total}...`);
                return next > 90 ? 90 : next;
            });
        }, 120);

        try {
            await API.post("/academic/bulk-promote", {
                student_ids: values.student_ids,
                academic_year_id: values.academic_year_id,
                grade_id: values.grade_id,
                class_id: values.class_id || null
            });

            clearInterval(interval);
            setProgress(100);
            setPromotedCount(total);
            setStatusMessage(`Successfully promoted ${total} student${total > 1 ? 's' : ''}!`);
            toast.success(`Successfully promoted ${total} student${total > 1 ? 's' : ''}!`);

            setTimeout(() => {
                setIsSubmitting(false);
                setProgress(0);
                onOpenChange(false);
                if (onSuccess) onSuccess();
            }, 1000);
            // onOpenChange(false);
            // if (onSuccess) onSuccess();
        } catch (err) {
            clearInterval(interval);
            setIsSubmitting(false);
            setProgress(0);
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
            <DialogContent className="w-full h-full max-w-none sm:max-w-[800px] sm:h-auto h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-xl m-0 p-0 overflow-hidden flex flex-col left-0 top-0 translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] border-0 shadow-2xl" onInteractOutside={(e) => e.preventDefault()}>
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex-shrink-0">
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

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden min-h-0 bg-background">
                        <div className="p-6 space-y-6 flex-grow overflow-y-auto min-h-0 pr-6">
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
                                                <Select
                                                    onValueChange={(val) => {
                                                        field.onChange(val);
                                                        const sections = classes.filter(c => c.grade_id.toString() === val.toString());
                                                        if (sections.length === 1) {
                                                            form.setValue("class_id", sections[0].id.toString());
                                                        } else {
                                                            const currentSection = form.getValues("class_id");
                                                            const belongs = sections.some(c => c.id.toString() === currentSection?.toString());
                                                            if (!belongs) {
                                                                form.setValue("class_id", "");
                                                            }
                                                        }
                                                    }}
                                                    value={field.value}
                                                >
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
                                                        {filteredTargetSections.map((c) => (
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
                        </div>

                        {/* Centered Overlay Progress Bar */}
                        {isSubmitting && (
                            <div className="absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                                <div className="bg-card border border-emerald-500/30 shadow-2xl rounded-2xl p-8 max-w-md w-full space-y-6 relative overflow-hidden">
                                    {/* Top decorative gradient bar */}
                                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

                                    {/* Animated Icon Header */}
                                    <div className="flex justify-center">
                                        {progress < 100 ? (
                                            <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30"></span>
                                                <ArrowUpCircle className="h-9 w-9 animate-bounce text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                        ) : (
                                            <div className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in-50 duration-300">
                                                <Check className="h-9 w-9 stroke-[3]" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Title & Message */}
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-foreground">
                                            {progress < 100 ? "Promoting Students..." : "Promotion Complete!"}
                                        </h3>
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {statusMessage}
                                        </p>
                                    </div>

                                    {/* Main Progress Bar Container */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs font-semibold">
                                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">Progress</span>
                                            <span className="font-mono bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                                {promotedCount} / {totalToPromote} ({Math.round(progress)}%)
                                            </span>
                                        </div>

                                        {/* Progress Bar Track */}
                                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-slate-300/40 dark:border-slate-700/40 shadow-inner">
                                            <div
                                                className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out shadow-md"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="p-6 border-t flex-shrink-0 gap-2 mt-0 bg-gray-50/50 dark:bg-gray-900/50">
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
            </DialogContent>
        </Dialog>
    );
}
