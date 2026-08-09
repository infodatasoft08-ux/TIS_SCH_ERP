import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import API from "@/api";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { convertToYYYYMMDD } from "@/helper/dateconversion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, Plus, Trash2 } from "lucide-react";
import { MultiSelectCombobox } from "@/widgets/multiSelectCombobox";

export default function CreateRoutineDialog({ open, onOpenChange, exam, onSuccess }) {
    const [routine, setRoutine] = useState([]);
    const [deletedIds, setDeletedIds] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errors, setErrors] = useState({});

    const mainCategoryOptions = [
        { id: "Written", name: "Written" },
        { id: "Oral", name: "Oral" }
    ];

    const getItemSubSubjectOptions = (item) => {
        const subOpts = [];
        if (Boolean(item.has_reading)) subOpts.push({ id: "Reading", name: "Reading" });
        if (Boolean(item.has_writing_comp)) subOpts.push({ id: "Writing", name: "Writing" });
        if (Boolean(item.has_dictation)) subOpts.push({ id: "Dictation", name: "Dictation" });
        if (Boolean(item.has_recitation)) subOpts.push({ id: "Recitation", name: "Recitation" });

        if (subOpts.length === 0) {
            return [
                { id: "Reading", name: "Reading" },
                { id: "Writing", name: "Writing" },
                { id: "Dictation", name: "Dictation" },
                { id: "Recitation", name: "Recitation" }
            ];
        }
        return subOpts;
    };

    useEffect(() => {
        if (open && exam && exam.subjects) {
            const seenSubjects = new Set();
            setRoutine(exam.subjects.map(s => {
                let currentCats = [];
                let currentSubSubjects = [];
                if (s.exam_category) {
                    const parts = s.exam_category.split(',').map(c => c.trim()).filter(Boolean);
                    currentCats = parts.filter(p => p === 'Written' || p === 'Oral');
                    currentSubSubjects = parts.filter(p => p !== 'Written' && p !== 'Oral');
                } else {
                    if (s.has_written !== 0) currentCats.push("Written");
                    if (s.has_oral) currentCats.push("Oral");
                    if (s.has_reading) currentSubSubjects.push("Reading");
                    if (s.has_writing_comp) currentSubSubjects.push("Writing");
                    if (s.has_dictation) currentSubSubjects.push("Dictation");
                    if (s.has_recitation) currentSubSubjects.push("Recitation");
                    if (currentCats.length === 0) currentCats.push("Written");
                }

                const key = s.subject_id || s.subject_name;
                const isCloned = seenSubjects.has(key);
                seenSubjects.add(key);

                return {
                    id: s.id,
                    original_id: s.id,
                    isCloned,
                    subject_name: s.subject_name,
                    subject_type: s.subject_type,
                    has_written: s.has_written,
                    has_oral: s.has_oral,
                    has_reading: s.has_reading,
                    has_writing_comp: s.has_writing_comp,
                    has_dictation: s.has_dictation,
                    has_recitation: s.has_recitation,
                    exam_date: s.exam_date ? new Date(s.exam_date) : null,
                    start_time: s.start_time || "",
                    end_time: s.end_time || "",
                    sitting: s.sitting || "",
                    categories: currentCats,
                    sub_subjects: currentSubSubjects,
                    exam_category: [...currentCats, ...currentSubSubjects].join(',')
                };
            }));
            setErrors({});
            setDeletedIds([]);
        } else {
            setRoutine([]);
            setErrors({});
            setDeletedIds([]);
        }
    }, [open, exam]);

    const handleAddSplit = (baseItem) => {
        const newId = `new_${baseItem.original_id || baseItem.id}_${Date.now()}`;
        const newItem = {
            ...baseItem,
            id: newId,
            original_id: baseItem.original_id || baseItem.id,
            isCloned: true,
            exam_date: null,
            start_time: "",
            end_time: "",
            sitting: "",
            categories: (baseItem.categories || []).includes("Oral") ? ["Written"] : ["Oral"],
            sub_subjects: [],
            exam_category: ""
        };

        setRoutine(prev => {
            const lastIdx = prev.reduce((last, item, idx) => item.subject_name === baseItem.subject_name ? idx : last, -1);
            if (lastIdx !== -1) {
                const next = [...prev];
                next.splice(lastIdx + 1, 0, newItem);
                return next;
            }
            return [...prev, newItem];
        });
    };

    const handleRemoveSplit = (id) => {
        setRoutine(prev => prev.filter(r => r.id !== id));
        if (typeof id === 'number' || (typeof id === 'string' && !id.startsWith('new_'))) {
            setDeletedIds(prev => [...prev, id]);
        }
    };

    const handleDateChange = (id, date) => {
        setRoutine(prev => prev.map(r => r.id === id ? { ...r, exam_date: date } : r));
        if (errors[id]?.exam_date) {
            setErrors(prev => ({ ...prev, [id]: { ...prev[id], exam_date: null } }));
        }
    };

    const handleFieldChange = (id, field, value) => {
        setRoutine(prev => prev.map(r => {
            if (r.id !== id) return r;
            const updated = { ...r, [field]: value };
            if (field === 'sitting') {
                if (value === '1st Sitting') {
                    if (!updated.start_time) updated.start_time = "08:30";
                    if (!updated.end_time) updated.end_time = "10:30";
                } else if (value === '2nd Sitting') {
                    if (!updated.start_time) updated.start_time = "11:00";
                    if (!updated.end_time) updated.end_time = "13:00";
                }
            }
            return updated;
        }));
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
            if (Object.keys(subjectErrors).length > 0) {
                newErrors[subject.id] = subjectErrors;
            }
        });

        if (!isValid) {
            setErrors(newErrors);
            toast.error("Please fill in mandatory date for all subjects");
            return;
        }

        const formattedRoutine = routine.map(r => {
            const combinedCats = [
                ...(Array.isArray(r.categories) ? r.categories : []),
                ...(Array.isArray(r.sub_subjects) ? r.sub_subjects : [])
            ];
            return {
                id: r.id,
                original_id: r.original_id || (typeof r.id === 'number' ? r.id : null),
                exam_date: r.exam_date ? convertToYYYYMMDD(r.exam_date) : null,
                start_time: r.start_time || null,
                end_time: r.end_time || null,
                sitting: r.sitting || null,
                exam_category: combinedCats.length > 0 ? combinedCats.join(',') : (r.exam_category || "Written")
            };
        });

        setIsSubmitting(true);
        try {
            await API.put(`/exam/update/routine`, { routine: formattedRoutine, deleted_ids: deletedIds });
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
            <DialogContent className="sm:max-w-[750px] rounded-3xl"
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
                        academicSubjects.map(item => {
                            const occurrences = academicSubjects.filter(s => s.subject_name === item.subject_name);
                            const isMultiple = occurrences.length > 1;
                            const isFirst = occurrences[0]?.id === item.id;
                            const showTrash = item.isCloned || (isMultiple && !isFirst);

                            return (
                                <div key={item.id} className="p-4 border rounded-xl bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-lg text-primary">{item.subject_name}</h4>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                                title="Add another schedule / date for this subject"
                                                onClick={() => handleAddSplit(item)}
                                            >
                                                <Plus className="h-3.5 w-3.5" /> Add Date
                                            </Button>
                                            {showTrash && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                                                    title="Remove this split schedule"
                                                    onClick={() => handleRemoveSplit(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Category:</span>
                                                <Select
                                                    value={item.categories?.[0] || ""}
                                                    onValueChange={(val) => handleFieldChange(item.id, 'categories', val ? [val] : [])}
                                                >
                                                    <SelectTrigger className="w-full text-xs h-9 bg-white dark:bg-slate-800">
                                                        <SelectValue placeholder="Select category..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {mainCategoryOptions.map(opt => (
                                                            <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Sub Subject:</span>
                                                <MultiSelectCombobox
                                                    field={{
                                                        value: item.sub_subjects || [],
                                                        onChange: (newVals) => handleFieldChange(item.id, 'sub_subjects', newVals)
                                                    }}
                                                    items={getItemSubSubjectOptions(item)}
                                                    placeholder="Select sub subject..."
                                                    className="w-full text-xs"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Sitting:</span>
                                                <Select
                                                    value={item.sitting || "none"}
                                                    onValueChange={(val) => handleFieldChange(item.id, 'sitting', val === "none" ? "" : val)}
                                                >
                                                    <SelectTrigger className="w-full text-xs h-9 bg-white dark:bg-slate-800">
                                                        <SelectValue placeholder="None / Single" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">None / Single</SelectItem>
                                                        <SelectItem value="1st Sitting">1st Sitting</SelectItem>
                                                        <SelectItem value="2nd Sitting">2nd Sitting</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

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
                                            <label className="text-sm font-medium">Start Time</label>
                                            <Input
                                                type="time"
                                                className={`mt-1 bg-white text-black dark:bg-gray-700 dark:text-white dark:[color-scheme:dark] ${errors[item.id]?.start_time ? 'border-red-500' : ''}`}
                                                value={item.start_time}
                                                onChange={(e) => handleFieldChange(item.id, 'start_time', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">End Time</label>
                                            <Input
                                                type="time"
                                                className={`mt-1 bg-white text-black dark:bg-gray-700 dark:text-white dark:[color-scheme:dark] ${errors[item.id]?.end_time ? 'border-red-500' : ''}`}
                                                value={item.end_time}
                                                onChange={(e) => handleFieldChange(item.id, 'end_time', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })
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