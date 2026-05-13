import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import API from "@/api";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { convertToYYYYMMDD } from "@/helper/dateconversion";

export default function CreateRoutineDialog({ open, onOpenChange, exam, onSuccess }) {
    const [routine, setRoutine] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open && exam && exam.subjects) {
            setRoutine(exam.subjects.map(s => ({
                id: s.id,
                subject_name: s.subject_name,
                exam_date: s.exam_date ? new Date(s.exam_date) : null,
                start_time: s.start_time || "",
                end_time: s.end_time || ""
            })));
        } else {
            setRoutine([]);
        }
    }, [open, exam]);

    const handleDateChange = (id, date) => {
        setRoutine(prev => prev.map(r => r.id === id ? { ...r, exam_date: date } : r));
    };

    const handleTimeChange = (id, field, value) => {
        setRoutine(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleSubmit = async () => {
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] rounded-3xl"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Create/Edit Routine for {exam?.name}</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto px-2">
                    {routine.filter(s => {
                        const n = s.subject_name?.toLowerCase().trim();
                        return !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
                    }).length === 0 ? (
                        <p className="text-center text-gray-500">No subjects found for this exam.</p>
                    ) : (
                        routine.filter(s => {
                            const n = s.subject_name?.toLowerCase().trim();
                            return !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
                        }).map(item => (
                            <div key={item.id} className="p-4 border rounded-lg space-y-4">
                                <h4 className="font-semibold text-lg">{item.subject_name}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Exam Date</label>
                                        <div className="mt-1">
                                            <DatePicker
                                                value={item.exam_date}
                                                onChange={(date) => handleDateChange(item.id, date)}
                                                placeholder="dd/mm/yyyy"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Start Time</label>
                                        <Input
                                            type="time"
                                            className="mt-1 bg-gray-900 dark:[color-scheme:dark]"
                                            value={item.start_time}
                                            onChange={(e) => handleTimeChange(item.id, 'start_time', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">End Time</label>
                                        <Input
                                            type="time"
                                            className="mt-1 bg-gray-900 dark:[color-scheme:dark]"
                                            value={item.end_time}
                                            onChange={(e) => handleTimeChange(item.id, 'end_time', e.target.value)}
                                        />
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