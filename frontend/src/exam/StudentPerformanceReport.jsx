import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, TrendingUp, BarChart3, PieChart as PieIcon, Calendar, BookOpen, Award, CheckCircle, XCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from 'html2canvas';

const isMobileApp = typeof window !== 'undefined' && window.ReactNativeWebView;

const isAcademicSubject = (sub) => {
    if (!sub) return false;
    const n = (sub.subject_name || '').toLowerCase().trim();
    if (n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break') return false;
    const st = (sub.subject_type || '').toLowerCase().trim();
    if (st === 'co-scholastic' || st === 'coscholastic' || st === 'co_scholastic' || st === 'co-curricular' || st === 'activity') return false;
    if (n.includes('spoken english') || n.includes('spoken hindi') || n.includes('art & craft') || n.includes('work education') || n.includes('health & physical')) return false;
    return true;
};

const getUniqueExamSubjects = (subjectsList = []) => {
    const map = new Map();
    subjectsList.forEach(s => {
        if (!isAcademicSubject(s)) return;
        const key = s.subject_id || s.subject_name;
        if (!map.has(key)) {
            map.set(key, { ...s });
        } else {
            const existing = map.get(key);
            const pick = (a, b) => (a !== null && a !== undefined && a !== '' && a !== '-') ? a : b;
            existing.marks_obtained = pick(existing.marks_obtained, s.marks_obtained);
            existing.grade = pick(existing.grade, s.grade);
            existing.attendance_status = pick(existing.attendance_status, s.attendance_status);

            existing.written_marks_obtained = pick(existing.written_marks_obtained, s.written_marks_obtained);
            existing.reading_marks_obtained = pick(existing.reading_marks_obtained, s.reading_marks_obtained);
            existing.writing_comp_marks_obtained = pick(existing.writing_comp_marks_obtained, s.writing_comp_marks_obtained);
            existing.dictation_marks_obtained = pick(existing.dictation_marks_obtained, s.dictation_marks_obtained);
            existing.recitation_marks_obtained = pick(existing.recitation_marks_obtained, s.recitation_marks_obtained);
            existing.oral_marks_obtained = pick(existing.oral_marks_obtained, s.oral_marks_obtained);
            existing.theory_marks_obtained = pick(existing.theory_marks_obtained, s.theory_marks_obtained);
            existing.lab_marks_obtained = pick(existing.lab_marks_obtained, s.lab_marks_obtained);
            existing.ia_pr_marks_obtained = pick(existing.ia_pr_marks_obtained, s.ia_pr_marks_obtained);

            existing.max_marks = existing.max_marks || s.max_marks;
            existing.written_max_marks = existing.written_max_marks || s.written_max_marks;
            existing.reading_max_marks = existing.reading_max_marks || s.reading_max_marks;
            existing.writing_comp_max_marks = existing.writing_comp_max_marks || s.writing_comp_max_marks;
            existing.dictation_max_marks = existing.dictation_max_marks || s.dictation_max_marks;
            existing.recitation_max_marks = existing.recitation_max_marks || s.recitation_max_marks;
            existing.oral_max_marks = existing.oral_max_marks || s.oral_max_marks;
            existing.theory_max_marks = existing.theory_max_marks || s.theory_max_marks;
            existing.lab_max_marks = existing.lab_max_marks || s.lab_max_marks;
            existing.ia_pr_max_marks = existing.ia_pr_max_marks || s.ia_pr_max_marks;
        }
    });
    return Array.from(map.values());
};

export default function StudentPerformanceReport({ open, onOpenChange, student }) {
    const [loading, setLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Refs for chart capture
    const barChartRef = useRef(null);
    const lineChartRef = useRef(null);
    const pieChartRef = useRef(null);
    const labOralChartRef = useRef(null);

    // Prepare cleaned data for Charts & Tables
    const rawExams = student?.exams || [];
    const exams = rawExams.map(ex => ({
        ...ex,
        cleanSubjects: getUniqueExamSubjects(ex.subjects || [])
    }));

    // 1. Bar Chart Data: Total Percentage per Exam
    const barChartData = exams.map(ex => {
        const subjects = ex.cleanSubjects;
        const totalMax = subjects.reduce((acc, s) => acc + (parseFloat(s.max_marks) || 0), 0);
        const totalObtained = subjects.reduce((acc, s) => acc + (s.attendance_status === 'Absent' ? 0 : (parseFloat(s.marks_obtained) || 0)), 0);
        return {
            name: ex.name || 'Unnamed Exam',
            percentage: totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0,
            obtained: totalObtained,
            max: totalMax
        };
    });

    // 2. Line Chart Data: Subject trends across exams
    const allSubjects = [...new Set(exams.flatMap(ex => ex.cleanSubjects.map(s => s.subject_name)))].filter(Boolean);
    const lineChartData = exams.map(ex => {
        const entry = { name: ex.name || 'Unnamed Exam' };
        allSubjects.forEach(subName => {
            const sub = ex.cleanSubjects.find(s => s.subject_name === subName);
            if (sub) {
                entry[subName] = sub.attendance_status === 'Absent' ? 0 : (parseFloat(sub.marks_obtained) || 0);
            }
        });
        return entry;
    });

    // 3. Pie Chart Data: Overall Attendance
    let presentCount = 0;
    let absentCount = 0;
    exams.forEach(ex => {
        ex.cleanSubjects.forEach(s => {
            if (s.attendance_status === 'Absent') absentCount++;
            else presentCount++;
        });
    });
    const pieChartData = [
        { name: 'Present', value: presentCount, color: '#10b981' },
        { name: 'Absent', value: absentCount, color: '#ef4444' }
    ].filter(d => d.value > 0);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    // Helper to check boolean flags safely
    const checkTrue = (val) => val == 1 || val === true || String(val) === 'true' || (val && val.data && val.data[0] === 1) || (typeof Buffer !== 'undefined' && Buffer.isBuffer(val) && val[0] === 1) || (typeof val === 'object' && val !== null && val[0] === 1);

    // 4. Lab and Oral Performance Chart Data
    const isLabSubject = (s) => checkTrue(s.has_lab) && (parseFloat(s.lab_max_marks) > 0 || (s.lab_marks_obtained !== null && s.lab_marks_obtained !== undefined));
    const isOralSubject = (s) => checkTrue(s.has_oral) && (parseFloat(s.oral_max_marks) > 0 || (s.oral_marks_obtained !== null && s.oral_marks_obtained !== undefined));

    const showLabOralChart = exams.some(ex => ex.cleanSubjects.some(s => isLabSubject(s) || isOralSubject(s)));
    const activeLabOralKeys = [];
    exams.forEach(ex => {
        ex.cleanSubjects.forEach(s => {
            if (isLabSubject(s)) {
                const key = `${s.subject_name} Lab`;
                if (!activeLabOralKeys.includes(key)) activeLabOralKeys.push(key);
            }
            if (isOralSubject(s)) {
                const key = `${s.subject_name} Oral`;
                if (!activeLabOralKeys.includes(key)) activeLabOralKeys.push(key);
            }
        });
    });

    const labOralChartData = exams.map(ex => {
        const entry = { name: ex.name || 'Unnamed Exam' };
        ex.cleanSubjects.forEach(s => {
            if (isLabSubject(s)) {
                entry[`${s.subject_name} Lab`] = s.attendance_status === 'Absent' ? 0 : (parseFloat(s.lab_marks_obtained) || 0);
            }
            if (isOralSubject(s)) {
                entry[`${s.subject_name} Oral`] = s.attendance_status === 'Absent' ? 0 : (parseFloat(s.oral_marks_obtained) || 0);
            }
        });
        return entry;
    });

    const downloadPDF = async () => {
        setIsExporting(true);
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        try {
            // Header
            doc.setFillColor(79, 70, 229);
            doc.rect(0, 0, pageWidth, 45, 'F');

            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.text("TIMES INTERNATIONAL SCHOOL", pageWidth / 2, 18, { align: "center" });

            doc.setFontSize(14);
            doc.setFont("helvetica", "normal");
            doc.text("STUDENT PERFORMANCE ANALYTICS REPORT", pageWidth / 2, 28, { align: "center" });
            doc.setFontSize(10);
            doc.text(`Academic Session: ${student.academic_year_name || 'N/A'}`, pageWidth / 2, 35, { align: "center" });

            // Student Information Card
            doc.setTextColor(40, 40, 40);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(15, 52, pageWidth - 30, 25, 2, 2, 'F');

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`STUDENT: ${(student.name || '').toUpperCase()}`, 20, 60);
            doc.setFont("helvetica", "normal");
            doc.text(`Roll No: ${student.roll_no || 'N/A'}`, 20, 66);
            doc.text(`Grade: ${student.grade_name || 'N/A'}`, 20, 72);

            const avgScore = barChartData.length > 0 ? (barChartData.reduce((a, b) => a + b.percentage, 0) / barChartData.length).toFixed(1) : '0.0';
            const totalAtt = (presentCount + absentCount) > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : 100;

            doc.setFont("helvetica", "bold");
            doc.text(`Average Score: ${avgScore}%`, pageWidth - 20, 60, { align: 'right' });
            doc.setFont("helvetica", "normal");
            doc.text(`Exams Taken: ${exams.length}`, pageWidth - 20, 66, { align: 'right' });
            doc.text(`Attendance: ${totalAtt}%`, pageWidth - 20, 72, { align: 'right' });

            // Capture Charts
            const captureChart = async (ref) => {
                if (!ref.current) return null;
                const canvas = await html2canvas(ref.current, {
                    scale: 3,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                return canvas.toDataURL('image/png');
            };

            const barImg = await captureChart(barChartRef);
            const lineImg = await captureChart(lineChartRef);
            const pieImg = await captureChart(pieChartRef);
            const labOralImg = await captureChart(labOralChartRef);

            let currentY = 85;

            // Row 1: Bar Chart and Line Chart
            const chartWidth = (pageWidth - 40) / 2;
            const chartHeight = 55;

            if (barImg && lineImg) {
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(79, 70, 229);
                doc.text("Performance Comparison (%)", 20, currentY);
                doc.text("Subject Trends", pageWidth / 2 + 5, currentY);

                doc.addImage(barImg, 'PNG', 15, currentY + 3, chartWidth + 5, chartHeight);
                doc.addImage(lineImg, 'PNG', pageWidth / 2, currentY + 3, chartWidth + 5, chartHeight);

                let valueY = currentY + chartHeight + 8;
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                doc.setFont("helvetica", "italic");

                const barVals = barChartData.map(d => `${d.name}: ${d.percentage}%`).join(' | ');
                doc.text(barVals, 20, valueY, { maxWidth: chartWidth });

                currentY += chartHeight + 20;
            } else if (barImg || lineImg) {
                const img = barImg || lineImg;
                doc.addImage(img, 'PNG', 20, currentY, pageWidth - 40, 70);
                currentY += 85;
            }

            // Detailed Results Table
            if (currentY > pageHeight - 60) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(79, 70, 229);
            doc.text("DETAILED SUBJECT-WISE BREAKDOWN", 20, currentY);
            currentY += 5;

            exams.forEach((exam, index) => {
                const headRow = ['Subject', 'Max Marks', 'Obtained', 'Grade', 'Status'];

                const tableBody = exam.cleanSubjects.map(sub => [
                    sub.subject_name,
                    sub.max_marks,
                    sub.attendance_status === 'Absent' ? 'AB' : (sub.marks_obtained !== null && sub.marks_obtained !== undefined ? sub.marks_obtained : '-'),
                    sub.grade || '-',
                    sub.attendance_status || 'Present'
                ]);

                autoTable(doc, {
                    startY: currentY,
                    head: [[{ content: `Exam: ${exam.name}`, colSpan: 5, styles: { halign: 'left', fillColor: [100, 100, 100], fontStyle: 'bold' } }], headRow],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [79, 70, 229], fontSize: 9, halign: 'center' },
                    columnStyles: {
                        0: { cellWidth: 60 },
                        1: { halign: 'center' },
                        2: { halign: 'center', fontStyle: 'bold' },
                        3: { halign: 'center' },
                        4: { halign: 'center' }
                    },
                    styles: { fontSize: 8 },
                    margin: { left: 20, right: 20 },
                    pageBreak: 'auto'
                });

                currentY = doc.lastAutoTable.finalY + 10;

                if (currentY > pageHeight - 30 && index < exams.length - 1) {
                    doc.addPage();
                    currentY = 20;
                }
            });

            // Footer
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                doc.text("© CMC - Professional Academic Report", 20, pageHeight - 10);
            }

            const fileName = `${(student.name || 'Student').replace(/\s+/g, '_')}_Performance_Report.pdf`;
            if (isMobileApp) {
                const dataUri = doc.output('datauristring');
                const base64 = dataUri.split(',')[1];
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'download',
                    payload: { base64, fileName, mimeType: 'application/pdf' }
                }));
            } else {
                doc.save(fileName);
            }
        } catch (error) {
            console.error("PDF Export failed:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const overallAvgScore = barChartData.length > 0 ? (barChartData.reduce((a, b) => a + b.percentage, 0) / barChartData.length).toFixed(1) : '0.0';
    const overallAttPct = (presentCount + absentCount) > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : 100;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full h-[100dvh] sm:max-w-6xl sm:h-[95vh] rounded-none sm:rounded-[2rem] p-0 flex flex-col overflow-hidden border-0 shadow-2xl">
                <DialogHeader className="p-4 sm:p-8 border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-900 shrink-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 w-full pr-8 sm:pr-10">
                        <div className="space-y-1.5 w-full md:w-auto">
                            <DialogTitle className="text-xl sm:text-3xl font-extrabold flex items-center gap-2 sm:gap-3 tracking-tight">
                                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg sm:rounded-xl shrink-0">
                                    <TrendingUp className="text-primary h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <span className="truncate max-w-[200px] sm:max-w-none block text-gray-900 dark:text-gray-100" title={student?.name}>
                                    {student?.name}
                                </span>
                            </DialogTitle>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted-foreground font-medium">
                                <Badge variant="outline" className="rounded-md">Roll: {student?.roll_no || 'N/A'}</Badge>
                                <Badge variant="outline" className="rounded-md">Grade: {student?.grade_name || 'N/A'}</Badge>
                                <Badge variant="outline" className="rounded-md">Year: {student?.academic_year_name || 'N/A'}</Badge>
                            </div>
                        </div>
                        <Button
                            onClick={downloadPDF}
                            disabled={isExporting}
                            variant="default"
                            className="w-full md:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none h-10 sm:h-12 px-4 sm:px-6 rounded-xl transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm font-semibold shrink-0"
                        >
                            {isExporting ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Download className="h-4 w-4 sm:h-5 sm:w-5" />}
                            {isExporting ? 'Generating PDF...' : 'Download PDF Report'}
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-grow overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-10 custom-scrollbar min-h-0">
                    {loading ? (
                        <div className="h-96 flex flex-col items-center justify-center gap-6">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-lg font-medium text-muted-foreground animate-pulse">Generating your personalized analytics...</p>
                        </div>
                    ) : !exams || exams.length === 0 ? (
                        <div className="h-96 flex flex-col items-center justify-center text-center p-6 sm:p-12 bg-gray-50/50 dark:bg-gray-800/20 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-800">
                            <div className="p-6 bg-white dark:bg-gray-900 rounded-full shadow-xl mb-6">
                                <Award className="h-16 w-16 text-gray-200" />
                            </div>
                            <h3 className="font-bold text-2xl text-gray-800 dark:text-gray-100 mb-2">No Academic Data Available</h3>
                            <p className="text-muted-foreground max-w-md mx-auto text-lg leading-relaxed">We couldn't find any recorded exam results for this student to generate a performance report.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                                {[
                                    { label: 'Exams Taken', val: exams.length, icon: Calendar, color: 'blue' },
                                    { label: 'Subjects', val: allSubjects.length, icon: BookOpen, color: 'indigo' },
                                    { label: 'Avg. Score', val: `${overallAvgScore}%`, icon: Award, color: 'emerald' },
                                    { label: 'Attendance', val: `${overallAttPct}%`, icon: CheckCircle, color: 'orange' }
                                ].map((stat, i) => (
                                    <Card key={i} className="border-0 shadow-sm bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl sm:rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                                        <CardContent className="p-4 sm:p-6 flex items-center gap-3 sm:gap-5">
                                            <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-${stat.color}-50 dark:bg-${stat.color}-900/20 shrink-0`}>
                                                <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{stat.label}</p>
                                                <p className="text-lg sm:text-2xl font-black truncate">{stat.val}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                                <Card className="border-0 shadow-sm rounded-2xl sm:rounded-[2rem] bg-white dark:bg-gray-900 overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5 text-indigo-500" />
                                            Exam Performance (%)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[280px] sm:h-[350px] p-3 sm:p-6" ref={barChartRef}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barChartData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 10 }} />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                                    contentStyle={{
                                                        backgroundColor: '#0f172a',
                                                        borderColor: '#334155',
                                                        borderRadius: '16px',
                                                        color: '#ffffff',
                                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                                                        padding: '12px 16px'
                                                    }}
                                                    itemStyle={{ color: '#818cf8', fontWeight: 'bold', fontSize: '13px' }}
                                                    labelStyle={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}
                                                />
                                                <Bar dataKey="percentage" name="Result (%)" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={32} isAnimationActive={false}>
                                                    <LabelList dataKey="percentage" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#1e1b4b' }} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-sm rounded-2xl sm:rounded-[2rem] bg-white dark:bg-gray-900 overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                                            Subject Score Trends
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[280px] sm:h-[350px] p-3 sm:p-6" ref={lineChartRef}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={lineChartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.15} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#0f172a',
                                                        borderColor: '#334155',
                                                        borderRadius: '16px',
                                                        color: '#ffffff',
                                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                                                        padding: '12px 16px'
                                                    }}
                                                    itemStyle={{ color: '#e2e8f0', fontSize: '12px', padding: '2px 0' }}
                                                    labelStyle={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                                {allSubjects.map((sub, idx) => (
                                                    <Line
                                                        key={sub}
                                                        type="monotone"
                                                        dataKey={sub}
                                                        stroke={COLORS[idx % COLORS.length]}
                                                        strokeWidth={3}
                                                        dot={{ r: 4, strokeWidth: 2 }}
                                                        activeDot={{ r: 6 }}
                                                        isAnimationActive={false}
                                                    />
                                                ))}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-sm rounded-2xl sm:rounded-[2rem] bg-white dark:bg-gray-900 overflow-hidden">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                            <PieIcon className="h-5 w-5 text-orange-500" />
                                            Attendance Overview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="h-[280px] sm:h-[350px] flex items-center justify-center p-3 sm:p-6" ref={pieChartRef}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieChartData}
                                                    cx="50%" cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={6}
                                                    dataKey="value"
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                    isAnimationActive={false}
                                                >
                                                    {pieChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#0f172a',
                                                        borderColor: '#334155',
                                                        borderRadius: '16px',
                                                        color: '#ffffff',
                                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                                                        padding: '12px 16px'
                                                    }}
                                                    itemStyle={{ color: '#e2e8f0', fontSize: '12px' }}
                                                    labelStyle={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '14px' }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {showLabOralChart ? (
                                    <Card className="border-0 shadow-sm rounded-2xl sm:rounded-[2rem] bg-white dark:bg-gray-900 overflow-hidden">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                                                <BarChart3 className="h-5 w-5 text-purple-500" />
                                                Practical & Oral Marks Analysis
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[280px] sm:h-[350px] p-3 sm:p-6" ref={labOralChartRef}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={labOralChartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                    <Tooltip
                                                        cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                                        contentStyle={{
                                                            backgroundColor: '#0f172a',
                                                            borderColor: '#334155',
                                                            borderRadius: '16px',
                                                            color: '#ffffff',
                                                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                                                            padding: '12px 16px'
                                                        }}
                                                        itemStyle={{ color: '#e2e8f0', fontSize: '12px', padding: '2px 0' }}
                                                        labelStyle={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}
                                                    />
                                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                                    {activeLabOralKeys.map((key, idx) => (
                                                        <Bar
                                                            key={key}
                                                            dataKey={key}
                                                            fill={COLORS[idx % COLORS.length]}
                                                            radius={[4, 4, 0, 0]}
                                                            isAnimationActive={false}
                                                        >
                                                            <LabelList dataKey={key} position="top" style={{ fontSize: '9px', fontWeight: 'bold', fill: '#1e1b4b' }} offset={5} />
                                                        </Bar>
                                                    ))}
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="border-0 shadow-sm rounded-2xl sm:rounded-[2rem] bg-indigo-600 text-white overflow-hidden">
                                        <CardContent className="p-6 sm:p-10 h-full flex flex-col justify-center">
                                            <h4 className="text-lg sm:text-2xl font-bold mb-4 italic leading-tight">"Education is the passport to the future, for tomorrow belongs to those who prepare for it today."</h4>
                                            <p className="text-indigo-100">— Malcolm X</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {/* Detailed Exam Sections */}
                            <div className="space-y-6 sm:space-y-8">
                                <h3 className="text-xl sm:text-2xl font-black tracking-tight border-l-4 border-primary pl-4">Detailed Subject Wise Performance</h3>
                                {exams.map((exam, exIdx) => (
                                    <Card key={exIdx} className="border-0 shadow-sm rounded-2xl sm:rounded-[2rem] bg-white dark:bg-gray-900/40 overflow-hidden border-t-4 border-indigo-500">
                                        <CardHeader className="bg-gray-50/50 dark:bg-gray-800/20 px-4 py-4 sm:px-8 sm:py-6">
                                            <div className="flex justify-between items-center">
                                                <CardTitle className="text-base sm:text-xl font-bold flex flex-wrap items-center gap-2 sm:gap-3">
                                                    <Calendar className="h-5 w-5 text-indigo-500" />
                                                    {exam.name}
                                                    {exam.date && (
                                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                            {new Date(exam.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                                        </Badge>
                                                    )}
                                                </CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0 overflow-x-auto">
                                            <Table className="min-w-[600px] sm:min-w-full">
                                                <TableHeader>
                                                    <TableRow className="bg-gray-50/30 dark:bg-gray-900/20 border-0 hover:bg-transparent">
                                                        <TableHead className="pl-4 sm:pl-8 py-3 sm:py-4 font-bold">Subject</TableHead>
                                                        <TableHead className="font-bold text-center">Sub-Components Breakdown</TableHead>
                                                        <TableHead className="font-bold text-center">Max Marks</TableHead>
                                                        <TableHead className="font-bold text-center">Marks Obtained</TableHead>
                                                        <TableHead className="font-bold text-center">Grade</TableHead>
                                                        <TableHead className="font-bold pr-4 sm:pr-8 text-right">Attendance</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {exam.cleanSubjects.map((sub, sIdx) => {
                                                        const subComps = [];
                                                        const pushIfVal = (label, val, maxVal) => {
                                                            if (val !== null && val !== undefined && val !== '' && val !== '-') {
                                                                subComps.push({ label, val: Math.round(Number(val)), maxVal: maxVal ? Math.round(Number(maxVal)) : null });
                                                            }
                                                        };

                                                        pushIfVal('Written', sub.written_marks_obtained, sub.written_max_marks);
                                                        pushIfVal('Reading', sub.reading_marks_obtained, sub.reading_max_marks);
                                                        pushIfVal('Writing', sub.writing_comp_marks_obtained, sub.writing_comp_max_marks);
                                                        pushIfVal('Dictation', sub.dictation_marks_obtained, sub.dictation_max_marks);
                                                        pushIfVal('Recitation', sub.recitation_marks_obtained, sub.recitation_max_marks);
                                                        pushIfVal('Oral', sub.oral_marks_obtained, sub.oral_max_marks);
                                                        pushIfVal('Theory', sub.theory_marks_obtained, sub.theory_max_marks);
                                                        pushIfVal('Lab', sub.lab_marks_obtained, sub.lab_max_marks);
                                                        pushIfVal('I.A./PR', sub.ia_pr_marks_obtained, sub.ia_pr_max_marks);

                                                        return (
                                                            <TableRow key={sIdx} className="border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                                                <TableCell className="pl-4 sm:pl-8 py-4 sm:py-5 font-semibold text-gray-700 dark:text-gray-200">{sub.subject_name}</TableCell>
                                                                <TableCell className="text-center">
                                                                    {subComps.length === 0 ? (
                                                                        <span className="text-slate-400 italic text-center block text-xs">-</span>
                                                                    ) : (
                                                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                                                            {subComps.map((c, cIdx) => (
                                                                                <span key={cIdx} className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-medium border text-slate-700 dark:text-slate-300">
                                                                                    {c.label}: <strong className="text-primary">{c.val}</strong> {c.maxVal ? `/${c.maxVal}` : ''}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center">{sub.max_marks}</TableCell>
                                                                <TableCell className="font-bold text-center">
                                                                    {sub.attendance_status === 'Absent' ? (
                                                                        <span className="text-red-500 flex items-center justify-center gap-1"><XCircle className="h-4 w-4" /> AB</span>
                                                                    ) : (
                                                                        <span className="text-indigo-600 dark:text-indigo-400">
                                                                            {sub.marks_obtained !== null && sub.marks_obtained !== undefined ? Math.round(Number(sub.marks_obtained)) : '-'}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-0">{sub.grade || 'N/A'}</Badge>
                                                                </TableCell>
                                                                <TableCell className="pr-4 sm:pr-8 text-right">
                                                                    <div className="flex justify-end">
                                                                        {sub.attendance_status === 'Absent' ? (
                                                                            <Badge className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1 px-3">
                                                                                <XCircle className="h-3 w-3" /> Absent
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1 px-3">
                                                                                <CheckCircle className="h-3 w-3" /> Present
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
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