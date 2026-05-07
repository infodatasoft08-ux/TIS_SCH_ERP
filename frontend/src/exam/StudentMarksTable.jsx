import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import API from "@/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Save, User } from "lucide-react";

export default function StudentMarksTable({ exam }) {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    Promise.all([
      API.get(`/students/get/student/class/${exam.class_id}?academic_year_id=${exam.academic_year_id}`),
      API.get(`/exam/list/exam/${exam.id}/results`)
    ]).then(([studentsRes, resultsRes]) => {
      const allStudents = studentsRes.data.students || [];
      const existingResults = resultsRes.data.results || [];

      // Filter out students who already have marks
      const studentIdsWithMarks = new Set(existingResults.map(r => r.student_id));
      const filteredStudents = allStudents.filter(s => !studentIdsWithMarks.has(s.student_id));

      setStudents(filteredStudents);
    }).catch(err => {
      console.error("Error loading marks table data:", err);
      toast.error("Failed to load student data for this exam.");
    });
  }, [exam]);

  async function saveMarks(student, remarks, marks) {
    try {
      await API.post(`/exam/insert/exam/${exam.id}/results`, {
        results: [
          {
            student_id: student.student_id,
            marks_obtained: marks,
            remarks: remarks
          }
        ]
      });

      setStudents(prev => prev.filter(s => s.student_id !== student.student_id));
      toast.success("Marks saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save marks");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <span className="bg-primary/10 text-primary p-1.5 rounded-md">
            <User className="h-5 w-5" />
          </span>
          Pending Grading
          <span className="ml-2 text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {students.length}
          </span>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">All done!</p>
          <p className="text-sm">No pending students found for this exam.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-950">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-600 dark:text-gray-300">Student</th>
                  <th className="p-4 text-left font-semibold text-gray-600 dark:text-gray-300">Details</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 w-40">Marks <span className="text-xs font-normal text-muted-foreground">(Max: {exam.max_marks})</span></th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Remarks</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 w-28 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {students.map((s, index) => (
                  <tr key={s.student_id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-white dark:border-gray-800 shadow-sm">
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs font-bold">
                            {s.student_name ? s.student_name.substring(0, 2).toUpperCase() : "ST"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{s.student_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-xs">
                        {s.grade_name} • {s.class_name}
                      </span>
                    </td>
                    <td className="p-4">
                      <Input
                        type="number"
                        min="0"
                        max={exam.max_marks}
                        className="h-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 text-center font-medium"
                        placeholder="0"
                        onChange={e => (s.marks = e.target.value)}
                      />
                    </td>
                    <td className="p-4">
                      <Input
                        className="h-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20"
                        placeholder="Add remarks..."
                        onChange={e => (s.remarks = e.target.value)}
                      />
                    </td>
                    <td className="p-4 text-center">
                      <Button
                        size="sm"
                        className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 w-full"
                        onClick={() => saveMarks(s, s.remarks, s.marks)}
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" /> Save
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {students.map(s => (
              <Card key={s.student_id} className="shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-purple-500/50" />
                <CardContent className="p-5 space-y-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 ring-2 ring-gray-100 dark:ring-gray-800">
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
                        {s.student_name ? s.student_name.substring(0, 2).toUpperCase() : "ST"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100">{s.student_name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.grade_name} - {s.class_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marks</label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max={exam.max_marks}
                          className="h-11 bg-gray-50 dark:bg-gray-900 text-lg font-medium text-center"
                          placeholder="0"
                          onChange={e => (s.marks = e.target.value)}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/{exam.max_marks}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</label>
                      <Button
                        className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                        onClick={() => saveMarks(s, s.remarks, s.marks)}
                      >
                        <Save className="h-4 w-4 mr-2" /> Save
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remarks</label>
                    <Input
                      className="bg-gray-50 dark:bg-gray-900"
                      placeholder="Optional notes..."
                      onChange={e => (s.remarks = e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
