import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, Cell
} from 'recharts';
import { format, parseISO } from 'date-fns';

export const StudentAttendanceChart = ({ records = [] }) => {
    const monthlyData = useMemo(() => {
        if (!records.length) return [];
        const months = {};
        records.forEach(r => {
            if (!r.attendance_date) return;
            const month = format(parseISO(r.attendance_date), 'MMM yyyy');
            if (!months[month]) months[month] = { month, present: 0, total: 0 };
            months[month].total++;
            if (r.status === 'present') months[month].present++;
        });
        return Object.values(months).map(m => ({
            ...m,
            percentage: Number(((m.present / m.total) * 100).toFixed(1))
        }));
    }, [records]);

    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="month" 
                        stroke="#6b7280" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                    />
                    <YAxis 
                        stroke="#6b7280" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`${value}%`, 'Attendance']}
                    />
                    <Bar dataKey="percentage" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const StudentExamChart = ({ exams = [] }) => {
    const chartData = useMemo(() => {
        return exams
            .filter(e => e.marks_obtained !== null && e.max_marks > 0)
            .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
            .map(e => ({
                name: e.name || e.exam_name,
                percentage: Number(((e.marks_obtained / e.max_marks) * 100).toFixed(1)),
                marks: `${e.marks_obtained}/${e.max_marks}`
            }));
    }, [exams]);

    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="name" 
                        stroke="#6b7280" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                    />
                    <YAxis 
                        stroke="#6b7280" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                    />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value, name, props) => [`${value}% (${props.payload.marks})`, 'Performance']}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="percentage" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 8, strokeWidth: 0 }} 
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export const TeacherClassAttendanceChart = ({ data = [] }) => {
    // data expected in format: { month, averagePresence }
    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`${value}%`, 'Average Presence']}
                    />
                    <Bar dataKey="averagePresence" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const TeacherClassPerformanceChart = ({ trends = [] }) => {
    // trends from GetSupervisedClassExamTrends: { exam_name, avg_percentage }
    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="exam_name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value.toFixed(0)}%`} domain={[0, 100]} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value) => [`${value.toFixed(1)}%`, 'Class Average']}
                    />
                    <Bar dataKey="avg_percentage" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
