import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import API from "@/api";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, ExternalLink } from "lucide-react";
import { ComboboxFormField } from "@/widgets/comboboxFormField";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
    subject_id: z.coerce.string().min(1, "Subject is required"),
    grade_id: z.coerce.string().min(1, "Grade is required"),
    class_id: z.coerce.string().min(1, "Class is required"),
    note_name: z.string().min(3, "Note name must be at least 3 characters"),
    description: z.string().optional(),
    uploaded_date: z.string().min(1, "Date is required"),
});

export default function AddNoteDialog({ open, onOpenChange, noteToEdit, onSuccess, teacherId }) {
    const [subjects, setSubjects] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [grades, setGrades] = useState([]);
    const [classes, setClasses] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState(null);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            subject_id: "",
            grade_id: "",
            class_id: "",
            note_name: "",
            description: "",
            uploaded_date: new Date().toISOString().split("T")[0],
        },
    });

    const selectedGradeId = form.watch("grade_id");

    useEffect(() => {
        if (selectedGradeId) {
            fetchFilteredSubjects(selectedGradeId);
        } else {
            setFilteredSubjects([]);
        }
    }, [selectedGradeId]);

    const fetchFilteredSubjects = async (gradeId) => {
        try {
            const res = await API.get(`/admin/get/grade/${gradeId}/subjects`);
            setFilteredSubjects(res.data.subjects || []);
        } catch (err) {
            console.error("Error fetching grade subjects:", err);
        }
    };

    useEffect(() => {
        if (open) {
            loadFormData();
            if (noteToEdit) {
                form.reset({
                    subject_id: String(noteToEdit.subject_id),
                    grade_id: String(noteToEdit.grade_id),
                    class_id: String(noteToEdit.class_id),
                    note_name: noteToEdit.note_name,
                    description: noteToEdit.description || "",
                    uploaded_date: new Date(noteToEdit.uploaded_date).toISOString().split("T")[0],
                });
            } else {
                form.reset({
                    subject_id: "",
                    grade_id: "",
                    class_id: "",
                    note_name: "",
                    description: "",
                    uploaded_date: new Date().toISOString().split("T")[0],
                });
                setFile(null);
            }
        }
    }, [open, noteToEdit, form]);

    async function loadFormData() {
        try {
            const [subjRes, gradRes, clasRes] = await Promise.all([
                API.get("/admin/get/subjects"),
                API.get("/admin/get/grades"),
                API.get("/admin/get/classes"),
            ]);
            setSubjects(subjRes.data.subjects || []);
            setGrades(gradRes.data.results || gradRes.data.grades || []); // Adjust based on API response
            setClasses(clasRes.data.classes || []);
        } catch (err) {
            console.error("Failed to load form data", err);
        }
    }

    const onSubmit = async (values) => {
        if (!noteToEdit && !file) {
            toast.error("Please select a file to upload");
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        Object.keys(values).forEach((key) => formData.append(key, values[key]));
        if (file) formData.append("file", file);
        formData.append("teacher_id", teacherId);

        try {
            if (noteToEdit) {
                await API.put(`/notes/update/note/${noteToEdit.id}`, formData);
                toast.success("Note updated successfully");
            } else {
                await API.post("/notes/add/note", formData);
                toast.success("Note uploaded successfully");
            }
            onSuccess();
            onOpenChange(false);
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to save note");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{noteToEdit ? "Edit Note" : "Upload New Note"}</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to {noteToEdit ? "update" : "upload"} the note.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    {/* <ScrollArea className="max-h-[50vh] md:max-h-[60vh] lg:max-h-[60vh]"></ScrollArea> */}
                    <ScrollArea className="overflow-y-auto h-[calc(100vh-200px)]">
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="grade_id"
                                    render={({ field }) => (
                                        <ComboboxFormField
                                            field={field}
                                            label="Grade/Class Level"
                                            required
                                            items={grades}
                                            valueKey="id"
                                            labelKey="name"
                                            searchKey="name"
                                            placeholder="Select Grade"
                                            searchPlaceholder="Search grade..."
                                            emptyMessage="No grade found."
                                        />
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="class_id"
                                    render={({ field }) => (
                                        <ComboboxFormField
                                            field={field}
                                            label="Section/Class"
                                            required
                                            items={classes}
                                            valueKey="id"
                                            labelKey="name"
                                            searchKey="name"
                                            placeholder="Select Section"
                                            searchPlaceholder="Search section..."
                                            emptyMessage="No section found."
                                        />
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="subject_id"
                                render={({ field }) => (
                                    <ComboboxFormField
                                        field={field}
                                        label="Subject"
                                        required
                                        items={filteredSubjects}
                                        valueKey="id"
                                        labelKey="name"
                                        searchKey="name"
                                        placeholder={selectedGradeId ? "Select Subject" : "Pick grade first"}
                                        searchPlaceholder="Search subject..."
                                        emptyMessage={selectedGradeId ? (filteredSubjects.length > 0 ? "No subject found." : "No subjects assigned to this grade") : "Select a grade first"}
                                    />
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="note_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Note Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Chapter 1: Introduction" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="uploaded_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Details about this note..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-2">
                                <FormLabel>File {noteToEdit ? "(Upload new to replace)" : "*"}</FormLabel>
                                {noteToEdit && noteToEdit.file_url && (
                                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border text-sm mb-2">
                                        <span className="font-medium text-muted-foreground">Current File:</span>
                                        <a
                                            href={noteToEdit.file_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary hover:underline flex items-center gap-1"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            {noteToEdit.file_url.split('/').pop() || 'View Note'}
                                        </a>
                                    </div>
                                )}
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                                        onChange={(e) => setFile(e.target.files[0])}
                                        className="cursor-pointer"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground italic">
                                    Supported: PDF, Word, Images. Max 2MB.
                                </p>
                            </div>
                        </form>
                    </ScrollArea>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Please wait
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {noteToEdit ? "Update Note" : "Upload Note"}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </Form>

            </DialogContent>
        </Dialog>
    );
}
