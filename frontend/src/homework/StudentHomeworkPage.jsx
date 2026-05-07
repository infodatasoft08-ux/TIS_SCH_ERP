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
    if (user?.id) {
      loadMyHomework();
    }
  }, [user]);

  const loadMyHomework = async () => {
    setIsLoading(true);
    try {
      const res = await API.get(`/homework/student/${user.id}`);
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
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-600 text-white p-8 md:p-12 mb-8 shadow-lg rounded-lg">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <Badge variant="outline" className="bg-white/10 text-white border-white/20 px-3 py-1 text-sm font-medium">
                Daily Homework
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">My Homework</h1>
            <p className="text-indigo-100 text-lg md:text-xl font-medium opacity-90">
              Stay on top of your studies with daily assignments.
            </p>
          </div>
        </div>

        <div className="px-4 md:px-8 max-w-5xl mx-auto">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardHeader>
                    <Skeleton className="h-6 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : homeworks.length === 0 ? (
            <Card className="border-dashed border-2 bg-transparent text-center p-12">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full">
                  <Clock className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-400">No Homework Found</h3>
                  <p className="text-slate-500">You're all caught up! Enjoy your free time.</p>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {homeworks.map((hw) => (
                <Card key={hw.id} className="group bg-white dark:bg-gray-900/50 rounded-[2rem] border shadow-sm transition-all hover:shadow-md">
                  <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl" />
                  <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-2xl font-black group-hover:text-indigo-600 transition-colors">
                          {hw.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 text-slate-400 font-medium">
                          <Calendar className="w-4 h-4 text-indigo-500" />
                          Assigned: {new Date(hw.homework_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl flex items-center gap-2 border border-indigo-100 font-bold text-sm">
                          <GraduationCap className="w-4 h-4" />
                          {hw.grade_name} {hw.class_name ? `- ${hw.class_name}` : ''}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 ">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {hw.details?.map((detail, idx) => (
                        <div key={idx} className="relative p-6 bg-white dark:bg-gray-900/50 rounded-[2rem] border shadow-sm transition-all hover:shadow-md">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/detail:opacity-20 transition-opacity">
                            <BookOpen className="w-12 h-12 text-indigo-600" />
                          </div>
                          <div className="relative">
                            <Badge className="mb-3 bg-indigo-600 text-white border-none px-3 py-1 font-bold text-[10px] uppercase tracking-wider">
                              {detail.subject_name}
                            </Badge>
                            <p className="text-slate-400 leading-relaxed font-medium whitespace-pre-wrap">
                              {detail.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <div className="dark:bg-slate-500 bg-slate-50 px-8 py-4 border-t flex justify-between items-center transition-colors">
                    <span className="text-xs dark:text-slate-300 text-slate-700 font-bold uppercase tracking-widest">Task ID: HW-{hw.id}</span>
                    {hw.attachment_url && (
                      <a
                        href={hw.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Material
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