import React, { useEffect, useState } from "react";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Search, Loader2, Edit3, Settings } from "lucide-react";
import WeeklyTimetable from "@/widgets/WeeklyTimetable";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function AdminClassTimeTable() {
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [routines, setRoutines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingClasses, setFetchingClasses] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassId) {
            fetchClassTimeTable(selectedClassId);
        } else {
            setRoutines([]);
        }
    }, [selectedClassId]);

    const fetchClasses = async () => {
        try {
            setFetchingClasses(true);
            const res = await API.get("/admin/get/classes");
            setClasses(res.data.classes || []);
        } catch (err) {
            console.error("Error fetching classes:", err);
        } finally {
            setFetchingClasses(false);
        }
    };

    const fetchClassTimeTable = async (classId) => {
        try {
            setLoading(true);
            const res = await API.get(`/classroutine/get/classes/${classId}/routines`);
            setRoutines(res.data.routines || []);
        } catch (err) {
            console.error("Error fetching routines:", err);
        } finally {
            setLoading(false);
        }
    };

    const selectedClassName = classes.find(c => String(c.id) === String(selectedClassId))?.name || "";

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 max-w-7xl mx-auto p-4 md:p-8">

            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-800 to-indigo-950 p-10 shadow-2xl text-white">
                <div className="absolute top-0 right-0 -mt-16 -mr-16 h-80 w-80 rounded-full bg-white/10 blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl opacity-30" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-100 text-sm font-bold tracking-wide uppercase">
                            <Calendar className="h-4 w-4" />
                            Academic Timetable
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight italic">
                            Class <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-200">Schedules</span>
                        </h1>
                        <p className="text-blue-100/80 text-lg max-w-xl font-medium leading-relaxed">
                            Monitor and manage class routines across the entire school. Ensure optimal resource allocation and avoid conflicts.
                        </p>
                    </div>

                    <Card className="min-w-[300px] border-none bg-white/10 backdrop-blur-xl shadow-2xl ring-1 ring-white/20 p-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <Search className="h-4 w-4" />
                                Select Class to View
                            </div>
                            <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                                <SelectTrigger className="bg-white/5 border-white/20 text-white placeholder:text-white/50 h-12 rounded-xl focus:ring-blue-400">
                                    <SelectValue placeholder={fetchingClasses ? "Loading classes..." : "Choose a class"} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border bg-popover/90 backdrop-blur-lg">
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={String(cls.id)} className="rounded-lg cursor-pointer">
                                            {cls.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedClassId && (
                                <Button
                                    className="w-full h-12 rounded-xl bg-white text-indigo-900 font-black tracking-tight hover:bg-blue-50 transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
                                    onClick={() => navigate("/school/class/time_table")}
                                >
                                    <Settings className="mr-2 h-4 w-4" />
                                    MANAGE TIMETABLE
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Timetable Content */}
            <div className="space-y-6">
                {selectedClassId ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-2">
                            <h2 className="text-2xl font-black text-foreground/90 flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-indigo-600 rounded-full" />
                                Weekly Schedule for {selectedClassName}
                                {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                            </h2>
                            <Badge variant="outline" className="text-sm font-bold border-indigo-200 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full">
                                {routines.length} Scheduled Items
                            </Badge>
                        </div>

                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000" />
                            <WeeklyTimetable routines={routines} />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 bg-card/40 border-2 border-dashed border-border/80 rounded-[3rem] shadow-inner space-y-6 transition-all hover:bg-card/60">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-10 animate-pulse" />
                            <Calendar className="h-24 w-24 text-muted-foreground/20 relative z-10" />
                        </div>
                        <div className="text-center space-y-2 relative z-10">
                            <h3 className="text-2xl font-bold text-muted-foreground">Class Timetable View</h3>
                            <p className="text-muted-foreground/60 max-w-sm font-medium">
                                Please select a class from the dropdown above to visualize its current weekly routine and break schedule.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
