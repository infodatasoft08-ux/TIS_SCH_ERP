import React, { useEffect, useState, useMemo } from "react";
import API from "@/api";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilePen, Trash2, Download, FileText, Image as ImageIcon, FileCode } from "lucide-react";
import DataTable from "@/widgets/DataTable";
import { toast } from "sonner";
import AddNoteDialog from "./AddNoteDialog";
import { downloadFile } from "@/utils/fileHelper";

export default function NotesManagement() {
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState(null);

    // If user is a teacher, we need their teacher ID
    const [teacherProfile, setTeacherProfile] = useState(null);

    async function loadTeacherProfile() {
        if (user?.role_id === 2 || user?.role_id === 3) { // Adjust based on roles. Assuming 2=Teacher, 1=Admin
            try {
                const res = await API.get("/teachers/get/teacher/me");
                if (res.data?.teacher?.length > 0) {
                    setTeacherProfile(res.data.teacher[0]);
                }

            } catch (err) {
                console.error("Error loading teacher profile", err);
                toast.error("Failed to load teacher profile");
            }
        }
    }

    // Pagination states
    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    async function loadNotes(reset = false, newOffset = offset) {
        if (reset) {
            setIsLoading(true);
            newOffset = 0;
            setHasMore(true);
        } else {
            setIsLoading(true);
        }

        try {
            const params = { limit, offset: newOffset };
            if (user?.role_id === 2 && teacherProfile?.teacher_id) {
                params.teacher_id = teacherProfile.teacher_id;
            }

            const res = await API.get("/notes/get/notes", { params });
            const fetched = res.data.notes || [];

            // Always replace the data for the current page
            setNotes(fetched);

            if (fetched.length < limit) setHasMore(false);
            else setHasMore(true);
            setOffset(newOffset);
        } catch (err) {
            toast.error("Failed to load notes");
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    }

    const handleNextPage = () => {
        if (hasMore) loadNotes(false, offset + limit);
    };

    const handlePrevPage = () => {
        if (offset >= limit) loadNotes(false, offset - limit);
    };

    const currentPage = Math.floor(offset / limit) + 1;

    useEffect(() => {
        loadTeacherProfile();
    }, [user]);

    useEffect(() => {
        if (user?.role_id === 2) {
            if (teacherProfile) loadNotes(true);
        } else {
            loadNotes(true);
        }
    }, [teacherProfile, user]);

    async function deleteNote(id) {
        if (!confirm("Are you sure you want to delete this note?")) return;
        try {
            await API.delete(`/notes/delete/note/${id}`);
            toast.success("Note deleted successfully");
            loadNotes();
        } catch (err) {
            toast.error("Failed to delete note");
        }
    }

    const columns = useMemo(() => [
        {
            accessorKey: "file_type",
            header: "Type",
            cell: ({ row }) => {
                const type = row.getValue("file_type");
                if (type === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
                if (type === 'image') return <ImageIcon className="h-5 w-5 text-blue-500" />;
                if (type === 'word') return <FileCode className="h-5 w-5 text-indigo-500" />;
                return <FileText className="h-5 w-5" />;
            }
        },
        {
            accessorKey: "note_name",
            header: "Note Title",
            cell: ({ row }) => (
                <div>
                    <div className="font-semibold">{row.getValue("note_name")}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.description}</div>
                </div>
            )
        },
        {
            accessorKey: "subject_name",
            header: "Subject",
        },
        {
            header: "Target Group",
            cell: ({ row }) => (
                <div className="text-sm">
                    {row.original.grade_name} - {row.original.class_name}
                </div>
            )
        },
        {
            accessorKey: "teacher_name",
            header: "Teacher",
            visible: user?.role_id === 1 // Only show to admin
        },
        {
            accessorKey: "uploaded_date",
            header: "Date",
            cell: ({ row }) => new Date(row.getValue("uploaded_date")).toLocaleDateString()
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const note = row.original;
                return (
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Download"
                            onClick={() => downloadFile(note.file_url, note.note_name)}
                        >
                            <Download className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                                setSelectedNote(note);
                                setIsDialogOpen(true);
                            }}
                        >
                            <FilePen className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => deleteNote(note.id)}
                        >
                            <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                    </div>
                );
            }
        }
    ], [user]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 shadow-xl text-white">
                <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-white/10 blur-3xl invisible md:visible"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold tracking-tight">Study Notes Management</h1>
                    <p className="mt-2 text-indigo-100 max-w-xl">
                        Upload and manage study materials for your students. Supports PDFs, Word documents, and images.
                    </p>
                </div>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                    <DataTable
                        data={notes}
                        columns={columns}
                        isLoading={isLoading}
                        addButtonText="Upload Note"
                        onAddNew={() => {
                            setSelectedNote(null);
                            setIsDialogOpen(true);
                        }}
                        enableSearch={true}
                        searchPlaceholder="Search notes by name or subject..."
                        title="Available Notes"
                        description="Complete list of study materials uploaded"
                        emptyMessage="No notes uploaded yet. Start by uploading your first study material!"
                        hasMore={hasMore}
                        serverSidePagination={true}
                        currentPage={currentPage}
                        onNextPage={handleNextPage}
                        onPrevPage={handlePrevPage}
                        onEditMobile={(note) => {
                            setSelectedNote(note);
                            setIsDialogOpen(true);
                        }}
                        onDeleteMobile={(note) => deleteNote(note.id)}
                        onDownloadMobile={(note) => downloadFile(note.file_url, note.note_name)}
                    />
                </CardContent>
            </Card>

            <AddNoteDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                noteToEdit={selectedNote}
                onSuccess={loadNotes}
                teacherId={teacherProfile?.id || user?.id} // Fallback to user id if admin
            />
        </div>
    );
}
