import React, { useEffect, useState, useMemo } from "react";
import API from "@/api";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, FileText, Image as ImageIcon, FileCode, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { downloadFile } from "@/utils/fileHelper";

export default function NotesViewer() {
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");

    // For students, we need their class_id and grade_id
    const [studentProfile, setStudentProfile] = useState(null);

    async function loadStudentProfile() {
        if (user?.role_id === 1) { // Assuming 4=Student
            try {
                const res = await API.get("/students/get/student_id");
                setStudentProfile(res.data.student);
            } catch (err) {
                console.error("Error loading student profile", err);
            }
        }
    }

    async function loadNotes() {
        setIsLoading(true);
        try {
            const params = {};
            if (studentProfile) {
                params.class_id = studentProfile.class_id;
                params.grade_id = studentProfile.grade_id;
            }
            const res = await API.get("/notes/get/notes", { params });
            setNotes(res.data.notes || []);
        } catch (err) {
            toast.error("Failed to load notes");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadStudentProfile();
    }, [user]);

    useEffect(() => {
        if (studentProfile) loadNotes();
        else if (user?.role_id === 3) loadNotes(); // Admin can see all
    }, [studentProfile, user]);

    const filteredNotes = useMemo(() => {
        return notes.filter(n => {
            const matchesSearch = n.note_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.subject_name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesType = filterType === "all" || n.file_type === filterType;
            return matchesSearch && matchesType;
        });
    }, [notes, searchQuery, filterType]);

    const getIcon = (type) => {
        if (type === 'pdf') return <FileText className="h-6 w-6 text-red-500" />;
        if (type === 'image') return <ImageIcon className="h-6 w-6 text-blue-500" />;
        if (type === 'word') return <FileCode className="h-6 w-6 text-indigo-500" />;
        return <FileText className="h-6 w-6 text-gray-500" />;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-600 to-teal-700 p-8 shadow-xl text-white">
                <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 rounded-full bg-white/10 blur-3xl invisible md:visible"></div>
                <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-3xl font-bold tracking-tight">Access Study Materials</h1>
                    <p className="mt-2 text-green-100 max-w-xl">
                        Browse, view, and download study notes uploaded by your teachers for your class.
                    </p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notes by name or subject..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    {["all", "pdf", "image", "word"].map(type => (
                        <Button
                            key={type}
                            variant={filterType === type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilterType(type)}
                            className="capitalize"
                        >
                            {type}
                        </Button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse h-40 border-0 bg-gray-100 dark:bg-gray-800" />
                    ))}
                </div>
            ) : filteredNotes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNotes.map(note => (
                        <Card key={note.id} className="group hover:shadow-md transition-all border-l-4 border-l-indigo-600 dark:bg-gray-900/40">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    {getIcon(note.file_type)}
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                        {note.subject_name}
                                    </span>
                                </div>
                                <CardTitle className="text-lg line-clamp-1 mt-2">{note.note_name}</CardTitle>
                                <CardDescription className="line-clamp-2 text-xs min-h-[32px]">
                                    {note.description || "No description provided."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2 text-xs text-muted-foreground italic">
                                <div>By: {note.teacher_name}</div>
                                <div>Date: {new Date(note.uploaded_date).toLocaleDateString()}</div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30"
                                    variant="outline"
                                    onClick={() => downloadFile(note.file_url, note.note_name)}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Download
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed">
                    <div className="text-muted-foreground flex flex-col items-center">
                        <Filter className="h-10 w-10 mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">No notes found</h3>
                        <p className="max-w-xs mx-auto">Try adjusting your filters or search query to find what you're looking for.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
