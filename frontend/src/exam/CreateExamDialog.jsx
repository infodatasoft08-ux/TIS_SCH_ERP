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
  exam_type: z.string().min(1, "Exam type is required"),
  custom_exam_name: z.string().optional(),
  class_id: z.coerce.string().optional(),
  grade_id: z.coerce.string().min(1, "Grade is required"),
  academic_year_id: z.coerce.string().min(1, "Academic Year is required"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  note: z.string().optional(),
  subjects: z.array(z.object({
    subject_id: z.coerce.number(),
    max_marks: z.coerce.number(),
    passing_marks: z.coerce.number(),
    has_theory: z.boolean().optional(),
    has_lab: z.boolean().optional(),
    has_oral: z.boolean().optional(),
    theory_max_marks: z.coerce.number().optional(),
    lab_max_marks: z.coerce.number().optional(),
    oral_max_marks: z.coerce.number().optional()
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
      exam_type: "UNIT_TEST_1",
      custom_exam_name: "",
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
  const selectedExamType = form.watch("exam_type");

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
          exam_type: examToEdit.exam_type || "OTHER",
          custom_exam_name: examToEdit.custom_exam_name || "",
          class_id: examToEdit.class_id ? examToEdit.class_id.toString() : "",
          grade_id: examToEdit.grade_id ? examToEdit.grade_id.toString() : "",
          academic_year_id: examToEdit.academic_year_id ? examToEdit.academic_year_id.toString() : "",
          start_date: examToEdit.start_date || "",
          end_date: examToEdit.end_date || "",
          note: examToEdit.note || "",
          subjects: examToEdit.subjects ? examToEdit.subjects.map(s => ({
            subject_id: s.subject_id,
            max_marks: s.max_marks,
            passing_marks: s.passing_marks,
            has_theory: s.has_theory === 1 || s.has_theory === true,
            has_lab: s.has_lab === 1 || s.has_lab === true,
            has_oral: s.has_oral === 1 || s.has_oral === true,
            theory_max_marks: s.theory_max_marks || 0,
            lab_max_marks: s.lab_max_marks || 0,
            oral_max_marks: s.oral_max_marks || 0
          })) : []
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
            initialMap[s.subject_id] = {
              checked: true,
              max_marks: s.max_marks,
              passing_marks: s.passing_marks,
              has_theory: s.has_theory === 1 || s.has_theory === true,
              has_lab: s.has_lab === 1 || s.has_lab === true,
              has_oral: s.has_oral === 1 || s.has_oral === true,
              theory_max_marks: s.theory_max_marks || 0,
              lab_max_marks: s.lab_max_marks || 0,
              oral_max_marks: s.oral_max_marks || 0
            };
          });
        }
        setSelectedSubjectsMap(initialMap);
      } else {
        form.reset({
          name: "",
          exam_type: "UNIT_TEST_1",
          custom_exam_name: "",
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
        const years = res.data.academic_years || res.data.years || res.data.academicYears || [];
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

  useEffect(() => {
    if (form.formState.errors && Object.keys(form.formState.errors).length > 0) {
      console.error("CreateExamDialog validation errors:", form.formState.errors);
      // Construct a helpful message listing the error fields
      const errorFields = Object.keys(form.formState.errors).map(key => {
        if (key === 'subjects') return 'At least one subject is required';
        return `${key}: ${form.formState.errors[key]?.message || 'Invalid value'}`;
      }).join(', ');
      toast.error(`Validation failed: ${errorFields}`);
    }
  }, [form.formState.errors]);

  const isNonAcademic = (subject) => {
    const type = subject.subject_type?.toLowerCase() || '';
    return type === 'co-scholastic' || type === 'skill-based';
  };

  const handleSubjectToggle = (subject, checked) => {
    const updatedMap = { ...selectedSubjectsMap };
    if (checked) {
      if (isNonAcademic(subject)) {
        updatedMap[subject.id] = {
          checked: true,
          max_marks: 0,
          passing_marks: 0,
          has_theory: false,
          has_lab: false,
          has_oral: false,
          theory_max_marks: 0,
          lab_max_marks: 0,
          oral_max_marks: 0
        };
      } else {
        updatedMap[subject.id] = {
          checked: true,
          max_marks: 100,
          passing_marks: 35,
          has_theory: true,
          has_lab: false,
          has_oral: false,
          theory_max_marks: 100,
          lab_max_marks: 0,
          oral_max_marks: 0
        };
      }
    } else {
      delete updatedMap[subject.id];
    }
    setSelectedSubjectsMap(updatedMap);
    syncFormSubjects(updatedMap);
  };

  const handleMarksChange = (subjectId, field, value) => {
    const updatedMap = { ...selectedSubjectsMap };
    if (updatedMap[subjectId]) {
      updatedMap[subjectId] = {
        ...updatedMap[subjectId],
        [field]: value
      };

      // Recompute total max_marks based on enabled components
      const thMax = updatedMap[subjectId].has_theory ? (parseInt(updatedMap[subjectId].theory_max_marks) || 0) : 0;
      const lbMax = updatedMap[subjectId].has_lab ? (parseInt(updatedMap[subjectId].lab_max_marks) || 0) : 0;
      const orMax = updatedMap[subjectId].has_oral ? (parseInt(updatedMap[subjectId].oral_max_marks) || 0) : 0;

      updatedMap[subjectId].max_marks = thMax + lbMax + orMax;

      setSelectedSubjectsMap(updatedMap);
      syncFormSubjects(updatedMap);
    }
  };

  const syncFormSubjects = (map) => {
    const subjectsArray = Object.keys(map).map(id => ({
      subject_id: parseInt(id),
      max_marks: map[id].max_marks,
      passing_marks: map[id].passing_marks,
      has_theory: !!map[id].has_theory,
      has_lab: !!map[id].has_lab,
      has_oral: !!map[id].has_oral,
      theory_max_marks: map[id].has_theory ? parseInt(map[id].theory_max_marks) || 0 : 0,
      lab_max_marks: map[id].has_lab ? parseInt(map[id].lab_max_marks) || 0 : 0,
      oral_max_marks: map[id].has_oral ? parseInt(map[id].oral_max_marks) || 0 : 0
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

    // Note: Non-academic subjects are no longer auto-appended, they are selected explicitly by the user

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
      <DialogContent className="sm:max-w-[780px] rounded-3xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{examToEdit ? "Edit Exam" : "Create New Exam"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <ScrollArea className="max-h-[calc(100vh-200px)] pr-4">
            <form onSubmit={form.handleSubmit(submit)} className="space-y-4 pt-4 px-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="exam_type"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam Type *</FormLabel>
                      <FormControl>
                        {field.value === 'OTHER' ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter custom exam name"
                              value={form.watch('custom_exam_name')}
                              onChange={(e) => form.setValue('custom_exam_name', e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                form.setValue('exam_type', 'UNIT_TEST_1');
                                form.setValue('custom_exam_name', '');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Exam Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UNIT_TEST_1">Unit Test 1</SelectItem>
                              <SelectItem value="UNIT_TEST_2">Unit Test 2</SelectItem>
                              <SelectItem value="TERM_1">Term 1</SelectItem>
                              <SelectItem value="TERM_2">Term 2</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam Name (Title) *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Unit Test 1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* <div className="grid grid-cols-1 gap-4"> */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      return !isNonAcademic(s) && !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
                    }).map(subject => {
                      const isChecked = !!selectedSubjectsMap[subject.id];
                      return (
                        <div key={subject.id} className="flex flex-col md:flex-row items-start md:items-center justify-between border p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`subject-${subject.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleSubjectToggle(subject, checked)}
                            />
                            <label htmlFor={`subject-${subject.id}`} className="font-medium cursor-pointer text-slate-900 dark:text-slate-100">
                              {subject.name}
                            </label>
                          </div>

                          {isChecked && (
                            <div className="flex flex-col gap-3 mt-3 w-full border-t pt-3 ml-6 md:ml-3">
                              <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 p-2.5 rounded-lg border">
                                  <Checkbox
                                    id={`theory-${subject.id}`}
                                    checked={!!selectedSubjectsMap[subject.id].has_theory}
                                    onCheckedChange={(checked) => handleMarksChange(subject.id, 'has_theory', !!checked)}
                                  />
                                  <label htmlFor={`theory-${subject.id}`} className="text-xs font-semibold mr-2 cursor-pointer">Theory</label>
                                  {selectedSubjectsMap[subject.id].has_theory && (
                                    <Input
                                      type="number"
                                      className="w-16 h-7 text-xs px-2 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                      placeholder="Max"
                                      value={selectedSubjectsMap[subject.id].theory_max_marks || ''}
                                      onChange={(e) => handleMarksChange(subject.id, 'theory_max_marks', parseInt(e.target.value) || 0)}
                                      min="0"
                                    />
                                  )}
                                </div>

                                <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 p-2.5 rounded-lg border">
                                  <Checkbox
                                    id={`lab-${subject.id}`}
                                    checked={!!selectedSubjectsMap[subject.id].has_lab}
                                    onCheckedChange={(checked) => handleMarksChange(subject.id, 'has_lab', !!checked)}
                                  />
                                  <label htmlFor={`lab-${subject.id}`} className="text-xs font-semibold mr-2 cursor-pointer">Lab/Practical</label>
                                  {selectedSubjectsMap[subject.id].has_lab && (
                                    <Input
                                      type="number"
                                      className="w-16 h-7 text-xs px-2 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                      placeholder="Max"
                                      value={selectedSubjectsMap[subject.id].lab_max_marks || ''}
                                      onChange={(e) => handleMarksChange(subject.id, 'lab_max_marks', parseInt(e.target.value) || 0)}
                                      min="0"
                                    />
                                  )}
                                </div>

                                <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 p-2.5 rounded-lg border">
                                  <Checkbox
                                    id={`oral-${subject.id}`}
                                    checked={!!selectedSubjectsMap[subject.id].has_oral}
                                    onCheckedChange={(checked) => handleMarksChange(subject.id, 'has_oral', !!checked)}
                                  />
                                  <label htmlFor={`oral-${subject.id}`} className="text-xs font-semibold mr-2 cursor-pointer">Oral</label>
                                  {selectedSubjectsMap[subject.id].has_oral && (
                                    <Input
                                      type="number"
                                      className="w-16 h-7 text-xs px-2 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                      placeholder="Max"
                                      value={selectedSubjectsMap[subject.id].oral_max_marks || ''}
                                      onChange={(e) => handleMarksChange(subject.id, 'oral_max_marks', parseInt(e.target.value) || 0)}
                                      min="0"
                                    />
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-4">
                                <div>
                                  <label className="text-xs text-gray-500 block font-semibold">Total Max Marks</label>
                                  <Input
                                    type="number"
                                    className="w-24 h-8 bg-slate-100 dark:bg-slate-800 font-semibold cursor-not-allowed"
                                    value={selectedSubjectsMap[subject.id].max_marks}
                                    readOnly
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 block font-semibold">Passing Marks</label>
                                  <Input
                                    type="number"
                                    className="w-24 h-8"
                                    value={selectedSubjectsMap[subject.id].passing_marks || ''}
                                    onChange={(e) => handleMarksChange(subject.id, 'passing_marks', parseInt(e.target.value) || 0)}
                                    min="1"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {filteredSubjects.filter(s => isNonAcademic(s)).length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <FormLabel className="text-lg font-semibold mb-2 block">Select Co-Scholastic / Skill-Based Subjects</FormLabel>
                  <div className="space-y-4">
                    {filteredSubjects.filter(s => isNonAcademic(s)).map(subject => {
                      const isChecked = !!selectedSubjectsMap[subject.id];
                      return (
                        <div key={subject.id} className="flex flex-col md:flex-row items-start md:items-center justify-between border p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`subject-${subject.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleSubjectToggle(subject, checked)}
                            />
                            <label htmlFor={`subject-${subject.id}`} className="font-medium cursor-pointer text-slate-900 dark:text-slate-100">
                              {subject.name} <span className="text-xs text-muted-foreground ml-2 uppercase tracking-wider">({subject.subject_type})</span>
                            </label>
                          </div>
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