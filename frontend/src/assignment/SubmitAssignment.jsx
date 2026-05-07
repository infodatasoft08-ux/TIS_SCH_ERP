import React, { useEffect, useState } from "react";
import API from "@/api";
import { format } from "date-fns";

// shadcn components
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { ClipboardList, Calendar as CalendarIcon, Clock, Send, CheckCircle2, AlertCircle, ExternalLink, Paperclip, User } from "lucide-react";
import { toast } from "sonner";
import { downloadFile } from "@/utils/fileHelper";

export default function SubmitAssignment() {
    const [student, setStudent] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [submissionData, setSubmissionData] = useState({ fileUrl: "", remarks: "" });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchStudentAndAssignments();
    }, []);

    const fetchStudentAndAssignments = async () => {
        setIsLoading(true);
        try {
            const studentRes = await API.get('/students/get/student_id');
            const studentInfo = studentRes.data.student;
            setStudent(studentInfo);

            if (studentInfo?.id) {
                const assignRes = await API.get(`/assignments/get/dashboard/student/${studentInfo.id}/assignments`);
                setAssignments(assignRes.data.assignments || []);
            }
        } catch (err) {
            console.error("Error fetching assignments:", err);
            toast.error("Failed to load assignments");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenSubmit = (assignment) => {
        setSelectedAssignment(assignment);
        setSubmissionData({ fileUrl: assignment.submission_file_url || "", remarks: assignment.submission_remarks || "" });
        setIsSubmitDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!submissionData.fileUrl && !submissionData.remarks) {
            toast.error("Please provide a file URL or remarks");
            return;
        }

        setSubmitting(true);
        try {
            await API.post(`/assignments/submit/assignment/${selectedAssignment.id}/submissions`, {
                student_id: student.id,
                file_url: submissionData.fileUrl,
                remarks: submissionData.remarks
            });
            toast.success("Assignment submitted successfully");
            setIsSubmitDialogOpen(false);
            fetchStudentAndAssignments();
        } catch (err) {
            console.error("Submission error:", err);
            toast.error(err.response?.data?.error || "Failed to submit assignment");
        } finally {
            setSubmitting(false);
        }
    };

    // if (isLoading) {
    //     return (
    //         <div className="p-12 flex flex-col items-center justify-center space-y-4">
    //             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    //             <p className="text-muted-foreground animate-pulse">Loading your assignments...</p>
    //         </div>
    //     );
    // }

    return (
        <div className="p-6 w-full mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
                    <ClipboardList className="w-10 h-10 text-indigo-600" />
                    My Assignments
                </h1>
                <p className="text-muted-foreground text-lg">Tracks your tasks, deadlines, and submissions.</p>
            </div>

            {isLoading ? (
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
            ) :

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {assignments.length > 0 ? (
                        assignments.map((assignment) => (
                            <Card key={assignment.id} className="rounded-[2rem] border-none shadow-lg bg-white dark:bg-gray-900/50 hover:shadow-xl transition-all group overflow-hidden relative">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant={assignment.submission_id ? "secondary" : "destructive"} className="rounded-full px-3 py-1 font-bold">
                                            {assignment.submission_id ? "Submitted" : "Pending"}
                                        </Badge>
                                        {assignment.marks_obtained !== null && (
                                            <Badge variant="outline" className="rounded-full border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20">
                                                Score: {assignment.marks_obtained} / {assignment.max_marks || "-"}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl font-bold group-hover:text-indigo-600 transition-colors">{assignment.title}</CardTitle>
                                    <CardDescription className="line-clamp-2 mt-1">{assignment.description}</CardDescription>
                                    {/* <DialogDescription className="line-clamp-2 mt-1">{assignment.description}</DialogDescription> */}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                                        <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                                            <User className="w-4 h-4 text-yellow-500" />
                                        </div>
                                        <span>Teacher: {assignment.teacher_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                                        <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                                            <CalendarIcon className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <span>Academic Year: {assignment.academic_year_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                                        <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                                            <CalendarIcon className="w-4 h-4 text-blue-500" />
                                        </div>
                                        <span>Assigned: {format(new Date(assignment.assigned_date), "MMM dd, yyyy")}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                                        <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/20 font-bold">
                                            <Clock className="w-4 h-4 text-orange-500" />
                                        </div>
                                        <span className={new Date(assignment.due_date) < new Date() && !assignment.submission_id ? "text-red-500" : ""}>
                                            Due: {format(new Date(assignment.due_date), "MMM dd, yyyy")}
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2">
                                    <Button
                                        onClick={() => handleOpenSubmit(assignment)}
                                        disabled={assignment.marks_obtained !== null}
                                        className={`w-full rounded-2xl h-12 font-bold shadow-md transition-all ${assignment.submission_id
                                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                            } ${assignment.marks_obtained !== null ? "opacity-75 cursor-not-allowed" : ""}`}
                                    >
                                        {assignment.marks_obtained !== null ? (
                                            <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Graded</span>
                                        ) : assignment.submission_id ? (
                                            <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Edit Submission</span>
                                        ) : (
                                            <span className="flex items-center gap-2"><Send className="w-5 h-5" /> Submit Work</span>
                                        )}
                                    </Button>
                                </CardFooter>
                                {/* Background Accent */}
                                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center">
                            <div className="inline-flex p-6 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                                <ClipboardList className="w-12 h-12 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold">No Assignments Yet</h3>
                            <p className="text-muted-foreground">When your teacher assigns work, it will appear here.</p>
                        </div>
                    )}
                </div>
            }

            <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] p-8">
                    <DialogHeader>
                        <DialogTitle className="text-3xl font-black mb-2">
                            {selectedAssignment?.submission_id ? "Update Submission" : "Complete Task"}
                        </DialogTitle>
                        <DialogDescription className="text-md">
                            Submit your work for <strong>{selectedAssignment?.title}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-6">
                        <div className="grid gap-3">
                            <Label htmlFor="fileUrl" className="font-bold flex items-center gap-2 text-lg">
                                <Paperclip className="w-5 h-5 text-indigo-500" />
                                Resource / Link
                            </Label>
                            <div className="relative">
                                <Input
                                    id="fileUrl"
                                    value={submissionData.fileUrl}
                                    onChange={(e) => setSubmissionData({ ...submissionData, fileUrl: e.target.value })}
                                    placeholder="Paste URL to your file (Google Drive, Dropbox, etc.)"
                                    className="rounded-2xl h-14 pl-4 pr-12 shadow-inner border-gray-200"
                                />
                                {submissionData.fileUrl && (
                                    <button
                                        type="button"
                                        onClick={() => downloadFile(submissionData.fileUrl, "submission_preview")}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-800"
                                    >
                                        <ExternalLink className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground ml-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Make sure the link is accessible to your teacher.
                            </p>
                        </div>

                        <div className="grid gap-3">
                            <Label htmlFor="remarks" className="font-bold text-lg">Additional Notes</Label>
                            <Textarea
                                id="remarks"
                                value={submissionData.remarks}
                                onChange={(e) => setSubmissionData({ ...submissionData, remarks: e.target.value })}
                                placeholder="Write any comments or even your text-based answer here..."
                                className="rounded-[1.5rem] min-h-[150px] p-4 shadow-inner border-gray-200"
                            />
                        </div>

                        <DialogFooter className="pt-4 flex flex-col sm:flex-row gap-3">
                            <Button type="button" variant="ghost" onClick={() => setIsSubmitDialogOpen(false)} className="rounded-2xl h-14 px-8 font-bold text-gray-500">Cancel</Button>
                            <Button type="submit" disabled={submitting} className="flex-1 rounded-2xl h-14 font-black text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/20 gap-2">
                                {submitting ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                                ) : (
                                    <><Send className="w-6 h-6" /> {selectedAssignment?.submission_id ? "Update Submission" : "Submit Assignment"}</>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
