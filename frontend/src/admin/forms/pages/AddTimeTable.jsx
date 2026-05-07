import React, { useState, useEffect, useMemo } from 'react';
import API from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Plus, Edit, Trash2, Calendar as CalendarIcon, List } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Combobox } from "@/components/ui/combobox-custom";
import { ComboboxFormField } from "@/widgets/comboboxFormField";
import '@schedule-x/theme-default/dist/index.css';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { formatDateTimeTo12Hour } from '@/helper/dateconversion';
import WeeklyTimetable from '@/widgets/WeeklyTimetable';
import { Badge } from '@/components/ui/badge';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const BREAK = ['LUNCH', 'SHORT_BREAK', 'LONG_BREAK'];
const BREAK_LABELS = { LUNCH: 'Lunch', SHORT_BREAK: 'Short Break', LONG_BREAK: 'Long Break' };
const DAY_LABELS = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday'
};


const routineSchema = z.object({
  class_id: z.coerce.number().min(1, 'Class is required'),
  subject_id: z.coerce.number().min(1, 'Subject is required'),
  teacher_id: z.coerce.number().optional(),
  days: z.array(z.string()).min(1, 'Select at least one day'),
  start_time: z.string().transform((value, ctx) => {
    // Convert to SQL format before sending to backend
    // ISO format from frontend -> SQL format for backend
    // Strip milliseconds if they exist to pass backend regex
    return value.split('.')[0].replace('T', ' ').replace('Z', '');
    return value;
  }),
  end_time: z.string().transform((value, ctx) => {
    if (value.includes('T')) {
      return value.split('.')[0].replace('T', ' ').replace('Z', '');
    }
    return value;
  }),
  room: z.string().optional(),
  // period: z.string().min(1, "Period is required"),
  // period: z.number().optional(),
  period: z.coerce.string().optional(),
  is_active: z.boolean().optional()
});

const breaksSchema = z.object({
  class_id: z.coerce.number().min(1, 'Class is required'),
  days: z.array(z.string()).min(1, 'Select at least one day'),
  break_type: z.string().min(1, 'Break type is required'),
  start_time: z.string().transform((value, ctx) => {
    // Convert to SQL format before sending to backend
    if (value.includes('T')) {
      // ISO format from frontend -> SQL format for backend
      return value.split('.')[0].replace('T', ' ').replace('Z', '');
    }
    return value;
  }),
  end_time: z.string().transform((value, ctx) => {
    if (value.includes('T')) {
      return value.split('.')[0].replace('T', ' ').replace('Z', '');
    }
    return value;
  })
});

export default function CreateTimeTable() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [editingBreak, setEditingBreak] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'calendar' or 'list' - default to list for now
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(routineSchema),
    defaultValues: {
      // class_id: 0,
      // subject_id: 0,
      // teacher_id: 0,
      class_id: undefined,
      subject_id: undefined,
      teacher_id: undefined,
      days: [],
      start_time: '',
      end_time: '',
      room: '',
      period: '',
      is_active: true
    }
  });

  const breakform = useForm({
    resolver: zodResolver(breaksSchema),
    defaultValues: {
      class_id: undefined,
      days: [],
      break_type: '',
      start_time: '',
      end_time: '',
    }
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchRoutines(selectedClass);

      // Find grade_id of the selected class to filter subjects
      const cls = classes.find(c => c.id === selectedClass);
      if (cls && cls.grade_id) {
        fetchGradeSubjects(cls.grade_id);
      } else {
        setFilteredSubjects([]);
      }
    }
  }, [selectedClass, classes]);

  const fetchGradeSubjects = async (gradeId) => {
    try {
      const res = await API.get(`/admin/get/grade/${gradeId}/subjects`);
      setFilteredSubjects(res.data.subjects || []);
    } catch (err) {
      console.error("Error fetching grade subjects:", err);
      // Fallback to all subjects if filtered fetch fails? 
      // User requested grade-based, so maybe empty is better to signal no subjects assigned.
    }
  };

  const fetchInitialData = async () => {
    try {
      const [classesRes, subjectsRes, teachersRes] = await Promise.all([
        API.get('/admin/get/classes'),
        API.get('/admin/get/subjects'),
        API.get('/teachers/get/teacher')
      ]);

      setClasses(classesRes.data.classes || []);
      setSubjects(subjectsRes.data.subjects || []);
      setTeachers(teachersRes.data.teachers || []);
      console.log(teachersRes.data.teachers);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load data');
    }
  };

  const fetchRoutines = async (classId) => {
    setLoading(true);
    try {
      const res = await API.get(
        `/classroutine/get/classes/${classId}/routines`
      );
      setRoutines(res.data.routines || []);
    } catch (error) {
      console.error("Error fetching routines:", error);
      toast.error("Failed to load routines");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoutine = () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }
    setEditingRoutine(null);
    form.reset({
      class_id: selectedClass,
      subject_id: undefined,
      teacher_id: undefined,
      days: [],
      start_time: '',
      end_time: '',
      room: '',
      period: '',
      is_active: true
    });
    setDialogOpen(true);
  };

  const handleEditRoutine = (routine) => {
    setEditingRoutine(routine);
    form.reset({
      class_id: routine.class_id,
      subject_id: routine.subject_id || undefined,
      teacher_id: routine.teacher_id || undefined,
      days: [routine.day_of_week],
      start_time: routine.start_time, // Already in datetime format
      end_time: routine.end_time,
      room: routine.room || '',
      period: routine.period || '',
      is_active: routine.is_active === 1
    });
    setDialogOpen(true);
  };

  const handleAddBreaks = () => {
    if (!selectedClass) {
      toast.error('Please select a class first');
      return;
    }
    setEditingBreak(null);
    breakform.reset({
      class_id: selectedClass,
      days: [],
      break_type: '',
      start_time: '',
      end_time: '',
    });
    setBreakDialogOpen(true);
  };

  const handleEditBreak = (breaks) => {
    setEditingBreak(breaks);
    breakform.reset({
      class_id: breaks.class_id,
      days: [breaks.day_of_week],
      break_type: breaks.break_type,
      start_time: breaks.start_time, // Already in datetime format
      end_time: breaks.end_time,
    });
    setBreakDialogOpen(true);
  };

  const handleDeleteRoutine = async (routineId) => {
    if (!confirm('Are you sure you want to delete this routine?')) return;

    try {
      await API.delete(`/classroutine/delete/routine/${routineId}`);
      toast.success('Routine deleted successfully');
      fetchRoutines(selectedClass);
    } catch (error) {
      console.error('Error deleting routine:', error);
      toast.error('Failed to delete routine');
    }
  };


  const handleDeleteBreak = async (breakId) => {
    if (!confirm('Are you sure you want to delete this break?')) return;

    try {
      await API.delete(`/classroutine/delete/class-breaks/${breakId}`);
      toast.success('break deleted successfully');
      fetchRoutines(selectedClass);
    } catch (error) {
      console.error('Error deleting break:', error);
      toast.error('Failed to delete break');
    }
  };

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      const { days, ...rest } = values;
      if (editingRoutine) {
        await API.put(`/classroutine/update/routine/${editingRoutine.id}`, { ...rest, day_of_week: days[0] });
        toast.success('Routine updated successfully');
      } else {
        const promises = days.map(day =>
          API.post('/classroutine/add/routine', { ...rest, day_of_week: day })
        );
        await Promise.all(promises);
        toast.success(`Routine added for ${days.length} days successfully`);
      }
      setDialogOpen(false);
      fetchRoutines(selectedClass);
    } catch (error) {
      console.error('Error saving routine:', error);
      toast.error(error.response?.data?.error || 'Failed to save routine');
    } finally {
      setIsSubmitting(false);
    }
  };


  const onSubmitBreak = async (values) => {
    setIsSubmitting(true);
    try {
      const { days, ...rest } = values;
      if (editingBreak) {
        await API.put(`/classroutine/update/class-breaks/${editingBreak.id}`, { ...rest, day_of_week: days[0] });
        toast.success('Breaks updated successfully');
      } else {
        const promises = days.map(day =>
          API.post('/classroutine/add/class-breaks', { ...rest, day_of_week: day })
        );
        await Promise.all(promises);
        toast.success(`Breaks added for ${days.length} days successfully`);
      }
      setBreakDialogOpen(false);
      fetchRoutines(selectedClass);
    } catch (error) {
      console.error('Error saving break:', error);
      toast.error(error.response?.data?.error || 'Failed to save break');
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedRoutines = routines.reduce((acc, routine) => {
    if (!acc[routine.day_of_week]) {
      acc[routine.day_of_week] = [];
    }
    acc[routine.day_of_week].push(routine);
    return acc;
  }, {});

  // useEffect(() => {
  //   form.setValue("subject_id", 0);

  // }, [selectedClass]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Class Timetable Management</h1>
          <p className="text-muted-foreground">Manage class schedules and routines</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4 mr-2" />
            List
          </Button>
        </div>
      </div>

      {/* Class Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>Choose a class to view and manage its timetable</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="w-full sm:flex-1">
              <Combobox
                options={classes.map(cls => ({
                  value: cls.id,
                  label: `${cls.name} - Grade ${cls.grade_name}`
                }))}
                value={selectedClass}
                onValueChange={(value) => setSelectedClass(Number(value))}
                placeholder="Select a class..."
                searchPlaceholder="Search class..."
                emptyMessage="No class found."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button onClick={handleAddRoutine} disabled={!selectedClass} className="flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                Add Routine
              </Button>
              <Button onClick={handleAddBreaks} disabled={!selectedClass} className="flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                Add Break
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar or List View */}
      {selectedClass && (
        <>
          {viewMode === 'calendar' ? (
            <Card>
              <CardHeader>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>Visual representation of the class timetable</CardDescription>
              </CardHeader>
              <CardContent>
                {/* <div>
                  <ScheduleXCalendar calendarApp={calendar} />
                </div> */}

                <div className="print-area">
                  <WeeklyTimetable routines={routines} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DAYS.map((day) => (
                <Card key={day}>
                  <CardHeader>
                    <CardTitle className="text-lg">{DAY_LABELS[day]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {groupedRoutines[day]?.length > 0 ? (
                      <div className="space-y-2 h-80 overflow-auto">
                        {groupedRoutines[day]
                          .sort((a, b) => {
                            // Sort by period first, then time
                            const aPeriod = a.period ? parseInt(a.period) : 999;
                            const bPeriod = b.period ? parseInt(b.period) : 999;
                            return aPeriod - bPeriod || a.start_time.localeCompare(b.start_time);
                          })
                          .map((routine) => (
                            <div
                              key={routine.id}
                              className="p-3 border rounded-lg hover:bg-accent transition-colors"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  {/* <div className="font-medium">{routine.subject_name}</div> */}
                                  <div className="font-medium">{routine.type === "BREAK" ? 'Lunch Break' : routine.subject_name}</div>
                                  {routine.period && (
                                    <Badge variant="outline" className="ml-2">
                                      Period {routine.period}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => routine.type === "BREAK" ? handleEditBreak(routine) : handleEditRoutine(routine)}
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => routine.type === "BREAK" ? handleDeleteBreak(routine.id) : handleDeleteRoutine(routine.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>
                                  {formatDateTimeTo12Hour(routine.start_time)} - {formatDateTimeTo12Hour(routine.end_time)}
                                </div>
                                {routine.room && <div>Room: {routine.room}</div>}
                                {routine.teacher_name && <div>Teacher: {routine.teacher_name}</div>}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No classes scheduled
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            /* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
  {DAYS.map((day) => (
    <Card key={day}>
      <CardHeader>
        <CardTitle className="text-lg">{DAY_LABELS[day]}</CardTitle>
      </CardHeader>
      <CardContent>
        {groupedRoutines[day]?.length > 0 ? (
          <div className="space-y-2 grid grid-cols-2 space-x-2">
            {groupedRoutines[day]
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((routine) => (
                <div
                  key={routine.id}
                  className="p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{routine.subject_name}</div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditRoutine(routine)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRoutine(routine.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      {/* {routine.start_time.substring(0, 5)} - {routine.end_time.substring(0, 5)} 

                      {formatDateTimeTo12Hour(routine.start_time)} - {formatDateTimeTo12Hour(routine.end_time)}

                    </div>
                    {routine.room && <div>Room: {routine.room}</div>}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-4">
            No classes scheduled
          </div>
        )}
      </CardContent>
    </Card>
  ))}
</div> */
          )}
        </>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg sm:max-w-[600px] overflow-hidden p-4 sm:p-6"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {editingRoutine ? 'Edit Routine' : 'Add New Routine'}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-2 py-2">
            <Form {...form}>
              <form id="routine-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="subject_id"
                    render={({ field }) => (
                      <ComboboxFormField
                        field={field}
                        label="Subject"
                        required
                        items={filteredSubjects}
                        valueKey="id"
                        labelKey="name"
                        searchKey="name"
                        placeholder="Select subject"
                        searchPlaceholder="Search subject..."
                        emptyMessage={filteredSubjects.length > 0 ? "No subject found." : "No subjects assigned to this grade"}
                      />
                    )}
                  />


                  <FormField
                    control={form.control}
                    name="teacher_id"
                    render={({ field }) => {
                      const selectedSubjectId = form.watch("subject_id");
                      const availableTeachers = selectedSubjectId
                        ? teachers.filter(t => {
                          if (!t.subjects || !Array.isArray(t.subjects)) return false;
                          return t.subjects.some(s => s.subject_id == selectedSubjectId || s.id == selectedSubjectId);
                        })
                        : [];

                      return (
                        <ComboboxFormField
                          field={field}
                          label="Teacher"
                          items={availableTeachers}
                          valueKey="teacher_id"
                          labelKey="user_name"
                          searchKey="user_name"
                          className={!selectedSubjectId ? "opacity-50 pointer-events-none" : ""}
                          placeholder={selectedSubjectId ? "Select teacher" : "Select subject first"}
                          searchPlaceholder="Search teacher..."
                          emptyMessage={selectedSubjectId ? "No teacher found for this subject." : "Select subject first"}
                        />
                      )
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="days"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Days *</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 p-3 border rounded-md">
                          {DAYS.map((day) => (
                            <div key={day} className="flex items-center space-x-2">
                              <Checkbox
                                id={`day-${day}`}
                                checked={field.value?.includes(day)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  const updated = checked
                                    ? [...current, day]
                                    : current.filter((val) => val !== day);
                                  field.onChange(updated);
                                }}
                              />
                              <Label
                                htmlFor={`day-${day}`}
                                className="text-xs font-normal cursor-pointer"
                              >
                                {day}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            step="60"
                            className="[&::-webkit-calendar-picker-indicator]:opacity-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            step="60"
                            className="[&::-webkit-calendar-picker-indicator]:opacity-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  /> */}

                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <DateTimePicker
                            value={field.value}
                            onChange={field.onChange}
                            label='Start Date & Time'
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <DateTimePicker
                            value={field.value}
                            onChange={field.onChange}
                            label='End Date & Time'
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Period</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="e.g., 1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="room"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Room 101" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>
              </form>
            </Form>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="routine-form" disabled={isSubmitting}>
              {editingRoutine ? 'Update' : 'Add'} Routine
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog for Break */}
      <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg sm:max-w-[500px] overflow-hidden p-4 sm:p-6"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {editingBreak ? 'Edit Break' : 'Add New Break'}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto px-2 py-2">
            <Form {...breakform}>
              <form id="break-form" onSubmit={breakform.handleSubmit(onSubmitBreak)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={breakform.control}
                    name="days"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                        <FormLabel>Days *</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 border rounded-md">
                          {DAYS.map((day) => (
                            <div key={day} className="flex items-center space-x-2">
                              <Checkbox
                                id={`break-day-${day}`}
                                checked={field.value?.includes(day)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  const updated = checked
                                    ? [...current, day]
                                    : current.filter((val) => val !== day);
                                  field.onChange(updated);
                                }}
                              />
                              <Label
                                htmlFor={`break-day-${day}`}
                                className="text-xs font-normal cursor-pointer"
                              >
                                {day}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={breakform.control}
                    name="break_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Break Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Break Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BREAK.map((breaks) => (
                              <SelectItem key={breaks} value={breaks}>
                                {BREAK_LABELS[breaks]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            step="60"
                            className="[&::-webkit-calendar-picker-indicator]:opacity-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time *</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            step="60"
                            className="[&::-webkit-calendar-picker-indicator]:opacity-100"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  /> */}

                  <FormField
                    control={breakform.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <DateTimePicker
                            value={field.value}
                            onChange={field.onChange}
                            label='Start Date & Time'
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={breakform.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <DateTimePicker
                            value={field.value}
                            onChange={field.onChange}
                            label='End Date & Time'
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setBreakDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="break-form" disabled={isSubmitting}>
              {editingBreak ? 'Update' : 'Add'} Break
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}