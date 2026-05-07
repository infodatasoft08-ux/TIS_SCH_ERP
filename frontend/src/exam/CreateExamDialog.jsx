import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import API from "@/api";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { convertToYYYYMMDD } from "@/helper/dateconversion";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { ComboboxFormField } from "@/widgets/comboboxFormField";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  class_id: z.coerce.string().optional(),
  grade_id: z.coerce.string().min(1, "Grade is required"),
  academic_year_id: z.coerce.string().min(1, "Academic Year is required"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  note: z.string().optional(),
  subjects: z.array(z.object({
    subject_id: z.coerce.number(),
    max_marks: z.coerce.number(),
    passing_marks: z.coerce.number()
  })).min(1, "At least one subject is required")
});

export default function CreateExamDialog({ open, onOpenChange, classes, grades, subjects, onSuccess, examToEdit }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedSubjectsMap, setSelectedSubjectsMap] = useState({});

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      class_id: "",
      grade_id: "",
      academic_year_id: "",
      start_date: "",
      end_date: "",
      note: "",
      subjects: []
    }
  });

  const selectedGradeId = form.watch("grade_id");

  useEffect(() => {
    if (selectedGradeId) {
      fetchGradeSubjects(selectedGradeId);
    } else {
      setFilteredSubjects([]);
    }
  }, [selectedGradeId]);

  const fetchGradeSubjects = async (gradeId) => {
    try {
      const res = await API.get(`/admin/get/grade/${gradeId}/subjects`);
      setFilteredSubjects(res.data.subjects || []);
    } catch (error) {
      console.error("Error fetching grade subjects:", error);
    }
  };

  useEffect(() => {
    if (open) {
      if (examToEdit) {
        form.reset({
          name: examToEdit.name || "",
          class_id: examToEdit.class_id ? examToEdit.class_id.toString() : "",
          grade_id: examToEdit.grade_id ? examToEdit.grade_id.toString() : "",
          academic_year_id: examToEdit.academic_year_id ? examToEdit.academic_year_id.toString() : "",
          start_date: examToEdit.start_date || "",
          end_date: examToEdit.end_date || "",
          note: examToEdit.note || "",
          subjects: examToEdit.subjects ? examToEdit.subjects.map(s => ({ subject_id: s.subject_id, max_marks: s.max_marks, passing_marks: s.passing_marks })) : []
        });
        
        if (examToEdit.class_id) {
            // Find grade for this class
            const c = classes.find(cls => cls.id === examToEdit.class_id);
            if (c) {
                form.setValue("grade_id", c.grade_id.toString());
            }
        }

        const initialMap = {};
        if (examToEdit.subjects) {
            examToEdit.subjects.forEach(s => {
                initialMap[s.subject_id] = { checked: true, max_marks: s.max_marks, passing_marks: s.passing_marks };
            });
        }
        setSelectedSubjectsMap(initialMap);
      } else {
        form.reset({
          name: "",
          class_id: "",
          grade_id: "",
          academic_year_id: "",
          start_date: "",
          end_date: "",
          note: "",
          subjects: []
        });
        setSelectedSubjectsMap({});
      }
    }
  }, [open, examToEdit, form, classes]);

  useEffect(() => {
    async function fetchAcademicYears() {
      try {
        const res = await API.get("/admin/get/academic-years");
        const years = res.data.academic_years || [];
        setAcademicYears(years);

        if (!examToEdit && years.length > 0 && !form.getValues("academic_year_id")) {
          const firstYear = years[0];
          if (firstYear) {
            form.setValue("academic_year_id", firstYear.id.toString(), { shouldValidate: true, shouldDirty: true });
          }
        }
      } catch (err) {
        console.error("Failed to fetch academic years", err);
      }
    }
    if (open) fetchAcademicYears();
  }, [open, examToEdit, form]);

  const handleSubjectToggle = (subject, checked) => {
      const updatedMap = { ...selectedSubjectsMap };
      if (checked) {
          updatedMap[subject.id] = { checked: true, max_marks: 100, passing_marks: 35 };
      } else {
          delete updatedMap[subject.id];
      }
      setSelectedSubjectsMap(updatedMap);
      syncFormSubjects(updatedMap);
  };

  const handleMarksChange = (subjectId, field, value) => {
      const updatedMap = { ...selectedSubjectsMap };
      if (updatedMap[subjectId]) {
          updatedMap[subjectId][field] = value;
          setSelectedSubjectsMap(updatedMap);
          syncFormSubjects(updatedMap);
      }
  };

  const syncFormSubjects = (map) => {
      const subjectsArray = Object.keys(map).map(id => ({
          subject_id: parseInt(id),
          max_marks: map[id].max_marks,
          passing_marks: map[id].passing_marks
      }));
      form.setValue("subjects", subjectsArray, { shouldValidate: true });
  };

  async function submit(data) {
    const formattedStartDate = convertToYYYYMMDD(data.start_date);
    if (formattedStartDate) {
      data.start_date = formattedStartDate;
    }

    const formattedEndDate = convertToYYYYMMDD(data.end_date);
    if (formattedEndDate) {
      data.end_date = formattedEndDate;
    }

    setIsSubmitting(true);
    try {
      if (examToEdit) {
        await API.put(`/exam/update/exams/${examToEdit.id}`, data);
        toast.success("Exam updated successfully");
      } else {
        await API.post("/exam/add/exams", data);
        toast.success("Exam created successfully");
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Exam submission error:", error);
      toast.error(error.response?.data?.error || "Failed to save exam");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] rounded-3xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{examToEdit ? "Edit Exam" : "Create New Exam"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <ScrollArea className="overflow-y-auto h-[calc(100vh-200px)]">
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4 pt-4 px-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Unit Test 1" />
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
                      <FormLabel>Academic Year *</FormLabel>
                      <FormControl>
                        <Select
                          disabled={!!examToEdit}
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {academicYears.map((ay) => (
                              <SelectItem key={ay.id} value={ay.id.toString()}>
                                {ay.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="grade_id"
                  control={form.control}
                  render={({ field }) => (
                    <ComboboxFormField
                      field={field}
                      label="Grade"
                      required
                      items={grades}
                      valueKey="id"
                      labelKey="name"
                      searchKey="name"
                      placeholder="Select Grade"
                      searchPlaceholder="Search grade..."
                      emptyMessage="No grade found."
                    />
                  )}
                />

                <FormField
                  name="class_id"
                  control={form.control}
                  render={({ field }) => (
                    <ComboboxFormField
                      field={field}
                      label="Class"
                      items={[{ id: "", name: "Select None / Clear" }, ...classes]}
                      valueKey="id"
                      labelKey="name"
                      searchKey="name"
                      placeholder="Select Class"
                      searchPlaceholder="Search class..."
                      emptyMessage="No class found."
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exam Start Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="dd/mm/yyyy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exam End Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="dd/mm/yyyy"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              <div className="grid grid-cols-1 gap-4">
                  <FormField
                    name="note"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instructions/Note</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Enter exam instructions..." rows={1} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

              {filteredSubjects.length > 0 && (
                  <div className="mt-6 border-t pt-4">
                      <FormLabel className="text-lg font-semibold mb-2 block">Select Subjects for Exam *</FormLabel>
                      {form.formState.errors.subjects && <p className="text-sm text-red-500 mb-2">{form.formState.errors.subjects.message}</p>}
                      <div className="space-y-4">
                          {filteredSubjects.filter(s => {
                              const n = s.name?.toLowerCase().trim();
                              return !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
                          }).map(subject => {
                              const isChecked = !!selectedSubjectsMap[subject.id];
                              return (
                                  <div key={subject.id} className="flex flex-col md:flex-row items-start md:items-center justify-between border p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                                      <div className="flex items-center space-x-2">
                                          <Checkbox 
                                            id={`subject-${subject.id}`} 
                                            checked={isChecked}
                                            disabled={!!examToEdit}
                                            onCheckedChange={(checked) => handleSubjectToggle(subject, checked)}
                                          />
                                          <label htmlFor={`subject-${subject.id}`} className="font-medium cursor-pointer text-slate-900 dark:text-slate-100">
                                              {subject.name}
                                          </label>
                                      </div>
                                      
                                      {isChecked && (
                                          <div className="flex space-x-4 mt-2 md:mt-0 ml-6 md:ml-0">
                                              <div>
                                                  <label className="text-xs text-gray-500 block">Total Marks</label>
                                                  <Input 
                                                    type="number" 
                                                    className="w-24 h-8" 
                                                    value={selectedSubjectsMap[subject.id].max_marks}
                                                    onChange={(e) => handleMarksChange(subject.id, 'max_marks', parseInt(e.target.value) || 0)}
                                                    min="1"
                                                  />
                                              </div>
                                              <div>
                                                  <label className="text-xs text-gray-500 block">Passing Marks</label>
                                                  <Input 
                                                    type="number" 
                                                    className="w-24 h-8" 
                                                    value={selectedSubjectsMap[subject.id].passing_marks}
                                                    onChange={(e) => handleMarksChange(subject.id, 'passing_marks', parseInt(e.target.value) || 0)}
                                                    min="1"
                                                  />
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              )
                          })}
                      </div>
                  </div>
              )}
            </form>
          </ScrollArea>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={isSubmitting} onClick={form.handleSubmit(submit)}>
              {isSubmitting ? "Saving..." : (examToEdit ? "Update Exam" : "Create Exam")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}