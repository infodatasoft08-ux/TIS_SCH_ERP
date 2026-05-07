import React, { useState, useEffect, useMemo } from 'react';
import {
    Users,
    Search,
    User,
    Phone,
    Mail,
    Hash,
    CreditCard,
    MoreVertical,
    Eye,
    PhoneCall,
    GraduationCap,
    Heart,
    Contact2,
    CalendarDays,
    Check
} from 'lucide-react';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from 'sonner';
import ResponsiveDataTable from '@/components/common/ResponsiveDataTable';
import API from '@/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ClassStudent = () => {
    const [data, setData] = useState({ class: null, students: [] });
    const [loading, setLoading] = useState(true);
    const [viewProfile, setViewProfile] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await API.get('/teachers/get/teacher/my/supervised-class/students');
            setData(response.data);
        } catch (error) {
            console.error('Error fetching students:', error);
            const msg = error.response?.data?.error || "Failed to load class students";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleViewProfile = (student) => {
        setSelectedStudent(student);
        setViewProfile(true);
    };

    const columns = [
        {
            label: "Student",
            render: (student) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-primary/10 shadow-sm">
                        <AvatarImage src={student.user_avatar_url} alt={student.student_name} />
                        <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                            {student.student_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-foreground">{student.student_name}</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">#{student.roll_no || 'N/A'}</span>
                    </div>
                </div>
            )
        },
        {
            label: "Parents",
            render: (student) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold">{student.fathers_name || 'N/A'}</span>
                        <span className="text-[10px] text-muted-foreground">(F)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        <Heart className="h-3 w-3 text-pink-500/70" />
                        <span className="font-medium text-muted-foreground/80">{student.mothers_name || 'N/A'}</span>
                        <span className="text-[10px] text-muted-foreground">(M)</span>
                    </div>
                </div>
            )
        },
        {
            label: "Contacts",
            render: (student) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs">
                        <Phone className="h-3 w-3 text-blue-500" />
                        <span className="font-mono">{student.student_contact || 'None'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        <Contact2 className="h-3 w-3 text-green-600" />
                        <span className="font-mono text-muted-foreground">{student.father_contact || 'None'}</span>
                    </div>
                </div>
            )
        },
        {
            label: "Gender",
            render: (student) => (
                <Badge variant="outline" className="capitalize text-[10px] font-bold border-primary/20">
                    {student.gender}
                </Badge>
            )
        },
        {
            label: "Action",
            headerClassName: "text-right",
            cellClassName: "text-right",
            render: (student) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5 text-primary">
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-green-500/5 text-green-600">
                        <PhoneCall className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ];

    const renderCard = (student) => (
        <Card className="group overflow-hidden border-none shadow-md ring-1 ring-border bg-card/50 backdrop-blur-sm transition-all hover:shadow-xl hover:ring-primary/20">
            <CardContent className="p-0">
                <div className="p-5 flex items-start gap-4">
                    <Avatar className="h-16 w-16 rounded-2xl border-2 border-background shadow-lg group-hover:scale-105 transition-transform">
                        <AvatarImage src={student.user_avatar_url} alt={student.student_name} />
                        <AvatarFallback className="bg-primary/5 text-primary text-lg font-black">
                            {student.student_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-black text-base text-foreground tracking-tight">{student.student_name}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="secondary" className="px-2 py-0 h-5 text-[10px] font-bold bg-primary/10 text-primary border-none">
                                        ROLL #{student.roll_no || 'N/A'}
                                    </Badge>
                                    <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] font-bold capitalize">
                                        {student.gender}
                                    </Badge>
                                </div>
                            </div>
                            {/* <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreVertical className="h-4 w-4" />
                            </Button> */}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-px bg-border/50 border-y border-border/50">
                    <div className="p-4 bg-background/40 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Father's Name</span>
                            <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-primary/60" />
                                <span className="text-sm font-bold truncate">{student.fathers_name || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Father Contact</span>
                            <div className="flex items-center justify-end gap-2">
                                <span className="text-sm font-mono font-bold text-foreground/80">{student.father_contact || 'N/A'}</span>
                                <Contact2 className="h-3 w-3 text-green-600/60" />
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-background/40 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Mother's Name</span>
                            <div className="flex items-center gap-2">
                                <Heart className="h-3 w-3 text-pink-500/60" />
                                <span className="text-sm font-bold truncate">{student.mothers_name || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Student Contact</span>
                            <div className="flex items-center justify-end gap-2">
                                <span className="text-sm font-mono font-bold text-foreground/80">{student.student_contact || 'N/A'}</span>
                                <Phone className="h-3 w-3 text-blue-500/60" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-3 bg-muted/20 flex gap-2">
                    <Button onClick={() => handleViewProfile(student)} variant="outline" className="flex-1 h-9 rounded-xl text-xs font-bold gap-2">
                        <Eye className="h-3.5 w-3.5" /> View Profile
                    </Button>
                    {/* <Button className="flex-1 h-9 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 gap-2">
                        <PhoneCall className="h-3.5 w-3.5" /> Contact
                    </Button> */}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="container mx-auto p-6 md:p-12 space-y-10 max-w-7xl animate-in fade-in slide-in-from-bottom-10 duration-1000">
            {/* Elegant Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-muted pb-8 mt-2">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary p-3 rounded-2xl shadow-xl shadow-primary/20 rotate-3">
                            <GraduationCap className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground/90 leading-tight">
                                My <span className="text-primary italic">Students</span>
                            </h1>
                            <p className="text-muted-foreground text-sm font-medium mt-1">Manage and view all students in your supervised class</p>
                        </div>
                    </div>
                </div>

                {data.class && (
                    <div className="flex items-center gap-4 bg-background p-3 rounded-3xl shadow-xl ring-1 ring-border border-b-4 border-primary/20">
                        <div className="px-6 py-2 border-r border-muted flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Assigned Class</span>
                            <Badge variant="secondary" className="px-5 py-1.5 rounded-2xl font-black text-sm bg-primary/10 text-primary border-none uppercase tracking-tight">
                                {data.class.name}
                            </Badge>
                        </div>
                        <div className="px-6 py-2 flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-1">Student Count</span>
                            <div className="text-2xl font-black text-primary italic leading-none">{data.students.length}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content using ResponsiveDataTable */}
            <div className="relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-[120px] -z-10" />

                <ResponsiveDataTable
                    data={data.students}
                    columns={columns}
                    renderCard={renderCard}
                    searchKey="student_name"
                    searchPlaceholder="Search students by name..."
                    loading={loading}
                    emptyTitle="No Students Found"
                    emptyDescription={data.class
                        ? "There are currently no students enrolled in your supervised class."
                        : "You haven't been assigned as a supervisor for any class yet."
                    }
                    forceCards={true}
                />
            </div>

            {/* Student Profile Dialog */}
            <Dialog open={viewProfile} onOpenChange={setViewProfile}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Student Profile</DialogTitle>
                        <DialogDescription>
                            View detailed information about the selected student.
                        </DialogDescription>
                    </DialogHeader>
                    {/* <DialogBody> */}
                    {selectedStudent && (
                        <div className="space-y-6">
                            {/* Profile Header */}
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                                        <AvatarImage src={selectedStudent.user_avatar_url || '/placeholder-user.jpg'} />
                                        <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                                            {selectedStudent.student_name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute bottom-0 right-0 bg-green-500 border-2 border-white rounded-full p-1">
                                        <Check className="h-3 w-3 text-white" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-3xl font-black text-foreground tracking-tight">{selectedStudent.student_name}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="px-3 py-1 rounded-full font-bold text-sm">
                                            {selectedStudent.grade_name}
                                        </Badge>
                                        <Badge variant="outline" className="px-3 py-1 rounded-full font-bold text-sm">
                                            {selectedStudent.class_name}
                                        </Badge>
                                    </div>
                                    <p className="text-muted-foreground text-sm mt-2">{selectedStudent.roll_number}</p>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="border-none shadow-sm bg-muted/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Father's Name</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-bold text-foreground">{selectedStudent.fathers_name || 'N/A'}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-sm bg-muted/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Mother's Name</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-bold text-foreground">{selectedStudent.mothers_name || 'N/A'}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-sm bg-muted/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Contact Number</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-bold text-foreground">{selectedStudent.student_contact || 'N/A'}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-sm bg-muted/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Father's Contact</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-bold text-foreground">{selectedStudent.father_contact || 'N/A'}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Academic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="border-none shadow-sm bg-muted/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Date of Birth</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-bold text-foreground">{selectedStudent.date_of_birth || 'N/A'}</p>
                                    </CardContent>
                                </Card>
                                <Card className="border-none shadow-sm bg-muted/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Admission Date</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-bold text-foreground">{selectedStudent.admission_date || 'N/A'}</p>
                                    </CardContent>
                                </Card>
                                {/* <Card className="border-none shadow-sm bg-muted/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Student ID</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-bold text-foreground">{selectedStudent.student_id || 'N/A'}</p>
                                    </CardContent>
                                </Card> */}
                                {/* <Card className="border-none shadow-sm bg-muted/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Student ID</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-bold text-foreground">{selectedStudent.student_id || 'N/A'}</p>
                                    </CardContent>
                                </Card> */}
                            </div>

                            {/* Address Information */}
                            <Card className="border-none shadow-sm bg-muted/30">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Address</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-foreground">
                                        {selectedStudent.address || 'N/A'}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Emergency Contact */}
                            {selectedStudent.phone_number && (
                                <Card className="border-none shadow-sm bg-muted/30">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Emergency Contact</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm font-bold text-foreground">{selectedStudent.phone_number}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Status */}
                            <Card className="border-none shadow-sm bg-muted/30">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Badge variant={selectedStudent.status === 'active' ? 'default' : 'destructive'} className="px-4 py-1.5 rounded-full font-bold text-sm">
                                        {selectedStudent.status?.toUpperCase()}
                                    </Badge>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* </DialogBody> */}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setViewProfile(false); setSelectedStudent(null); }}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ClassStudent;
