import React, { useState } from 'react';
import { Trophy, Award, Medal, Crown, GraduationCap, ChevronRight, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function ClassTopRankersCard({ examTrends = [], className = '' }) {
    const [selectedExamId, setSelectedExamId] = useState(() => {
        return examTrends && examTrends.length > 0 ? String(examTrends[0].exam_id) : 'all';
    });

    if (!examTrends || examTrends.length === 0) {
        return (
            <Card className="rounded-2xl border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
                <CardHeader className="p-4 sm:p-6 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-xl font-bold">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Class Top Rankers & Exam Performance
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 text-center text-gray-400">
                    <div className="p-6 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed text-xs sm:text-sm">
                        No published exam results found for your supervised class yet.
                    </div>
                </CardContent>
            </Card>
        );
    }

    const currentTrend = examTrends.find(t => String(t.exam_id) === String(selectedExamId)) || examTrends[0];
    const rankers = currentTrend?.top_rankers || [];

    const getRankColor = (rank) => {
        if (rank === 1) return {
            bg: "bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-600/5 border-amber-400/40",
            badge: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white",
            icon: <Crown className="w-5 h-5 text-amber-500" />,
            label: "🥇 1st Rank"
        };
        if (rank === 2) return {
            bg: "bg-gradient-to-br from-slate-300/20 via-gray-400/10 to-slate-500/5 border-slate-300/40",
            badge: "bg-gradient-to-r from-slate-400 to-slate-500 text-white",
            icon: <Award className="w-5 h-5 text-slate-400" />,
            label: "🥈 2nd Rank"
        };
        if (rank === 3) return {
            bg: "bg-gradient-to-br from-amber-700/20 via-orange-600/10 to-amber-800/5 border-amber-600/40",
            badge: "bg-gradient-to-r from-amber-700 to-orange-600 text-white",
            icon: <Medal className="w-5 h-5 text-amber-700" />,
            label: "🥉 3rd Rank"
        };
        return {
            bg: "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700",
            badge: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
            icon: <GraduationCap className="w-4 h-4 text-gray-500" />,
            label: `Rank #${rank}`
        };
    };

    return (
        <Card className="rounded-2xl border-none shadow-xl bg-white dark:bg-gray-900/50 overflow-hidden">
            <CardHeader className="p-3 sm:p-6 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800">
                <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-xl font-bold">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Class Top Rankers ({className || 'Supervised Class'})
                    </CardTitle>
                    <p className="text-xs text-gray-400 mt-0.5">Top performing students in published examinations.</p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {currentTrend?.avg_percentage !== undefined && (
                        <Badge variant="outline" className="text-xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200">
                            Class Avg: {currentTrend.avg_percentage}%
                        </Badge>
                    )}

                    {examTrends.length > 1 && (
                        <Select value={String(selectedExamId)} onValueChange={setSelectedExamId}>
                            <SelectTrigger className="h-8 text-xs font-semibold w-[140px] sm:w-[170px]">
                                <SelectValue placeholder="Select Exam" />
                            </SelectTrigger>
                            <SelectContent>
                                {examTrends.map(t => (
                                    <SelectItem key={t.exam_id} value={String(t.exam_id)} className="text-xs">
                                        {t.exam_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-3 sm:p-6 pt-3 sm:pt-4 space-y-4">
                {/* Top 3 Rankers Podium Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {rankers.slice(0, 3).map((r) => {
                        const style = getRankColor(r.rank);
                        return (
                            <div
                                key={r.student_id}
                                className={cn(
                                    "p-3 sm:p-4 rounded-xl border flex flex-col justify-between transition-all duration-300 hover:shadow-md relative overflow-hidden",
                                    style.bg
                                )}
                            >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <Badge className={cn("text-[10px] font-extrabold px-2 py-0.5 border-none shadow-sm", style.badge)}>
                                        {style.label}
                                    </Badge>
                                    <div className="p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-sm">
                                        {style.icon}
                                    </div>
                                </div>

                                <div className="space-y-1 my-1">
                                    <h4 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                                        {r.student_name}
                                    </h4>
                                    <p className="text-[11px] font-medium text-gray-500">
                                        Roll No: <span className="font-bold text-gray-700 dark:text-gray-300">{r.roll_no || 'N/A'}</span>
                                    </p>
                                </div>

                                <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">Marks: {r.total_obtained}/{r.total_max}</span>
                                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{r.percentage}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Additional Rankers List (Rank 4, 5...) */}
                {rankers.length > 3 && (
                    <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                            Other Top Performers
                        </div>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                            {rankers.slice(3).map((r) => (
                                <div key={r.student_id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/40 rounded-lg text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0.5">
                                            #{r.rank}
                                        </Badge>
                                        <span className="font-bold text-gray-800 dark:text-gray-200 truncate">{r.student_name}</span>
                                        <span className="text-[10px] text-gray-400">(Roll: {r.roll_no})</span>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[10px] text-gray-400">{r.total_obtained}/{r.total_max}</span>
                                        <span className="font-extrabold text-emerald-600 text-xs">{r.percentage}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
