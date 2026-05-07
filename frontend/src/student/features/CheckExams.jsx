import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, CheckCircle, Clock, FileText, Printer } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import API from '@/api';

const CheckExams = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedExam, setSelectedExam] = useState(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const response = await API.get('/exam/student/exams');
            setExams(response.data.exams || []);
        } catch (error) {
            console.error("Error fetching exams:", error);
            toast.error("Failed to load exams");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (exam) => {
        setSelectedExam(exam);
        setDetailsDialogOpen(true);
    };

    const filteredExams = exams.filter(exam => {
        const matchSearch = exam.name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchSearch; // Simplified date filter since exam has multiple dates
    });

    const isExamOver = (exam) => {
        if (exam.status === 'Over') return true;
        if (exam.end_date) {
            const endDate = new Date(exam.end_date);
            const today = new Date();
            // set time to midnight for accurate day comparison
            today.setHours(0, 0, 0, 0);
            if (endDate < today) return true;
        }
        return false;
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Exams</h1>
                    <p className="text-muted-foreground mt-1">View upcoming exams, routines, and check your results.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search exams..."
                            className="pl-9 w-full md:w-[250px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
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
            ) : filteredExams.length === 0 ? (
                <div className="text-center py-12 border rounded-xl bg-muted/10 mx-auto max-w-2xl">
                    <div className="bg-muted/30 p-4 rounded-full w-fit mx-auto mb-4">
                        <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">No exams found</h3>
                    <p className="text-muted-foreground mt-1">
                        {searchQuery ? "Try adjusting your filters." : "You don't have any exams scheduled yet."}
                    </p>
                    {searchQuery && (
                        <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                            Clear all filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredExams.map((exam) => {
                        const over = isExamOver(exam);
                        return (
                            <Card key={exam.id} className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50 overflow-hidden flex flex-col h-full">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <Badge variant="secondary" className="mb-2 font-normal text-xs uppercase tracking-wider text-muted-foreground">
                                                Academic Year: {exam.academic_year_name}
                                            </Badge>
                                            <CardTitle className="text-xl group-hover:text-primary transition-colors">{exam.name}</CardTitle>
                                        </div>
                                        <Badge className={cn("ml-2 whitespace-nowrap", over ? "bg-gray-500" : "bg-blue-500")}>
                                            {over ? "Exam is Over" : "Upcoming"}
                                        </Badge>
                                    </div>
                                    <CardDescription className="flex items-center mt-1 text-xs">
                                        <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                                        End Date: {exam.end_date || 'N/A'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3 flex-grow">
                                    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                                        <div className="flex flex-col p-2 bg-muted/30 rounded-lg">
                                            <span className="text-muted-foreground text-xs">Subjects</span>
                                            <span className="font-semibold">{exam.subjects?.length || 0}</span>
                                        </div>
                                        <div className="flex flex-col p-2 bg-muted/30 rounded-lg">
                                            <span className="text-muted-foreground text-xs">Status</span>
                                            <span className="font-semibold">{exam.status}</span>
                                        </div>
                                    </div>
                                    {exam.note && (
                                        <div className="mt-4 text-sm text-muted-foreground p-2.5 rounded border">
                                            <span className="line-clamp-2">{exam.note}</span>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-3 border-t bg-muted/5 flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => handleViewDetails(exam)}>
                                        <FileText className="mr-2 h-4 w-4" /> View Details
                                    </Button>
                                    {/* {exam.status === 'Over' && (
                                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => window.print()}>
                                            <Printer className="mr-2 h-4 w-4" /> Print Marksheet
                                        </Button>
                                    )} */}
                                    {exam.status === 'Over' && selectedExam.is_results_published === true && (
                                        <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => window.print()}>
                                            <Printer className="mr-2 h-4 w-4" /> Print Marksheet
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            )}

            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{selectedExam?.name} - Details</DialogTitle>
                        <DialogDescription>
                            {selectedExam?.note}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedExam && (
                        <div className="py-4 space-y-6">
                            <h3 className="text-lg font-semibold border-b pb-2">Routine & Marks</h3>

                            {selectedExam.subjects?.filter(s => {
                                const n = s.subject_name?.toLowerCase().trim();
                                return !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
                            }).length === 0 ? (
                                <p className="text-gray-500">No subjects found for this exam.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-muted/50 text-left text-sm text-muted-foreground">
                                                <th className="p-3 font-medium">Subject</th>
                                                <th className="p-3 font-medium">Date</th>
                                                <th className="p-3 font-medium">Time</th>
                                                <th className="p-3 font-medium text-center">Max Marks</th>
                                                <th className="p-3 font-medium text-center">Marks Obtained</th>
                                                <th className="p-3 font-medium text-center">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {selectedExam.subjects?.filter(s => {
                                                const n = s.subject_name?.toLowerCase().trim();
                                                return !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
                                            }).map((sub, idx) => (
                                                <tr key={idx} className="border-b">
                                                    <td className="p-3 font-medium">{sub.subject_name}</td>
                                                    <td className="p-3">
                                                        {sub.exam_date ? format(new Date(sub.exam_date), 'dd MMM yyyy') : 'N/A'}
                                                    </td>
                                                    <td className="p-3">
                                                        {sub.start_time ? `${sub.start_time} - ${sub.end_time}` : 'N/A'}
                                                    </td>
                                                    <td className="p-3 text-center">{sub.max_marks}</td>
                                                    <td className="p-3 text-center font-bold">
                                                        {selectedExam.is_results_published ? (
                                                            sub.attendance_status === 'Absent' ? <span className="text-red-500">Absent</span> :
                                                                sub.marks_obtained !== null && sub.marks_obtained !== undefined ? sub.marks_obtained : '-'
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs font-normal italic">Pending Publication</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Badge variant="outline" className={cn(
                                                            sub.result_grade === 'F' || sub.result_grade === 'AB' ? 'bg-red-50 text-red-600 border-red-200' :
                                                                sub.result_grade ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-500'
                                                        )}>
                                                            {selectedExam.is_results_published ? (sub.result_grade || 'N/A') : 'N/A'}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        {selectedExam?.status === 'Over' && selectedExam.is_results_published === true && (
                            <Button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700">
                                <Printer className="mr-2 h-4 w-4" /> Print Marksheet
                            </Button>
                        )}
                        <Button type="button" variant="secondary" onClick={() => setDetailsDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CheckExams;
