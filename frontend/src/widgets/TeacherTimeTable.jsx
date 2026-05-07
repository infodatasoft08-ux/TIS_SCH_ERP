import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, GraduationCap, Calendar, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LABELS = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
  SUN: "Sunday",
};

export default function TeacherTimetable({ routines = [] }) {
  const slots = useMemo(() => {
    const set = new Set();
    routines.forEach((r) => {
      const start = r.start_time?.slice(11, 16) || "00:00";
      const end = r.end_time?.slice(11, 16) || "00:00";
      set.add(`${start}–${end}`);
    });
    return Array.from(set).sort();
  }, [routines]);

  // Find routine for day + time
  const getEntry = (day, slot) =>
    routines.find(
      (r) =>
        r.day_of_week === day &&
        `${r.start_time?.slice(11, 16)}–${r.end_time?.slice(11, 16)}` === slot
    );

  if (routines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-muted/20 border-2 border-dashed rounded-3xl animate-in fade-in duration-700">
        <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-xl font-semibold text-muted-foreground">No Schedule Found</h3>
        <p className="text-sm text-muted-foreground/70">Your teaching schedule will appear here.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop View (Table) */}
      <div className="hidden xl:block w-full overflow-hidden rounded-2xl border border-border/50 bg-background/50 backdrop-blur-xl shadow-md animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-6 text-left border-b border-border/50 w-[150px]">
                  <div className="flex items-center gap-2 text-primary font-bold">
                    <Clock className="h-4 w-4" />
                    Time
                  </div>
                </th>
                {DAYS.map((day) => (
                  <th key={day} className="p-6 text-center border-b border-l border-border/50 w-[200px]">
                    <span className="text-sm font-black uppercase tracking-widest text-foreground/80">{day}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, index) => (
                <tr key={slot} className={index % 2 === 0 ? "bg-transparent" : "bg-muted/10"}>
                  <td className="p-6 border-b border-border/30 font-mono text-sm font-semibold text-muted-foreground bg-muted/5">
                    {slot}
                  </td>
                  {DAYS.map((day) => {
                    const item = getEntry(day, slot);
                    return (
                      <td key={day} className="p-3 border-b border-l border-border/30 align-top h-32">
                        {item ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: index * 0.05 + DAYS.indexOf(day) * 0.02 }}
                            className="h-full w-full rounded-2xl p-4 shadow-sm border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
                          >
                            <div className="absolute -right-8 -bottom-8 h-24 w-24 rounded-full blur-2xl group-hover:blur-3xl transition-all duration-500 bg-blue-500/20" />

                            <div className="relative z-10 flex flex-col h-full">
                              <div className="flex items-center justify-between mb-2">
                                <GraduationCap className="h-4 w-4" />
                                <Badge variant="outline" className="text-[10px] font-bold border-0 bg-white/40 dark:bg-black/40 backdrop-blur-sm text-blue-700 dark:text-blue-300">
                                  {item.period ? `P-${item.period}` : 'CLASS'}
                                </Badge>
                              </div>

                              <div className="font-bold text-base leading-tight mb-2 line-clamp-1 group-hover:line-clamp-none transition-all">
                                {item.subject_name}
                              </div>

                              <div className="mt-auto space-y-1 text-xs opacity-80 font-medium">
                                {item.class_name && (
                                  <div className="flex items-center gap-1.5 text-foreground">
                                    <Users className="h-3 w-3 text-indigo-400" />
                                    <span>{item.class_name}</span>
                                  </div>
                                )}
                                {item.room && (
                                  <div className="flex items-center gap-1.5 text-foreground">
                                    <MapPin className="h-3 w-3 text-red-400" />
                                    <span>{item.room}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center opacity-10">
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet View (List) */}
      <div className="block xl:hidden w-full space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        {DAYS.map((day) => {
          const dayItems = slots.map((slot) => ({ slot, item: getEntry(day, slot) })).filter((x) => x.item);
          if (dayItems.length === 0) return null;

          return (
            <div key={day} className="bg-background/50 backdrop-blur-xl rounded-3xl border border-border/50 shadow-sm overflow-hidden">
              <div className="bg-muted/30 p-2 border-b border-border/50 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground tracking-wide">{DAY_LABELS[day]}</h3>
              </div>
              <div className="p-2 space-y-4">
                {dayItems.map(({ slot, item }) => (
                  <div key={slot} className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 rounded-2xl border relative overflow-hidden transition-all hover:shadow-md bg-gradient-to-br from-indigo-500/5 to-blue-500/10 border-blue-500/20">

                    <div className="absolute left-0 top-0 bottom-0 w-1.5 hidden sm:block bg-blue-500" />
                    <div className="absolute left-0 right-0 top-0 h-1.5 sm:hidden bg-blue-500" />

                    <div className="flex items-center sm:items-start gap-2 sm:w-28 shrink-0 mt-1 sm:mt-0 sm:ml-2">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 hidden sm:block" />
                      <div className="font-mono text-sm font-bold text-primary bg-background/80 px-2.5 py-1 rounded-md sm:bg-transparent sm:px-0 sm:py-0 border sm:border-none shadow-sm sm:shadow-none">{slot}</div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-bold text-base md:text-lg text-foreground flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          {item.subject_name}
                        </div>
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-bold border-0 bg-white/60 dark:bg-black/40 backdrop-blur-sm shadow-sm text-blue-700 dark:text-blue-300">
                          {item.period ? `P-${item.period}` : 'CLASS'}
                        </Badge>
                      </div>

                      <div className="inline-flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-1 bg-white/40 dark:bg-black/20 p-2 sm:p-2.5 rounded-lg">
                        {item.class_name && (
                          <div className="flex items-center gap-1.5 font-medium">
                            <Users className="h-4 w-4 text-indigo-500" />
                            <span className="text-foreground">{item.class_name}</span>
                          </div>
                        )}
                        {item.room && (
                          <div className="flex items-center gap-1.5 font-medium">
                            <MapPin className="h-4 w-4 text-red-500" />
                            <span className="text-foreground">{item.room}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}