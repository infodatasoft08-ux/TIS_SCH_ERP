import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';

export const StudentAttendanceChart = ({ records = [] }) => {
    const monthlyData = useMemo(() => {
        if (!records || !records.length) return [];
        const months = {};
        records.forEach(r => {
            if (!r.attendance_date) return;
            try {
                const month = format(parseISO(r.attendance_date), 'MMM yyyy');
                if (!months[month]) months[month] = { month, present: 0, total: 0 };
                months[month].total++;
                if (r.status === 'present') months[month].present++;
            } catch (e) {}
        });
        return Object.values(months).map(m => ({
            ...m,
            percentage: Number(((m.present / m.total) * 100).toFixed(1))
        }));
    }, [records]);

    if (!monthlyData || monthlyData.length === 0) {
        return (
            <div className="h-[220px] sm:h-[280px] w-full mt-2 sm:mt-4 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
                <p className="font-semibold text-xs sm:text-sm">No Attendance Summary Found</p>
            </div>
        );
    }

    return (
        <div className="h-[220px] sm:h-[280px] w-full mt-2 sm:mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="month" 
                        stroke="#6b7280" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={5}
                    />
                    <YAxis 
                        stroke="#6b7280" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                        width={35}
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        formatter={(value) => [`${value}%`, 'Attendance']}
                    />
                    <Bar dataKey="percentage" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const StudentExamChart = ({ exams = [] }) => {
    const chartData = useMemo(() => {
        if (!Array.isArray(exams) || exams.length === 0) return [];

        return exams
            .map(e => {
                const examName = e.custom_exam_name || e.name || 'Exam';
                const subjects = e.subjects || [];

                let totalObtained = 0;
                let totalMax = 0;
                let hasMarks = false;

                subjects.forEach(sub => {
                    if (sub.marks_obtained !== null && sub.marks_obtained !== undefined) {
                        const obtained = Number(sub.marks_obtained);
                        if (!isNaN(obtained)) {
                            let maxm = (Number(sub.theory_max_marks) || 0) +
                                       (Number(sub.lab_max_marks) || 0) +
                                       (Number(sub.oral_max_marks) || 0) +
                                       (Number(sub.written_max_marks) || 0) +
                                       (Number(sub.reading_max_marks) || 0) +
                                       (Number(sub.writing_comp_max_marks) || 0) +
                                       (Number(sub.dictation_max_marks) || 0) +
                                       (Number(sub.recitation_max_marks) || 0) +
                                       (Number(sub.ia_pr_max_marks) || 0);

                            if (maxm <= 0) maxm = 100;

                            totalObtained += obtained;
                            totalMax += maxm;
                            hasMarks = true;
                        }
                    }
                });

                if (!hasMarks || totalMax <= 0) {
                    if (e.marks_obtained !== null && e.marks_obtained !== undefined && Number(e.max_marks) > 0) {
                        return {
                            name: examName,
                            percentage: Number(((Number(e.marks_obtained) / Number(e.max_marks)) * 100).toFixed(1)),
                            marks: `${e.marks_obtained}/${e.max_marks}`
                        };
                    }
                    return null;
                }

                const percentage = Number(((totalObtained / totalMax) * 100).toFixed(1));
                return {
                    name: examName,
                    percentage,
                    marks: `${totalObtained}/${totalMax}`
                };
            })
            .filter(Boolean);
    }, [exams]);

    if (!chartData || chartData.length === 0) {
        return (
            <div className="h-[200px] sm:h-[260px] w-full mt-2 sm:mt-4 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 text-center">
                <p className="font-semibold text-xs sm:text-sm">No Published Exam Results</p>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Results will appear here once published by teachers.</p>
            </div>
        );
    }

    return (
        <div className="h-[220px] sm:h-[280px] w-full mt-2 sm:mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="name" 
                        stroke="#6b7280" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={5}
                        tickFormatter={(val) => (val && val.length > 10 ? `${val.substring(0, 10)}...` : val)}
                    />
                    <YAxis 
                        stroke="#6b7280" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                        width={35}
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        formatter={(value, name, props) => [`${value}% (${props.payload.marks})`, 'Performance']}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="percentage" 
                        stroke="#10b981" 
                        strokeWidth={2.5} 
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 1.5, stroke: '#fff' }} 
                        activeDot={{ r: 6, strokeWidth: 0 }} 
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export const TeacherClassAttendanceChart = ({ data = [] }) => {
    return (
        <div className="h-[220px] sm:h-[280px] w-full mt-2 sm:mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} domain={[0, 100]} width={35} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        formatter={(value) => [`${value}%`, 'Average Presence']}
                    />
                    <Bar dataKey="averagePresence" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const TeacherClassPerformanceChart = ({ trends = [] }) => {
    return (
        <div className="h-[220px] sm:h-[280px] w-full mt-2 sm:mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="exam_name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} dy={5} tickFormatter={(val) => (val && val.length > 10 ? `${val.substring(0, 10)}...` : val)} />
                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toFixed(0)}%`} domain={[0, 100]} width={35} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        formatter={(value) => [`${value.toFixed(1)}%`, 'Class Average']}
                    />
                    <Bar dataKey="avg_percentage" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={28} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
