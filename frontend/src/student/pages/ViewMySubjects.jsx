import React, { useEffect, useState } from "react";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Calendar, Code, GraduationCap, LayoutGrid, List, Library } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ViewMySubjects() {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"

    useEffect(() => {
        fetchMySubjects();
    }, []);

    const fetchMySubjects = async () => {
        try {
            setLoading(true);
            const res = await API.get("/students/get/my-subjects");
            setSubjects(res.data.subjects || []);
        } catch (err) {
            console.error("Failed to fetch subjects:", err);
            setError("Failed to load your subjects. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const getSubjectImage = (index) => {
        const images = [
            "https://images.unsplash.com/photo-1546410531-bb4caa6b424d", // Education
            "https://images.unsplash.com/photo-1509062522246-37559cc792f9", // Classroom
            "https://images.unsplash.com/photo-1497633762265-9d179a990aa6", // Books
            "https://images.unsplash.com/photo-1588072432836-e10032774350", // Study
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3", // Digital
            "https://images.unsplash.com/photo-1503676260728-1c00da094a0b"  // Learning
        ];
        return images[index % images.length] + "?auto=format&fit=crop&w=600&q=80";
    };

    if (error) {
        return (
            <div className="p-8 text-center bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-900 mx-auto max-w-lg mt-10">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Error Loading Subjects</h3>
                <p className="text-sm text-red-600 dark:text-red-300 mb-4">{error}</p>
                <Button onClick={fetchMySubjects} variant="outline" className="border-red-300 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/50">
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000 max-w-7xl mx-auto p-4 md:p-8">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        My Academic Subjects
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        View all subjects assigned to your grade for the current academic year.
                    </p>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50">
                    <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="h-8 px-3 transition-all"
                    >
                        <LayoutGrid className="h-4 w-4 mr-2" />
                        Grid
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="h-8 px-3 transition-all"
                    >
                        <List className="h-4 w-4 mr-2" />
                        List
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            {!loading && subjects.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-primary/5 border-primary/10 shadow-sm hover:bg-primary/10 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Subjects</CardTitle>
                            <Library className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-primary">{subjects.length}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Content Section */}
            {loading ? (
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {[1, 2, 3].map((i) => (
                        viewMode === "grid" ? (
                            <Card key={i} className="overflow-hidden h-[300px] flex flex-col">
                                <Skeleton className="h-40 w-full" />
                                <CardHeader>
                                    <Skeleton className="h-6 w-3/4 mb-2" />
                                    <Skeleton className="h-4 w-1/2" />
                                </CardHeader>
                                <CardContent className="mt-auto">
                                    <Skeleton className="h-4 w-full" />
                                </CardContent>
                            </Card>
                        ) : (
                            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                                <Skeleton className="h-16 w-16 rounded-md" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        )
                    ))}
                </div>
            ) : subjects.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                    <div className="bg-muted/50 p-4 rounded-full w-fit mx-auto mb-4">
                        <BookOpen className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No Subjects Found</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        No subjects are currently assigned to your grade. Please check with your teacher or administrator.
                    </p>
                </div>
            ) : (
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {subjects.map((subject, index) => (
                        viewMode === "grid" ? (
                            <Card
                                key={subject.id}
                                className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 border-muted/60"
                            >
                                {/* Image Header */}
                                <div className="relative h-48 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                    <img
                                        src={subject.image_url || getSubjectImage(index)}
                                        alt={subject.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute bottom-4 left-4 right-4 z-20">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <Badge variant="secondary" className="mb-2 bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-0">
                                                    {subject.type || "Theory"}
                                                </Badge>
                                                <h3 className="text-xl font-bold text-white leading-tight line-clamp-2">
                                                    {subject.name}
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-center justify-between text-sm text-muted-foreground border-b border-border/50 pb-4">
                                        <div className="flex items-center gap-2">
                                            <Code className="h-4 w-4" />
                                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                                                {subject.code || "N/A"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* <div className="grid grid-cols-1 gap-3 pt-2"> */}
                                    {/* <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50 flex flex-col items-center justify-center text-center gap-1 hover:bg-primary/5 transition-colors">
                                            <GraduationCap className="h-5 w-5 text-primary/70 mb-1" />
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Study Level</span>
                                            <span className="text-sm font-bold text-foreground">Active</span>
                                        </div> */}
                                    {/* <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50 flex flex-col items-center justify-center text-center gap-1 hover:bg-primary/5 transition-colors">
                                            <Calendar className="h-5 w-5 text-primary/70 mb-1" />
                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</span>
                                            <span className="text-sm font-bold text-foreground">Current</span>
                                        </div> */}
                                    {/* </div> */}

                                    {/* <Button className="w-full mt-2 font-medium" variant="outline">
                                        View Outline
                                    </Button> */}
                                </CardContent>
                            </Card>
                        ) : (
                            // LIST VIEW
                            <Card key={subject.id} className="hover:bg-muted/30 transition-colors border-muted/60">
                                <div className="flex flex-col sm:flex-row p-4 gap-4 items-center">
                                    <div className="h-24 w-full sm:w-32 rounded-lg overflow-hidden shrink-0 relative">
                                        <img
                                            src={subject.image_url || getSubjectImage(index)}
                                            alt={subject.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2 text-center sm:text-left">
                                        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-2">
                                            <div>
                                                <h3 className="text-lg font-bold">{subject.name}</h3>
                                                <div className="flex items-center gap-2 justify-center sm:justify-start mt-1 text-sm text-muted-foreground">
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {subject.code}
                                                    </Badge>
                                                    <span>•</span>
                                                    <span>{subject.type || 'General'}</span>
                                                </div>
                                            </div>
                                            {/* <Button variant="secondary" size="sm">View Details</Button> */}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    ))}
                </div>
            )}
        </div>
    );
}
