import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import API from "@/api";
import { Loader2, BookOpen, Calendar as CalendarIcon, Hash } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const homeworkSchema = z.object({
  title: z.string().min(3, "Title is required"),
  grade_id: z.coerce.string().min(1, "Grade is required"),
  class_id: z.coerce.string().optional(),
  academic_year_id: z.coerce.string().min(1, "Academic Year is required"),
  homework_date: z.string().min(1, "Date is required"),
  subject_homeworks: z.array(z.object({
    subject_id: z.number(),
    subject_name: z.string(),
    description: z.string().optional()
  })).min(1, "At least one subject homework is required"),
  file: z.any().optional()
});

export default function AddHomeworkForm({ open, onOpenChange, onSuccess, homeworkToEdit = null }) {
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const form = useForm({
    resolver: zodResolver(homeworkSchema),
    defaultValues: {
      title: "",
      grade_id: "",
      class_id: "",
      academic_year_id: "",
      homework_date: new Date().toISOString().split('T')[0],
      subject_homeworks: [],
      file: null
    }
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "subject_homeworks"
  });

  // Fetch initial data
  useEffect(() => {
    const init = async () => {
      if (open) {
        await fetchGradesAndClasses();
        if (homeworkToEdit) {
          await resetFormWithEditData();
        } else {
          form.reset({
            title: "",
            grade_id: "",
            class_id: "",
            academic_year_id: "",
            homework_date: new Date().toISOString().split('T')[0],
            subject_homeworks: []
          });
          setSubjects([]);
        }
      }
    };
    init();
  }, [open, homeworkToEdit]);

  const fetchGradesAndClasses = async () => {
    try {
      const [gradesRes, classesRes, ayRes] = await Promise.all([
        API.get("/admin/get/grades"),
        API.get("/admin/get/classes"),
        API.get("/admin/get/academic-years")
      ]);
      setGrades(gradesRes.data.grades || []);
      setClasses(classesRes.data.classes || []);
      setAcademicYears(ayRes.data.academic_years || []);
    } catch (err) {
      toast.error("Failed to load initial data");
    }
  };

  const resetFormWithEditData = async () => {
    setIsFetchingData(true);
    try {
      // Fetch subjects for the grade first
      const subRes = await API.get(`/admin/get/grade/${homeworkToEdit.grade_id}/subjects`);
      const gradeSubjects = subRes.data.subjects || [];
      setSubjects(gradeSubjects);

      // Prepare subject_homeworks by matching grade subjects with existing homework details
      const subjectHomeworks = gradeSubjects.map(sub => {
        const detail = homeworkToEdit.details?.find(d => d.subject_id === sub.id);
        return {
          subject_id: sub.id,
          subject_name: sub.name,
          description: detail ? detail.description : ""
        };
      });

      // Fix date offset issue by formatting locally
      const dateObj = new Date(homeworkToEdit.homework_date);
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

      form.reset({
        title: homeworkToEdit.title,
        grade_id: homeworkToEdit.grade_id.toString(),
        class_id: homeworkToEdit.class_id?.toString() || "all",
        academic_year_id: homeworkToEdit.academic_year_id?.toString() || "",
        homework_date: formattedDate,
        subject_homeworks: subjectHomeworks
      });

      // Explicitly set class_id again to ensure Select component updates correctly
      if (homeworkToEdit.class_id) {
        setTimeout(() => {
          form.setValue("class_id", homeworkToEdit.class_id.toString());
        }, 100);
      } else {
        form.setValue("class_id", "all");
      }

      // Force useFieldArray to update its internal state with the mapped data
      replace(subjectHomeworks);
    } catch (err) {
      console.log(err);
    } finally {
      setIsFetchingData(false);
    }
  };

  // Fetch subjects when grade changes
  const selectedGrade = form.watch("grade_id");
  // Fetch subjects when grade changes manually via Select

  const fetchSubjects = async (gradeId) => {
    try {
      const res = await API.get(`/admin/get/grade/${gradeId}/subjects`);
      const gradeSubjects = res.data.subjects || [];
      setSubjects(gradeSubjects);

      const newFields = gradeSubjects.map(sub => ({
        subject_id: sub.id,
        subject_name: sub.name,
        description: ""
      }));
      replace(newFields);
    } catch (err) {
      toast.error("Failed to load subjects for selected grade");
    }
  };

  const onSubmit = async (values) => {
    // Filter out subjects with no description
    const filteredHomeworks = values.subject_homeworks.filter(h => h.description && h.description.trim() !== "");

    if (filteredHomeworks.length === 0) {
      toast.error("Please add homework for at least one subject");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("grade_id", values.grade_id);
      formData.append("class_id", values.class_id || "all");
      formData.append("academic_year_id", values.academic_year_id);
      formData.append("homework_date", values.homework_date);
      formData.append("subject_homeworks", JSON.stringify(filteredHomeworks));

      if (values.file && values.file[0]) {
        formData.append("file", values.file[0]);
      }

      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };

      if (homeworkToEdit) {
        await API.put(`/homework/update/${homeworkToEdit.id}`, formData, config);
        toast.success("Homework updated successfully");
      } else {
        await API.post("/homework/add", formData, config);
        toast.success("Homework created and WhatsApp messages queued");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save homework");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClasses = classes.filter(c => c.grade_id.toString() === selectedGrade);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            {homeworkToEdit ? "Update Homework" : "Create New Homework"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Homework Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Weekly Homework, Project Task" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="academic_year_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Academic Year</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {academicYears.map(ay => (
                              <SelectItem key={ay.id} value={ay.id.toString()}>{ay.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grade_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Grade / Class</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            fetchSubjects(val);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Grade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {grades.map(g => (
                              <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="class_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Section (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All Sections" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">All Sections</SelectItem>
                            {filteredClasses.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="homework_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Submission Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input type="date" className="pl-10" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="file"
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormItem>
                        <FormLabel>Attachment (Optional) - PDF or Image (Max 2MB)</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file && file.size > 2 * 1024 * 1024) {
                                toast.error("File size must be less than 2MB");
                                e.target.value = null;
                                return;
                              }
                              onChange(e.target.files);
                            }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>


                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Hash className="w-5 h-5 text-primary" />
                    Subject Wise Homework
                  </h3>

                  {fields.length === 0 && selectedGrade && !isFetchingData && (
                    <p className="text-muted-foreground text-sm italic">No subjects assigned to this grade.</p>
                  )}

                  {!selectedGrade && (
                    <p className="text-muted-foreground text-sm italic">Please select a grade to see subjects.</p>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="p-4 rounded-lg border bg-muted/30 space-y-2">
                        <label className="text-sm font-bold text-primary uppercase">{field.subject_name}</label>
                        <FormField
                          control={form.control}
                          name={`subject_homeworks.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea
                                  placeholder={`Enter homework for ${fields[index].subject_name}...`}
                                  className="resize-none"
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t bg-muted/20">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  homeworkToEdit ? "Update Homework" : "Save & Send WhatsApp"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}