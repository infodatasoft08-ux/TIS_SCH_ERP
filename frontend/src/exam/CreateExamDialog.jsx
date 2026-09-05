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
import { MultiSelectCombobox } from "@/widgets/multiSelectCombobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/auth/AuthContext";
import { Badge } from "@/components/ui/badge";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  exam_type: z.string().min(1, "Exam type is required"),
  custom_exam_name: z.string().optional(),
  class_ids: z.array(z.coerce.string()).min(1, "At least one section is required"),
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
  const { user } = useAuth();
  const isTeacher = user?.role_id === 2;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedSubjectsMap, setSelectedSubjectsMap] = useState({});

  const isExamLocked = examToEdit && (examToEdit.status === 'Over' || examToEdit.status === 'Published');

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      exam_type: isTeacher ? "OTHER" : "UNIT_TEST_1",
      custom_exam_name: "",
      class_ids: [],
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
  const [prevGradeId, setPrevGradeId] = useState(null);

  useEffect(() => {
    if (selectedGradeId) {
      fetchGradeSubjects(selectedGradeId);
      if (prevGradeId && prevGradeId !== selectedGradeId) {
        form.setValue("class_ids", [], { shouldValidate: true });
        setSelectedSubjectsMap({});
        form.setValue("subjects", []);
      }
      setPrevGradeId(selectedGradeId);
    } else {
      setFilteredSubjects([]);
      form.setValue("class_ids", []);
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
      const isTrue = (val) => val === 1 || val === true || val === '1' || val === 'true' || (val && val.data && val.data[0] === 1) || (typeof Buffer !== 'undefined' && Buffer.isBuffer(val) && val[0] === 1);

      if (examToEdit) {
        form.reset({
          name: examToEdit.name || "",
          exam_type: examToEdit.exam_type || "OTHER",
          custom_exam_name: examToEdit.custom_exam_name || "",
          class_ids: examToEdit.section_ids && examToEdit.section_ids.length > 0
            ? examToEdit.section_ids.map(id => id.toString())
            : (examToEdit.class_id ? [examToEdit.class_id.toString()] : []),
          grade_id: examToEdit.grade_id ? examToEdit.grade_id.toString() : "",
          academic_year_id: examToEdit.academic_year_id ? examToEdit.academic_year_id.toString() : "",
          start_date: examToEdit.start_date || "",
          end_date: examToEdit.end_date || "",
          note: examToEdit.note || "",
          subjects: examToEdit.subjects ? examToEdit.subjects.map(s => ({
            subject_id: s.subject_id,
            max_marks: s.max_marks,
            passing_marks: s.passing_marks,
            has_theory: isTrue(s.has_theory),
            has_lab: isTrue(s.has_lab),
            has_oral: isTrue(s.has_oral),
            has_written: isTrue(s.has_written),
            has_reading: isTrue(s.has_reading),
            has_writing_comp: isTrue(s.has_writing_comp),
            has_dictation: isTrue(s.has_dictation),
            has_recitation: isTrue(s.has_recitation),
            has_ia_pr: isTrue(s.has_ia_pr),
            theory_max_marks: s.theory_max_marks || 0,
            lab_max_marks: s.lab_max_marks || 0,
            oral_max_marks: s.oral_max_marks || 0,
            written_max_marks: s.written_max_marks || 0,
            reading_max_marks: s.reading_max_marks || 0,
            writing_comp_max_marks: s.writing_comp_max_marks || 0,
            dictation_max_marks: s.dictation_max_marks || 0,
            recitation_max_marks: s.recitation_max_marks || 0,
            ia_pr_max_marks: s.ia_pr_max_marks || 0
          })) : []
        });

        if (examToEdit.class_id || (examToEdit.section_ids && examToEdit.section_ids.length > 0)) {
          // Find grade for this class
          const cIdToUse = examToEdit.class_id || examToEdit.section_ids[0];
          const c = classes.find(cls => cls.id === cIdToUse);
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
              has_theory: isTrue(s.has_theory),
              has_lab: isTrue(s.has_lab),
              has_oral: isTrue(s.has_oral),
              has_written: isTrue(s.has_written),
              has_reading: isTrue(s.has_reading),
              has_writing_comp: isTrue(s.has_writing_comp),
              has_dictation: isTrue(s.has_dictation),
              has_recitation: isTrue(s.has_recitation),
              has_ia_pr: isTrue(s.has_ia_pr),
              theory_max_marks: s.theory_max_marks || 0,
              lab_max_marks: s.lab_max_marks || 0,
              oral_max_marks: s.oral_max_marks || 0,
              written_max_marks: s.written_max_marks || 0,
              reading_max_marks: s.reading_max_marks || 0,
              writing_comp_max_marks: s.writing_comp_max_marks || 0,
              dictation_max_marks: s.dictation_max_marks || 0,
              recitation_max_marks: s.recitation_max_marks || 0,
              ia_pr_max_marks: s.ia_pr_max_marks || 0
            };
          });
        }
        setSelectedSubjectsMap(initialMap);
        setPrevGradeId(examToEdit.grade_id ? examToEdit.grade_id.toString() : null);
      } else {
        form.reset({
          name: "",
          exam_type: isTeacher ? "OTHER" : "UNIT_TEST_1",
          custom_exam_name: "",
          class_ids: [],
          grade_id: "",
          academic_year_id: "",
          start_date: "",
          end_date: "",
          note: "",
          subjects: []
        });
        setSelectedSubjectsMap({});
        setPrevGradeId(null);
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
          checked: true, max_marks: 0, passing_marks: 0,
          has_theory: false, has_lab: false, has_oral: false,
          has_written: false, has_reading: false, has_writing_comp: false,
          has_dictation: false, has_recitation: false, has_ia_pr: false,
          theory_max_marks: 0, lab_max_marks: 0, oral_max_marks: 0,
          written_max_marks: 0, reading_max_marks: 0, writing_comp_max_marks: 0,
          dictation_max_marks: 0, recitation_max_marks: 0, ia_pr_max_marks: 0
        };
      } else {
        updatedMap[subject.id] = {
          checked: true, max_marks: 100, passing_marks: 35,
          has_theory: true, has_lab: false, has_oral: false,
          has_written: false, has_reading: false, has_writing_comp: false,
          has_dictation: false, has_recitation: false, has_ia_pr: false,
          theory_max_marks: 100, lab_max_marks: 0, oral_max_marks: 0,
          written_max_marks: 0, reading_max_marks: 0, writing_comp_max_marks: 0,
          dictation_max_marks: 0, recitation_max_marks: 0, ia_pr_max_marks: 0
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
      updatedMap[subjectId] = { ...updatedMap[subjectId], [field]: value };

      // Recompute total max_marks from all enabled sub-fields
      const s = updatedMap[subjectId];
      const thMax = s.has_theory ? (parseInt(s.theory_max_marks) || 0) : 0;
      const lbMax = s.has_lab ? (parseInt(s.lab_max_marks) || 0) : 0;
      const orMax = s.has_oral ? (parseInt(s.oral_max_marks) || 0) : 0;
      const wrMax = s.has_written ? (parseInt(s.written_max_marks) || 0) : 0;
      const rdMax = s.has_reading ? (parseInt(s.reading_max_marks) || 0) : 0;
      const wcMax = s.has_writing_comp ? (parseInt(s.writing_comp_max_marks) || 0) : 0;
      const dcMax = s.has_dictation ? (parseInt(s.dictation_max_marks) || 0) : 0;
      const rcMax = s.has_recitation ? (parseInt(s.recitation_max_marks) || 0) : 0;
      const iaMax = s.has_ia_pr ? (parseInt(s.ia_pr_max_marks) || 0) : 0;

      updatedMap[subjectId].max_marks = thMax + lbMax + orMax + wrMax + rdMax + wcMax + dcMax + rcMax + iaMax;

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
      has_written: !!map[id].has_written,
      has_reading: !!map[id].has_reading,
      has_writing_comp: !!map[id].has_writing_comp,
      has_dictation: !!map[id].has_dictation,
      has_recitation: !!map[id].has_recitation,
      has_ia_pr: !!map[id].has_ia_pr,
      theory_max_marks: map[id].has_theory ? parseInt(map[id].theory_max_marks) || 0 : 0,
      lab_max_marks: map[id].has_lab ? parseInt(map[id].lab_max_marks) || 0 : 0,
      oral_max_marks: map[id].has_oral ? parseInt(map[id].oral_max_marks) || 0 : 0,
      written_max_marks: map[id].has_written ? parseInt(map[id].written_max_marks) || 0 : 0,
      reading_max_marks: map[id].has_reading ? parseInt(map[id].reading_max_marks) || 0 : 0,
      writing_comp_max_marks: map[id].has_writing_comp ? parseInt(map[id].writing_comp_max_marks) || 0 : 0,
      dictation_max_marks: map[id].has_dictation ? parseInt(map[id].dictation_max_marks) || 0 : 0,
      recitation_max_marks: map[id].has_recitation ? parseInt(map[id].recitation_max_marks) || 0 : 0,
      ia_pr_max_marks: map[id].has_ia_pr ? parseInt(map[id].ia_pr_max_marks) || 0 : 0,
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

    // Ensure subjects payload is generated directly from selectedSubjectsMap
    data.subjects = Object.keys(selectedSubjectsMap).map(id => {
      const mapItem = selectedSubjectsMap[id];
      return {
        subject_id: parseInt(id),
        max_marks: mapItem.max_marks,
        passing_marks: mapItem.passing_marks,
        has_theory: !!mapItem.has_theory,
        has_lab: !!mapItem.has_lab,
        has_oral: !!mapItem.has_oral,
        has_written: !!mapItem.has_written,
        has_reading: !!mapItem.has_reading,
        has_writing_comp: !!mapItem.has_writing_comp,
        has_dictation: !!mapItem.has_dictation,
        has_recitation: !!mapItem.has_recitation,
        has_ia_pr: !!mapItem.has_ia_pr,
        theory_max_marks: mapItem.has_theory ? (parseInt(mapItem.theory_max_marks) || 0) : 0,
        lab_max_marks: mapItem.has_lab ? (parseInt(mapItem.lab_max_marks) || 0) : 0,
        oral_max_marks: mapItem.has_oral ? (parseInt(mapItem.oral_max_marks) || 0) : 0,
        written_max_marks: mapItem.has_written ? (parseInt(mapItem.written_max_marks) || 0) : 0,
        reading_max_marks: mapItem.has_reading ? (parseInt(mapItem.reading_max_marks) || 0) : 0,
        writing_comp_max_marks: mapItem.has_writing_comp ? (parseInt(mapItem.writing_comp_max_marks) || 0) : 0,
        dictation_max_marks: mapItem.has_dictation ? (parseInt(mapItem.dictation_max_marks) || 0) : 0,
        recitation_max_marks: mapItem.has_recitation ? (parseInt(mapItem.recitation_max_marks) || 0) : 0,
        ia_pr_max_marks: mapItem.has_ia_pr ? (parseInt(mapItem.ia_pr_max_marks) || 0) : 0,
      };
    });

    if (isExamLocked && examToEdit) {
      data.name = examToEdit.name;
      data.exam_type = examToEdit.exam_type;
      if (examToEdit.custom_exam_name) data.custom_exam_name = examToEdit.custom_exam_name;
      data.grade_id = examToEdit.grade_id.toString();
      if (examToEdit.section_ids && examToEdit.section_ids.length > 0) {
        data.class_ids = examToEdit.section_ids.map(id => id.toString());
      } else if (examToEdit.class_id) {
        data.class_ids = [examToEdit.class_id.toString()];
      }
      data.note = examToEdit.note || "";
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  name="exam_type"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam Type *</FormLabel>
                      <FormControl>
                        {isTeacher ? (
                          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-md border border-indigo-200 dark:border-indigo-800 text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                            <span>Other / Custom Exam</span>
                            <Badge variant="outline" className="text-[10px] bg-indigo-100 dark:bg-indigo-900 border-indigo-300">Teacher Mode</Badge>
                          </div>
                        ) : field.value === 'OTHER' ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter custom exam tag"
                              value={form.watch('custom_exam_name')}
                              disabled={isExamLocked}
                              onChange={(e) => form.setValue('custom_exam_name', e.target.value)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isExamLocked}
                              onClick={() => {
                                form.setValue('exam_type', 'UNIT_TEST_1');
                                form.setValue('custom_exam_name', '');
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Select disabled={isExamLocked} onValueChange={field.onChange} value={field.value}>
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
                        <Input disabled={isExamLocked} {...field} placeholder="e.g. Unit Test 1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {/* <div className="grid grid-cols-1 gap-4"> */}
              {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              </div> */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  name="grade_id"
                  control={form.control}
                  render={({ field }) => (
                    <ComboboxFormField
                      field={field}
                      label="Grade"
                      required
                      disabled={isExamLocked}
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
                  name="class_ids"
                  control={form.control}
                  render={({ field, fieldState }) => {
                    const filteredSections = classes.filter(c => c.grade_id?.toString() === selectedGradeId);

                    if (!selectedGradeId) {
                      return (
                        <FormItem>
                          <FormLabel>Section(s) *</FormLabel>
                          <div className="flex flex-wrap gap-4 pl-2 pr-2 pt-2 border rounded-md min-h-[34px] bg-white dark:bg-slate-950">
                            <div className="text-sm text-gray-500 italic">Please select a Grade first</div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }

                    return (
                      <MultiSelectCombobox
                        field={field}
                        fieldState={fieldState}
                        label="Section(s)"
                        required
                        disabled={isExamLocked}
                        items={filteredSections}
                        valueKey="id"
                        labelKey="name"
                        searchKey="name"
                        placeholder="Select Sections"
                        searchPlaceholder="Search section..."
                        emptyMessage="No sections found for this grade."
                      />
                    );
                  }}
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
                        <Textarea disabled={isExamLocked} {...field} placeholder="Enter exam instructions..." rows={1} />
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
                              <div className="flex flex-wrap gap-2.5 w-full items-center">
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

                                {/* ---- New Sub-Fields ---- */}
                                {[
                                  { flag: 'has_ia_pr', maxKey: 'ia_pr_max_marks', label: 'I.A./PR' },
                                  { flag: 'has_written', maxKey: 'written_max_marks', label: 'Written' },
                                  { flag: 'has_reading', maxKey: 'reading_max_marks', label: 'Reading' },
                                  { flag: 'has_writing_comp', maxKey: 'writing_comp_max_marks', label: 'Writing (Comp.)' },
                                  { flag: 'has_dictation', maxKey: 'dictation_max_marks', label: 'Dictation' },
                                  { flag: 'has_recitation', maxKey: 'recitation_max_marks', label: 'Recitation' },
                                ].map(({ flag, maxKey, label }) => (
                                  <div key={flag} className="flex items-center space-x-1.5 bg-white dark:bg-slate-800 p-2.5 rounded-lg border">
                                    <Checkbox
                                      id={`${flag}-${subject.id}`}
                                      checked={!!selectedSubjectsMap[subject.id][flag]}
                                      onCheckedChange={(checked) => handleMarksChange(subject.id, flag, !!checked)}
                                    />
                                    <label htmlFor={`${flag}-${subject.id}`} className="text-xs font-semibold mr-2 cursor-pointer">{label}</label>
                                    {selectedSubjectsMap[subject.id][flag] && (
                                      <Input
                                        type="number"
                                        className="w-16 h-7 text-xs px-2 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center focus:outline-none focus:ring-1 focus:ring-primary"
                                        placeholder="Max"
                                        value={selectedSubjectsMap[subject.id][maxKey] || ''}
                                        onChange={(e) => handleMarksChange(subject.id, maxKey, parseInt(e.target.value) || 0)}
                                        min="0"
                                      />
                                    )}
                                  </div>
                                ))}
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