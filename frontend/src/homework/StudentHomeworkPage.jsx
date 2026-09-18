import React, { useState, useEffect } from "react";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Calendar, Clock, ChevronRight, GraduationCap, Download } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AnimatedLayout from "@/AnimatedLayout";

export default function StudentHomeworkPage() {
  const [homeworks, setHomeworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id || user?.student_id) {
      loadMyHomework();
    }
  }, [user]);

  const loadMyHomework = async () => {
    setIsLoading(true);
    try {
      const studentIdentifier = user?.student_id || user?.id;
      const res = await API.get(`/homework/student/${studentIdentifier}`);
      setHomeworks(res.data.homeworks || []);
    } catch (err) {
      toast.error("Failed to load your homework");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatedLayout>
      <div className="min-h-screen pb-12">
        {/* Banner */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-600 text-white p-5 sm:p-8 md:p-12 mb-5 sm:mb-8 shadow-lg rounded-2xl sm:rounded-3xl">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-3 sm:mb-4">
              <div className="bg-white/20 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-md">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium">
                Daily Homework
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight mb-1 sm:mb-2">My Homework</h1>
            <p className="text-indigo-100 text-xs sm:text-base font-medium opacity-90">
              Stay on top of your studies with daily assignments and subject tasks.
            </p>
          </div>
        </div>

        <div className="px-2 sm:px-4 md:px-6 max-w-5xl mx-auto">
          {isLoading ? (
            <div className="space-y-4 sm:space-y-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border shadow-sm rounded-2xl p-4 sm:p-6">
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/4 mb-4" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </Card>
              ))}
            </div>
          ) : homeworks.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent text-center p-8 sm:p-12 rounded-2xl">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 sm:p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                  <Clock className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-200">No Homework Found</h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1">You're all caught up! Enjoy your free time.</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {homeworks.map((hw) => (
                <Card key={hw.id} className="group bg-card rounded-2xl sm:rounded-3xl border shadow-sm transition-all hover:shadow-md overflow-hidden">
                  <div className="h-1.5 sm:h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-lg sm:text-2xl font-black group-hover:text-indigo-600 transition-colors">
                          {hw.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 sm:gap-2 text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">
                          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
                          Assigned: {new Date(hw.homework_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center self-start sm:self-auto gap-2">
                        <div className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-900 font-bold text-xs sm:text-sm">
                          <GraduationCap className="w-4 h-4 shrink-0" />
                          {hw.grade_name} {hw.class_name ? `- ${hw.class_name}` : ''}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                      {hw.details?.map((detail, idx) => (
                        <div key={idx} className="relative p-4 sm:p-5 bg-muted/40 dark:bg-muted/20 rounded-xl sm:rounded-2xl border transition-all hover:border-indigo-300 dark:hover:border-indigo-800">
                          <div className="absolute top-0 right-0 p-3 sm:p-4 opacity-5 group-hover/detail:opacity-15 transition-opacity pointer-events-none">
                            <BookOpen className="w-10 h-10 text-indigo-600" />
                          </div>
                          <div className="relative">
                            <Badge className="mb-2 sm:mb-3 bg-indigo-600 text-white border-none px-2.5 py-0.5 font-bold text-[10px] sm:text-xs uppercase tracking-wider">
                              {detail.subject_name}
                            </Badge>
                            <p className="text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-relaxed font-medium whitespace-pre-wrap">
                              {detail.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <div className="bg-muted/30 dark:bg-muted/10 px-4 sm:px-6 py-3 sm:py-4 border-t flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-4">
                    <span className="text-[11px] sm:text-xs text-muted-foreground font-bold tracking-wider">TASK ID: HW-{hw.id}</span>
                    {hw.attachment_url && (
                      <a
                        href={hw.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Attachment
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AnimatedLayout>
  );
}