import React, { useEffect, useState, useMemo } from "react";
import API from "@/api";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

// shadcn components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { FilePen, Trash2, Plus, ClipboardList, BookOpen, Users, Calendar as CalendarIcon, CheckCircle2, Clock } from "lucide-react";
import DataTable from "@/widgets/DataTable";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";
import { downloadFile } from "@/utils/fileHelper";
import { DatePicker } from "@/components/ui/date-picker";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Form } from "@/components/ui/form";
import { ComboboxFormField } from "@/widgets/comboboxFormField";
import { ScrollArea } from "@/components/ui/scroll-area";

const assignmentSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    class_id: z.coerce.string().min(1, "Class is required"),
    subject_id: z.coerce.string().min(1, "Subject is required"),
    dueDate: z.string().min(1, "Due date is required"),
    maxMarks: z.coerce.number().min(0).optional(),
    academic_year_id: z.coerce.string().optional(),
});

export default function Assignment() {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm({
    //     resolver: zodResolver(assignmentSchema),
    //     defaultValues: {
    //         title: "",
    //         description: "",
    //         class_id: "",
    //         subject_id: "",
    //         dueDate: "",
    //         maxMarks: 100,
    //         academic_year: "",
    //     }
    // });

    const form = useForm({
        resolver: zodResolver(assignmentSchema),
        defaultValues: {
            title: "",
            description: "",
            class_id: "",
            subject_id: "",
            dueDate: "",
            maxMarks: 100,
            academic_year_id: "",
        }
    });

    const { register, reset, setValue, control, formState: { errors } } = form;

    // Pagination states
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    useEffect(() => {
        loadData(true);
    }, []);

    const loadData = async (reset = false, newOffset = offset) => {
        if (reset) {
            setIsLoading(true);
            newOffset = 0;
            setHasMore(true);
        } else {
            setIsLoading(true);
        }

        try {
            const promises = [
                API.get(`/assignments/get/assignment?limit=${limit}&offset=${newOffset}`)
            ];

            if (reset) {
                promises.push(API.get("/admin/get/classes"));
                promises.push(API.get("/admin/get/subjects"));
                promises.push(API.get("/admin/get/academic-years"));
            }

            const results = await Promise.all(promises);
            const assignRes = results[0];

            const newAssignments = assignRes.data.assignments || [];

            // Always replace the data for the current page
            setAssignments(newAssignments);

            if (reset) {
                setClasses(results[1].data.classes || []);
                setSubjects(results[2].data.subjects || []);
                setAcademicYears(results[3].data.academic_years || []);
            }

            setHasMore(newAssignments.length === limit);
            setOffset(newOffset);

        } catch (err) {
            console.error("Error loading data:", err);
            toast.error("Failed to load data");
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    };

    const handleNextPage = () => {
        if (hasMore) loadData(false, offset + limit);
    };

    const handlePrevPage = () => {
        if (offset >= limit) loadData(false, offset - limit);
    };

    const currentPage = Math.floor(offset / limit) + 1;

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            const payload = {
                title: data.title,
                description: data.description,
                class_id: parseInt(data.class_id),
                subject_id: parseInt(data.subject_id),
                due_date: data.dueDate,
                max_marks: data.maxMarks,
                academic_year_id: data.academic_year_id,
                assigned_date: format(new Date(), "yyyy-MM-dd")
            };

            if (editingAssignment) {
                await API.put(`/assignments/update/assignment/${editingAssignment.id}`, payload);
                toast.success("Assignment updated successfully");
            } else {
                await API.post("/assignments/add/assignment", payload);
                toast.success("Assignment created successfully");
            }
            setIsDialogOpen(false);
            reset();
            setEditingAssignment(null);
            loadData(true);
        } catch (err) {
            console.error("Error saving assignment:", err);
            toast.error(err.response?.data?.error || "Failed to save assignment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (assignment) => {
        setSelectedClass(assignment.class_id || "");
        setEditingAssignment(assignment);
        setValue("title", assignment.title);
        setValue("description", assignment.description || "");
        setValue("class_id", String(assignment.class_id || ""));
        setValue("subject_id", String(assignment.subject_id || ""));
        setValue("dueDate", assignment.due_date ? assignment.due_date.split('T')[0] : "");
        setValue("maxMarks", assignment.max_marks || 100);
        setValue("academic_year_id", assignment.academic_year_id ? assignment.academic_year_id.toString() : "");
        setIsDialogOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this assignment?")) return;
        try {
            await API.delete(`/assignments/del/assignment/${id}`);
            toast.success("Assignment deleted");
            loadData(true);
        } catch (err) {
            toast.error("Failed to delete assignment");
        }
    };

    const handleDeleteSubmission = async (id) => {
        if (!confirm("Are you sure you want to delete this assignment submission?")) return;
        try {
            await API.delete(`/assignments/del/assignment/submissions/${id}`);
            toast.success("Assignment submission deleted");
            loadData(true);
            setIsSubmissionsOpen(false)
        } catch (err) {
            toast.error("Failed to delete assignment submission");
        }
    };

    useEffect(() => {
        if (selectedClass) {
            const cls = classes.find(c => c.id === selectedClass);
            if (cls && cls.grade_id) {
                fetchGradeSubjects(cls.grade_id);
            } else {
                setFilteredSubjects([]);
            }
        }
    }, [selectedClass, classes]);

    const fetchGradeSubjects = async (gradeId) => {
        try {
            const res = await API.get(`/admin/get/grade/${gradeId}/subjects`);
            setFilteredSubjects(res.data.subjects || []);
        } catch (err) {
            console.error("Error fetching grade subjects:", err);
            toast.error("Failed to fetch subjects");
        }
    };

    const columns = useMemo(() => [
        {
            accessorKey: "title",
            header: "Title",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-gray-100">{row.original.title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</span>
                </div>
            ),
        },
        {
            accessorKey: "class_id",
            header: "Class & Section",
            cell: ({ row }) => {
                const cls = classes.find(c => c.id === row.original.class_id);
                return <span>{cls ? `${cls.grade_name} - ${cls.name}` : "N/A"}</span>;
            },
        },
        {
            accessorKey: "subject_id",
            header: "Subject",
            cell: ({ row }) => {
                const sub = subjects.find(s => s.id === row.original.subject_id);
                return <span>{sub ? sub.name : "N/A"}</span>;
            },
        },
        {
            accessorKey: "due_date",
            header: "Due Date",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-amber-500" />
                    {row.original.due_date ? format(new Date(row.original.due_date), "MMM dd, yyyy") : "N/A"}
                </div>
            ),
        },
        {
            accessorKey: "max_marks",
            header: "Max Marks",
            cell: ({ row }) => <span className="font-medium">{row.original.max_marks || "-"}</span>,
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewSubmissions(row.original)}
                        className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 gap-1 px-3"
                    >
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-bold">Submissions</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <FilePen className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        }
    ], [classes, subjects]);

    const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
    const [selectedAssignmentForSub, setSelectedAssignmentForSub] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [loadingSubmissions, setLoadingSubmissions] = useState(false);
    const [localMarks, setLocalMarks] = useState({});

    const handleViewSubmissions = async (assignment) => {
        setSelectedAssignmentForSub(assignment);
        setIsSubmissionsOpen(true);
        setLoadingSubmissions(true);
        try {
            const res = await API.get(`/assignments/list/assignment/${assignment.id}/submissions`);
            setSubmissions(res.data.submissions || []);
        } catch (err) {
            toast.error("Failed to load submissions");
        } finally {
            setLoadingSubmissions(false);
        }
    };

    const handleGrade = async (subId, marks, remarks) => {
        if (marks === undefined || marks === null || marks === "") {
            toast.error("Please enter marks");
            return;
        }
        setIsSubmitting(true);
        try {
            await API.put(`/assignments/grade/assignment/submissions/${subId}`, {
                marks_obtained: marks,
                remarks: remarks
            });
            toast.success("Submission graded");
            // Update local state
            setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, marks_obtained: marks, remarks: remarks } : s));
            // Clear local mark input state
            setLocalMarks(prev => {
                const updated = { ...prev };
                delete updated[subId];
                return updated;
            });
        } catch (err) {
            toast.error("Failed to grade submission");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
                        <ClipboardList className="w-8 h-8 text-indigo-600" />
                        Assignment Management
                    </h1>
                    <p className="text-muted-foreground mt-1">Create, track, and grade student assignments.</p>
                </div>
                <Button onClick={() => { setSelectedClass(null); setFilteredSubjects([]); setEditingAssignment(null); reset(); setIsDialogOpen(true); }} className="rounded-xl shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11 px-6">
                    <Plus className="w-5 h-5" />
                    New Assignment
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-2xl border-none shadow-md bg-white dark:bg-gray-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{assignments.length}</div>
                        <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Active learning items
                        </div>
                    </CardContent>
                </Card>
                {/* Add more stats card here if needed */}
            </div>

            <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
                <CardContent className="p-0">
                    <DataTable
                        data={assignments}
                        columns={columns}
                        title=""
                        description=""
                        isLoading={isLoading}
                        enableSearch={true}
                        searchPlaceholder="Search assignments..."
                        pageSize={10}
                        className="border-none p-6"
                        hasMore={hasMore}
                        serverSidePagination={true}
                        currentPage={currentPage}
                        onNextPage={handleNextPage}
                        onPrevPage={handlePrevPage}
                        onEditMobile={(assignment) => handleEdit(assignment)}
                        onDeleteMobile={(assignment) => handleDelete(assignment.id)}
                        onSubmissionMobile={(assignment) => handleViewSubmissions(assignment)}
                    // actions={["edit", "delete", "submission"]}
                    />
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-3xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">{editingAssignment ? "Edit Assignment" : "New Assignment"}</DialogTitle>
                        <DialogDescription>Fill in the details for the assignment. Students will be notified.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <ScrollArea className="overflow-y-auto h-[calc(100vh-270px)]">
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="title" className="font-bold ml-1">Title</Label>
                                    <Input id="title" {...register("title")} placeholder="e.g. Mathematics Mid-term Homework" className="rounded-xl h-11" />
                                    {errors.title && <p className="text-xs text-red-500 ml-1">{errors.title.message}</p>}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description" className="font-bold ml-1">Description</Label>
                                    <Textarea id="description" {...register("description")} placeholder="Describe the task..." className="rounded-xl min-h-[100px]" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="class_id" className="font-bold ml-1">Class</Label>
                                        {/* <select
                                        id="class_id"
                                        {...register("class_id")}
                                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.grade_name} - {c.name}</option>
                                        ))}
                                    </select> */}
                                        <div className="flex-1">
                                            <ComboboxFormField
                                                field={{
                                                    value: selectedClass,
                                                    onChange: (value) => {
                                                        setSelectedClass(Number(value));
                                                        setValue("class_id", String(value));
                                                    }
                                                }}
                                                label=""
                                                items={classes.map(cls => ({
                                                    id: cls.id,
                                                    display: `${cls.grade_name} - ${cls.name}`
                                                }))}
                                                valueKey="id"
                                                labelKey="display"
                                                searchKey="display"
                                                placeholder="Select a class"
                                                searchPlaceholder="Search class..."
                                                emptyMessage="No class found."
                                            />
                                        </div>
                                        {errors.class_id && <p className="text-xs text-red-500 ml-1">{errors.class_id.message}</p>}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="subject_id" className="font-bold ml-1">Subject</Label>
                                        {/* <select
                                        id="subject_id"
                                        {...register("subject_id")}
                                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select> */}
                                        {/* <FormField
                                            control={control}
                                            name="subject_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Subject *</FormLabel>
                                                    <Select
                                                        onValueChange={(value) => field.onChange(Number(value))}
                                                        value={field.value?.toString()}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select subject" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {filteredSubjects.length > 0 ? (
                                                                filteredSubjects.map((subject) => (
                                                                    <SelectItem key={subject.id} value={subject.id.toString()}>
                                                                        {subject.name}
                                                                    </SelectItem>
                                                                ))
                                                            ) : (
                                                                <div className="p-2 text-xs text-muted-foreground text-center">
                                                                    No subjects assigned to this grade
                                                                </div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        /> */}

                                        <Controller
                                            control={control}
                                            name="subject_id"
                                            render={({ field }) => (
                                                <ComboboxFormField
                                                    field={field}
                                                    label=""
                                                    items={filteredSubjects}
                                                    valueKey="id"
                                                    labelKey="name"
                                                    searchKey="name"
                                                    disabled={!selectedClass}
                                                    placeholder={selectedClass ? "Select subject" : "Select class first"}
                                                    searchPlaceholder="Search subject..."
                                                    emptyMessage={selectedClass ? "No subject found." : "Select class first"}
                                                />
                                            )}
                                        />
                                        {errors.subject_id && <p className="text-xs text-red-500 ml-1">{errors.subject_id.message}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="dueDate" className="font-bold ml-1">Due Date</Label>
                                        {/* <Input id="dueDate" type="date" {...register("dueDate")} className="rounded-xl h-11" /> */}
                                        {/* <DatePicker
                                        value={register("dueDate")}
                                        onChange={(date) => register("dueDate", { value: date })}
                                        placeholder="dd/mm/yyyy"
                                    /> */}
                                        <Controller
                                            name="dueDate"
                                            control={control}
                                            render={({ field }) => (
                                                <DatePicker
                                                    value={field.value ? new Date(field.value) : null}
                                                    onChange={(date) =>
                                                        field.onChange(format(date, "yyyy-MM-dd"))
                                                    }
                                                    placeholder="dd/mm/yyyy"
                                                />
                                            )}
                                        />
                                        {errors.dueDate && <p className="text-xs text-red-500 ml-1">{errors.dueDate.message}</p>}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="maxMarks" className="font-bold ml-1">Max Marks</Label>
                                        <Input id="maxMarks" type="number" {...register("maxMarks")} className="rounded-xl h-11" />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="academic_year_id" className="font-bold ml-1">Academic Year</Label>
                                        <Controller
                                            control={control}
                                            name="academic_year_id"
                                            render={({ field }) => (
                                                <Select
                                                    value={field.value?.toString()}
                                                    onValueChange={(value) => field.onChange(value)}
                                                >
                                                    <SelectTrigger className="rounded-xl h-11">
                                                        <SelectValue placeholder="Year" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {academicYears.map((ay) => (
                                                            <SelectItem key={ay.id} value={ay.id.toString()}>
                                                                {ay.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {errors.academic_year_id && <p className="text-xs text-red-500 ml-1">{errors.academic_year_id.message}</p>}
                                    </div>
                                </div>
                            </form>

                        </ScrollArea>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11 px-6">Cancel</Button>
                            <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                                {isSubmitting ? "Saving..." : editingAssignment ? "Update Assignment" : "Assign to Students"}
                            </Button>
                        </DialogFooter>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Assignment Submissions dialog */}
            <Dialog open={isSubmissionsOpen} onOpenChange={setIsSubmissionsOpen}>
                <DialogContent className="sm:max-w-[800px] rounded-[2rem] p-8 max-h-[90vh] overflow-hidden flex flex-col" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <Users className="w-6 h-6 text-indigo-600" />
                            Submissions: {selectedAssignmentForSub?.title}
                        </DialogTitle>
                        <DialogDescription>Review and grade work submitted by students.</DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto mt-6 space-y-4 pr-2 custom-scrollbar">
                        {loadingSubmissions ? (
                            <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
                        ) : submissions.length > 0 ? (
                            submissions.map(sub => (
                                <Card key={sub.id} className="rounded-2xl border bg-gray-50/50 dark:bg-gray-800/10 p-4">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">{sub.student_name}</span>
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5">Roll: {sub.roll_no}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground italic">"{sub.remarks || "No remarks provided"}"</p>
                                            {sub.file_url && (
                                                <button
                                                    onClick={() => downloadFile(sub.file_url, `${sub.student_name}_assignment`)}
                                                    className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:underline font-medium"
                                                >
                                                    <BookOpen className="w-4 h-4" /> Download Submitted Work
                                                </button>
                                            )}
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Submitted at: {format(new Date(sub.submitted_at), "MMM dd, hh:mm a")}
                                            </div>
                                        </div>

                                        <div className="w-full md:w-64 space-y-3">
                                            <div className="grid gap-1.5">
                                                <Label className="text-xs font-bold ml-1">Grade (Max {selectedAssignmentForSub?.max_marks || 100})</Label>
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="number"
                                                            value={localMarks[sub.id] ?? sub.marks_obtained ?? ""}
                                                            onChange={(e) => setLocalMarks({ ...localMarks, [sub.id]: e.target.value })}
                                                            className="rounded-xl h-10 border-indigo-200 dark:border-indigo-900/30 focus:border-indigo-500"
                                                            placeholder="Marks"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleGrade(sub.id, localMarks[sub.id] ?? sub.marks_obtained, sub.remarks)}
                                                            className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 shadow-md shadow-indigo-500/10"
                                                            disabled={isSubmitting}
                                                        >
                                                            {sub.marks_obtained !== null ? "Update" : "Submit"}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleDeleteSubmission(sub.id)}
                                                            className="h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 shadow-md shadow-red-500/10"
                                                            disabled={isSubmitting}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            {sub.marks_obtained !== null && (
                                                <div className="flex items-center gap-1 text-emerald-500 text-[11px] font-bold ml-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Graded ({sub.marks_obtained}/{selectedAssignmentForSub?.max_marks || 100})
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <div className="p-12 text-center text-muted-foreground">
                                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>No submissions yet for this assignment.</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-6">
                        <Button disabled={isSubmitting} onClick={() => setIsSubmissionsOpen(false)} className="rounded-xl h-12 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">Close Panel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
