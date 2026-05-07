import React, { useEffect, useState } from "react";
import API from "@/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Trash2, Library, GraduationCap } from "lucide-react";
import { ComboboxFormField } from "@/widgets/comboboxFormField";

// Schema for validation
const formSchema = z.object({
  teacher_id: z.coerce.string().min(1, "Teacher is required"),
  subject_ids: z.array(z.number()).min(1, "Select at least one subject"),
});

export default function AssignSubjectOperation() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [searchSubject, setSearchSubject] = useState("");
  const [loadingAssigned, setLoadingAssigned] = useState(false);

  // Initialize form
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teacher_id: "",
      subject_ids: [],
    },
  });

  const selectedTeacherId = form.watch("teacher_id");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedTeacherId) {
      fetchAssignedSubjects(selectedTeacherId);
    } else {
      setAssignedSubjects([]);
    }
  }, [selectedTeacherId]);

  const fetchData = async () => {
    try {
      setFetching(true);
      const [teachersRes, subjectsRes] = await Promise.all([
        API.get("/teachers/get/teacher"),
        API.get("/admin/get/subjects")
      ]);
      setTeachers(teachersRes.data.teachers || []);
      setSubjects(subjectsRes.data.subjects || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load teachers or subjects");
    } finally {
      setFetching(false);
    }
  };

  const fetchAssignedSubjects = async (teacherId) => {
    try {
      setLoadingAssigned(true);
      const res = await API.get(`/teachers/get/teacher/${teacherId}/subjects`);
      setAssignedSubjects(res.data.subjects || []);
    } catch (error) {
      console.error("Error fetching assigned subjects:", error);
      // toast.error("Failed to load assigned subjects");
    } finally {
      setLoadingAssigned(false);
    }
  };

  const onSubmit = async (values) => {
    try {
      setLoading(true);
      const payload = {
        subject_ids: values.subject_ids
      };

      const res = await API.post(
        `/teachers/add/teacher/${values.teacher_id}/subjects`,
        payload
      );

      if (res.data.success) {
        toast.success(`Allocated ${res.data.newly_assigned_count || 'new'} subjects to the teacher.`);
        form.setValue("subject_ids", []); // Clear selection
        fetchAssignedSubjects(values.teacher_id); // Refresh list
      }
    } catch (error) {
      console.error("Assignment error:", error);
      toast.error(error.response?.data?.error || "Failed to assign subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSubject = async (subjectId) => {
    if (!selectedTeacherId) return;

    // Optimistic update
    const prevSubjects = [...assignedSubjects];
    setAssignedSubjects(prevSubjects.filter(s => s.id !== subjectId));

    try {
      const res = await API.delete(`/teachers/delete/teacher/${selectedTeacherId}/subject/${subjectId}`);
      if (res.data.success) {
        toast.success("Subject removed from teacher");
      } else {
        // Revert if API failed
        setAssignedSubjects(prevSubjects);
        toast.error("Failed to remove subject");
      }
    } catch (error) {
      console.error("Remove subject error:", error);
      setAssignedSubjects(prevSubjects);
      toast.error("Failed to remove subject");
    }
  };

  // Filter available subjects for selection (exclude currently assigned ones if strict, but maybe user wants to see all?)
  // Let's exclude already assigned ones from the selection list to avoid confusion
  const assignedSubjectIds = new Set(assignedSubjects.map(s => s.id));

  const filteredSubjects = subjects.filter(sub =>
    !assignedSubjectIds.has(sub.id) &&
    (sub.name.toLowerCase().includes(searchSubject.toLowerCase()) ||
      sub.code?.toLowerCase().includes(searchSubject.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            Teacher Subject Assignment
          </CardTitle>
          <CardDescription>
            Map academic subjects to teachers and manage their teaching responsibilities.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading data...</p>
            </div>
          ) : (
            <>
              {/* ASSIGNMENT FORM */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  {/* Teacher Selection */}
                  <FormField
                    control={form.control}
                    name="teacher_id"
                    render={({ field }) => (
                      <ComboboxFormField
                        field={field}
                        label="Select Teacher"
                        required
                        items={teachers}
                        valueKey="teacher_id"
                        labelKey="user_name"
                        searchKey="user_name"
                        placeholder="Select a teacher..."
                        searchPlaceholder="Search teacher..."
                        emptyMessage="No teacher found."
                      />
                    )}
                  />

                  {/* Subject Selection Area - Only show if teacher selected */}
                  {selectedTeacherId && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <div className="border border-border rounded-xl p-4 bg-background/50">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                          <FormLabel className="text-base font-semibold">
                            Assign New Subjects
                          </FormLabel>
                          <div className="relative w-full md:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="search"
                              placeholder="Search subjects..."
                              className="pl-9 h-9"
                              value={searchSubject}
                              onChange={(e) => setSearchSubject(e.target.value)}
                            />
                          </div>
                        </div>

                        <FormField
                          control={form.control}
                          name="subject_ids"
                          render={() => (
                            <FormItem>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredSubjects.length > 0 ? (
                                  filteredSubjects.map((subject) => (
                                    <FormField
                                      key={subject.id}
                                      control={form.control}
                                      name="subject_ids"
                                      render={({ field }) => {
                                        return (
                                          <FormItem
                                            key={subject.id}
                                            className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-lg border border-muted hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer"
                                          >
                                            <FormControl>
                                              <Checkbox
                                                checked={field.value?.includes(subject.id)}
                                                onCheckedChange={(checked) => {
                                                  return checked
                                                    ? field.onChange([...field.value, subject.id])
                                                    : field.onChange(
                                                      field.value?.filter(
                                                        (value) => value !== subject.id
                                                      )
                                                    )
                                                }}
                                              />
                                            </FormControl>
                                            <div className="space-y-1 leading-none cursor-pointer flex-1">
                                              <FormLabel className="cursor-pointer font-medium">
                                                {subject.name}
                                              </FormLabel>
                                              {subject.code && (
                                                <div className="text-xs text-muted-foreground">
                                                  Code: {subject.code}
                                                </div>
                                              )}
                                            </div>
                                          </FormItem>
                                        )
                                      }}
                                    />
                                  ))
                                ) : (
                                  <div className="col-span-full py-8 flex flex-col items-center justify-center text-muted-foreground">
                                    <Library className="h-8 w-8 mb-2 opacity-20" />
                                    <p className="text-sm">No new subjects found to assign.</p>
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border/50">
                          <div className="text-xs text-muted-foreground">
                            {form.watch("subject_ids").length} subjects selected
                          </div>
                          <Button type="submit" size="sm" disabled={loading || form.watch("subject_ids").length === 0}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Assign Selected
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </Form>

              {/* CURRENTLY ASSIGNED LIST */}
              {selectedTeacherId && (
                <div className="space-y-4 pt-4 border-t border-border animate-in fade-in duration-500">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="bg-primary/10 p-1.5 rounded-md text-primary">
                      <Library className="h-5 w-5" />
                    </span>
                    Currently Assigned Subjects
                  </h3>

                  {loadingAssigned ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />)}
                    </div>
                  ) : assignedSubjects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {assignedSubjects.map((subject) => (
                        <div
                          key={subject.id}
                          className="group relative flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-all hover:border-primary/20"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{subject.name}</div>
                            {subject.code && (
                              <div className="text-xs text-muted-foreground truncate">{subject.code}</div>
                            )}
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveSubject(subject.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed border-muted">
                      <p className="text-muted-foreground">No subjects currently assigned to this teacher.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}