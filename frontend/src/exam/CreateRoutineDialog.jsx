import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import API from "@/api";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { convertToYYYYMMDD } from "@/helper/dateconversion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Download } from "lucide-react";

export default function CreateRoutineDialog({ open, onOpenChange, exam, onSuccess }) {
    const [routine, setRoutine] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open && exam && exam.subjects) {
            setRoutine(exam.subjects.map(s => ({
                id: s.id,
                subject_name: s.subject_name,
                subject_type: s.subject_type,
                exam_date: s.exam_date ? new Date(s.exam_date) : null,
                start_time: s.start_time || "",
                end_time: s.end_time || ""
            })));
            setErrors({});
        } else {
            setRoutine([]);
            setErrors({});
        }
    }, [open, exam]);

    const handleDateChange = (id, date) => {
        setRoutine(prev => prev.map(r => r.id === id ? { ...r, exam_date: date } : r));
        if (errors[id]?.exam_date) {
            setErrors(prev => ({ ...prev, [id]: { ...prev[id], exam_date: null } }));
        }
    };

    const handleTimeChange = (id, field, value) => {
        setRoutine(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
        if (errors[id]?.[field]) {
            setErrors(prev => ({ ...prev, [id]: { ...prev[id], [field]: null } }));
        }
    };

    const handleSubmit = async () => {
        const academicSubjects = routine.filter(s => {
            const n = s.subject_name?.toLowerCase().trim();
            const type = s.subject_type?.toLowerCase() || '';
            const isNonAcademic = type === 'co-scholastic' || type === 'skill-based';
            return !isNonAcademic && !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
        });

        const newErrors = {};
        let isValid = true;

        academicSubjects.forEach(subject => {
            const subjectErrors = {};
            if (!subject.exam_date) {
                subjectErrors.exam_date = "Exam date is required";
                isValid = false;
            }
            if (!subject.start_time) {
                subjectErrors.start_time = "Start time is required";
                isValid = false;
            }
            if (!subject.end_time) {
                subjectErrors.end_time = "End time is required";
                isValid = false;
            }
            if (Object.keys(subjectErrors).length > 0) {
                newErrors[subject.id] = subjectErrors;
            }
        });

        if (!isValid) {
            setErrors(newErrors);
            toast.error("Please fill in all mandatory fields");
            return;
        }

        const formattedRoutine = routine.map(r => ({
            id: r.id,
            exam_date: r.exam_date ? convertToYYYYMMDD(r.exam_date) : null,
            start_time: r.start_time,
            end_time: r.end_time
        }));

        setIsSubmitting(true);
        try {
            await API.put(`/exam/update/routine`, { routine: formattedRoutine });
            toast.success("Exam routine saved successfully");
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save routine");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrintAction = async (actionType) => {
        if (!exam || !exam.id) return;
        setIsGenerating(true);
        try {
            const response = await API.post('/exam/generate-exam-routine', {
                exam_id: exam.id
            }, { responseType: 'blob' });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);

            if (actionType === 'download') {
                const link = document.createElement('a');
                link.href = url;
                link.download = `ExamRoutine_${exam.name.replace(/\s+/g, '_')}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
            } else if (actionType === 'print') {
                const printWindow = window.open(url, '_blank');
                if (printWindow) {
                    printWindow.onload = () => {
                        printWindow.print();
                    };
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate exam routine");
        } finally {
            setIsGenerating(false);
        }
    };

    const academicSubjects = routine.filter(s => {
        const n = s.subject_name?.toLowerCase().trim();
        const type = s.subject_type?.toLowerCase() || '';
        const isNonAcademic = type === 'co-scholastic' || type === 'skill-based';
        return !isNonAcademic && !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] rounded-3xl"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="flex flex-row items-center justify-between pr-8">
                    <DialogTitle>Create/Edit Routine for {exam?.name}</DialogTitle>
                    {exam && exam.id && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2" disabled={isGenerating}>
                                    <Printer className="h-4 w-4" />
                                    {isGenerating ? "Generating..." : "Print"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handlePrintAction('download')}>
                                    <Download className="mr-2 h-4 w-4" /> Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrintAction('print')}>
                                    <Printer className="mr-2 h-4 w-4" /> Print
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </DialogHeader>

                <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto px-2">
                    {academicSubjects.length === 0 ? (
                        <p className="text-center text-gray-500">No subjects found for this exam.</p>
                    ) : (
                        academicSubjects.map(item => (
                            <div key={item.id} className="p-4 border rounded-lg space-y-4">
                                <h4 className="font-semibold text-lg">{item.subject_name}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Exam Date <span className="text-red-500">*</span></label>
                                        <div className="mt-1">
                                            <DatePicker
                                                value={item.exam_date}
                                                onChange={(date) => handleDateChange(item.id, date)}
                                                placeholder="dd/mm/yyyy"
                                            />
                                            {errors[item.id]?.exam_date && (
                                                <p className="text-red-500 text-xs mt-1">{errors[item.id].exam_date}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Start Time <span className="text-red-500">*</span></label>
                                        <Input
                                            type="time"
                                            className={`mt-1 bg-slate-50 text-black dark:bg-gray-700 dark:text-white dark:[color-scheme:dark] ${errors[item.id]?.start_time ? 'border-red-500' : ''}`}
                                            value={item.start_time}
                                            onChange={(e) => handleTimeChange(item.id, 'start_time', e.target.value)}
                                        />
                                        {errors[item.id]?.start_time && (
                                            <p className="text-red-500 text-xs mt-1">{errors[item.id].start_time}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">End Time <span className="text-red-500">*</span></label>
                                        <Input
                                            type="time"
                                            className={`mt-1 bg-slate-50 text-black dark:bg-gray-700 dark:text-white dark:[color-scheme:dark] ${errors[item.id]?.end_time ? 'border-red-500' : ''}`}
                                            value={item.end_time}
                                            onChange={(e) => handleTimeChange(item.id, 'end_time', e.target.value)}
                                        />
                                        {errors[item.id]?.end_time && (
                                            <p className="text-red-500 text-xs mt-1">{errors[item.id].end_time}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || routine.length === 0}>
                        {isSubmitting ? "Saving..." : "Save Routine"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}