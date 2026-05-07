import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, TrendingUp, BarChart3, PieChart as PieIcon, Calendar, BookOpen, Award, CheckCircle, XCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from 'html2canvas';

export default function StudentPerformanceReport({ open, onOpenChange, student }) {
    const [loading, setLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    // Refs for chart capture
    const barChartRef = useRef(null);
    const lineChartRef = useRef(null);
    const pieChartRef = useRef(null);

    // Prepare data for Charts
    const exams = student?.exams || [];
    const examNames = exams.map(ex => ex.name || 'Unnamed Exam');

    // 1. Bar Chart Data: Total Percentage per Exam
    const barChartData = exams.map(ex => {
        const subjects = ex.subjects || [];
        const totalMax = subjects.reduce((acc, s) => acc + (parseFloat(s.max_marks) || 0), 0);
        const totalObtained = subjects.reduce((acc, s) => acc + (parseFloat(s.marks_obtained) || 0), 0);
        return {
            name: ex.name || 'Unnamed Exam',
            percentage: totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0,
            obtained: totalObtained,
            max: totalMax
        };
    });

    // 2. Line Chart Data: Subject trends across exams
    const allSubjects = [...new Set(exams.flatMap(ex => (ex.subjects || []).map(s => s.subject_name)))].filter(Boolean);
    const lineChartData = exams.map(ex => {
        const entry = { name: ex.name || 'Unnamed Exam' };
        const subjects = ex.subjects || [];
        allSubjects.forEach(subName => {
            const sub = subjects.find(s => s.subject_name === subName);
            if (sub) {
                entry[subName] = sub.attendance_status === 'Present' ? (parseFloat(sub.marks_obtained) || 0) : 0;
            }
        });
        return entry;
    });

    // 3. Pie Chart Data: Overall Attendance
    let presentCount = 0;
    let absentCount = 0;
    exams.forEach(ex => {
        (ex.subjects || []).forEach(s => {
            if (s.attendance_status === 'Present') presentCount++;
            else absentCount++;
        });
    });
    const pieChartData = [
        { name: 'Present', value: presentCount, color: '#10b981' },
        { name: 'Absent', value: absentCount, color: '#ef4444' }
    ].filter(d => d.value > 0);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    const downloadPDF = async () => {
        setIsExporting(true);
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        
        try {
            // Header
            doc.setFillColor(79, 70, 229); 
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            doc.setFontSize(24);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text("NIYATI PUBLIC SCHOOL", pageWidth / 2, 18, { align: "center" });
            
            doc.setFontSize(14);
            doc.setFont("helvetica", "normal");
            doc.text("CONSOLIDATED PERFORMANCE REPORT", pageWidth / 2, 28, { align: "center" });

            // Student Info Card
            doc.setDrawColor(230, 230, 230);
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(15, 45, pageWidth - 30, 30, 3, 3, 'FD');
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text("STUDENT DETAILS", 20, 52);
            
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "bold");
            doc.text(`Name: ${student.name}`, 20, 62);
            doc.text(`Roll No: ${student.roll_no || 'N/A'}`, 20, 68);
            
            doc.text(`Grade: ${student.grade_name || 'N/A'}`, pageWidth / 2, 62);
            doc.text(`Year: ${student.academic_year_name || 'N/A'}`, pageWidth / 2, 68);
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 20, 52, { align: 'right' });

            let currentY = 85;

            // Capture and add Charts
            const chartConfigs = [
                { ref: barChartRef, title: 'Exam Performance Comparison (%)' },
                { ref: lineChartRef, title: 'Subject Performance Trends' },
                { ref: pieChartRef, title: 'Attendance Analytics' }
            ];

            for (const config of chartConfigs) {
                if (config.ref.current) {
                    if (currentY > 220) {
                        doc.addPage();
                        currentY = 20;
                    }

                    const canvas = await html2canvas(config.ref.current, {
                        scale: 2,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff'
                    });
                    
                    const imgData = canvas.toDataURL('image/png');
                    
                    doc.setFontSize(12);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(79, 70, 229);
                    doc.text(config.title, 20, currentY);
                    
                    const imgWidth = pageWidth - 40;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    
                    doc.addImage(imgData, 'PNG', 20, currentY + 5, imgWidth, imgHeight);
                    currentY += imgHeight + 20;
                }
            }

            // Detailed Tables
            exams.forEach((exam) => {
                doc.addPage();
                
                doc.setFillColor(243, 244, 246);
                doc.rect(0, 0, pageWidth, 20, 'F');
                doc.setFontSize(14);
                doc.setTextColor(31, 41, 55);
                doc.setFont("helvetica", "bold");
                doc.text(`Detailed Result: ${exam.name}`, 20, 13);
                
                const tableBody = (exam.subjects || []).map(sub => [
                    sub.subject_name,
                    sub.max_marks,
                    sub.attendance_status === 'Absent' ? 'AB' : sub.marks_obtained,
                    sub.grade || '-',
                    sub.attendance_status
                ]);

                autoTable(doc, {
                    startY: 25,
                    head: [['Subject', 'Max Marks', 'Obtained', 'Grade', 'Status']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [79, 70, 229], halign: 'center' },
                    columnStyles: {
                        0: { cellWidth: 50 },
                        1: { halign: 'center' },
                        2: { halign: 'center', fontStyle: 'bold' },
                        3: { halign: 'center' },
                        4: { halign: 'center' }
                    }
                });
            });

            doc.save(`${student.name}_Full_Performance_Report.pdf`);
        } catch (error) {
            console.error("PDF Export failed:", error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl h-[95vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-0 shadow-2xl">
                <DialogHeader className="p-8 border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-900">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full pr-10">
                        <div className="space-y-1">
                            <DialogTitle className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
                                <div className="p-2 bg-primary/10 rounded-xl">
                                    <TrendingUp className="text-primary h-6 w-6" />
                                </div>
                                Performance Analysis: {student?.name}
                            </DialogTitle>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-medium">
                                <span className="flex items-center gap-1.5"><Badge variant="outline" className="rounded-md">Roll: {student?.roll_no}</Badge></span>
                                <span className="flex items-center gap-1.5"><Badge variant="outline" className="rounded-md">Grade: {student?.grade_name}</Badge></span>
                                <span className="flex items-center gap-1.5"><Badge variant="outline" className="rounded-md">Year: {student?.academic_year_name}</Badge></span>
                            </div>
                        </div>
                        <Button 
                            onClick={downloadPDF} 
                            disabled={isExporting}
                            variant="default" 
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none h-12 px-6 rounded-xl transition-all hover:scale-105 active:scale-95"
                        >
                            {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                            {isExporting ? 'Generating PDF...' : 'Download PDF Report'}
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {loading ? (
                        <div className="h-96 flex flex-col items-center justify-center gap-6">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-lg font-medium text-muted-foreground animate-pulse">Generating your personalized analytics...</p>
                        </div>
                    ) : !exams || exams.length === 0 ? (
                        <div className="h-96 flex flex-col items-center justify-center text-center p-12 bg-gray-50/50 dark:bg-gray-800/20 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <div className="p-6 bg-white dark:bg-gray-900 rounded-full shadow-xl mb-6">
                                <Award className="h-16 w-16 text-gray-200" />
                            </div>
                            <h3 className="font-bold text-2xl text-gray-800 dark:text-gray-100 mb-2">No Academic Data Available</h3>
                            <p className="text-muted-foreground max-w-md mx-auto text-lg leading-relaxed">We couldn't find any recorded exam results for this student to generate a performance report.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { label: 'Exams Taken', val: exams.length, icon: Calendar, color: 'blue' },
                                    { label: 'Subjects', val: allSubjects.length, icon: BookOpen, color: 'indigo' },
                                    { label: 'Avg. Score', val: `${(barChartData.reduce((a, b) => a + b.percentage, 0) / barChartData.length).toFixed(1)}%`, icon: Award, color: 'emerald' },
                                    { label: 'Attendance', val: `${Math.round((presentCount / (presentCount + absentCount)) * 100)}%`, icon: CheckCircle, color: 'orange' }
                                ].map((stat, i) => (
                                    <Card key={i} className="border-0 shadow-sm bg-gray-50/50 dark:bg-gray-800/40 rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                                        <CardContent className="p-6 flex items-center gap-5">
                                            <div className={`p-4 rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20`}>
                                                <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                                                <p className="text-2xl font-black">{stat.val}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card className="border-0 shadow-sm rounded-[2rem] bg-white dark:bg-gray-900 overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5 text-indigo-500" />
                                            Exam Performance (%)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[350px] p-6" ref={barChartRef}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barChartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                                                <Tooltip 
                                                    cursor={{ fill: '#f3f4f6' }}
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="percentage" name="Result (%)" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-sm rounded-[2rem] bg-white dark:bg-gray-900 overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                                            Subject Score Trends
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[350px] p-6" ref={lineChartRef}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={lineChartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                <YAxis axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                <Legend iconType="circle" />
                                                {allSubjects.map((sub, idx) => (
                                                    <Line 
                                                        key={sub} 
                                                        type="monotone" 
                                                        dataKey={sub} 
                                                        stroke={COLORS[idx % COLORS.length]} 
                                                        strokeWidth={4} 
                                                        dot={{ r: 6, strokeWidth: 2, fill: '#fff' }} 
                                                        activeDot={{ r: 8 }}
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-sm rounded-[2rem] bg-white dark:bg-gray-900 overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            <PieIcon className="h-5 w-5 text-orange-500" />
                                            Attendance Overview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[350px] flex items-center justify-center p-6" ref={pieChartRef}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieChartData}
                                                    cx="50%" cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={120}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                >
                                                    {pieChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                                <Legend verticalAlign="bottom" height={36}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-sm rounded-[2rem] bg-indigo-600 text-white overflow-hidden">
                                    <CardContent className="p-10 h-full flex flex-col justify-center">
                                        <h4 className="text-2xl font-bold mb-4 italic leading-tight">"Education is the passport to the future, for tomorrow belongs to those who prepare for it today."</h4>
                                        <p className="text-indigo-100">— Malcolm X</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed Exam Sections */}
                            <div className="space-y-8">
                                <h3 className="text-2xl font-black tracking-tight border-l-4 border-primary pl-4">Detailed Subject Wise Performance</h3>
                                {exams.map((exam, exIdx) => (
                                    <Card key={exIdx} className="border-0 shadow-sm rounded-[2rem] bg-white dark:bg-gray-900/40 overflow-hidden border-t-4 border-indigo-500">
                                        <CardHeader className="bg-gray-50/50 dark:bg-gray-800/20 px-8 py-6">
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-xl font-bold flex items-center gap-3">
                                                    <Calendar className="h-5 w-5 text-indigo-500" />
                                                    {exam.name}
                                                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                        {new Date(exam.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                                    </Badge>
                                                </CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-gray-50/30 dark:bg-gray-900/20 border-0 hover:bg-transparent">
                                                        <TableHead className="pl-8 py-4 font-bold">Subject</TableHead>
                                                        <TableHead className="font-bold">Max Marks</TableHead>
                                                        <TableHead className="font-bold">Marks Obtained</TableHead>
                                                        <TableHead className="font-bold">Grade</TableHead>
                                                        <TableHead className="font-bold pr-8 text-right">Attendance</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {exam.subjects.map((sub, sIdx) => (
                                                        <TableRow key={sIdx} className="border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                                            <TableCell className="pl-8 py-5 font-semibold text-gray-700 dark:text-gray-200">{sub.subject_name}</TableCell>
                                                            <TableCell>{sub.max_marks}</TableCell>
                                                            <TableCell className="font-bold">
                                                                {sub.attendance_status === 'Absent' ? (
                                                                    <span className="text-red-500 flex items-center gap-1"><XCircle className="h-4 w-4" /> AB</span>
                                                                ) : (
                                                                    <span className="text-indigo-600 dark:text-indigo-400">{sub.marks_obtained}</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-0">{sub.grade || 'N/A'}</Badge>
                                                            </TableCell>
                                                            <TableCell className="pr-8 text-right">
                                                                <div className="flex justify-end">
                                                                    {sub.attendance_status === 'Present' ? (
                                                                        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1 px-3">
                                                                            <CheckCircle className="h-3 w-3" /> Present
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1 px-3">
                                                                            <XCircle className="h-3 w-3" /> Absent
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
