// components/AddStudentDialog.jsx
import React, { useState, useEffect } from "react";
import API from "@/api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// import toast from "react-hot-toast";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Create a dynamic schema based on edit mode
const createClassSchema = (isEditMode) => z.object({
  grade_id: z.number().min(1, "Grade required"),
  name: z.string().min(1, "Class name required").trim(),
  // section: z.string().optional(),
  supervisor_teacher_id: z
    .number() // accept string from input/combobox
    .optional()
    .transform((val) => {
      if (!val || val === "" || val === "Select Teacher") return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    })
    .nullable(),
  room: z.string().optional().nullable(),
  capacity: z.coerce
    .number()
    .int()
    .optional()
    .nullable(),
});

export default function AddClassDialog({
  open,
  onOpenChange,
  classToEdit = null,
  onSuccess,
  grade = [],
  teacher = []
}) {
  const [croppedImage, setCroppedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!classToEdit;
  const classSchema = createClassSchema(isEditMode);

  const form = useForm({
    resolver: zodResolver(classSchema),
    mode: "onChange", // Validate on change to see errors immediately
    defaultValues: { grade_id: "", name: "", supervisor_teacher_id: "", room: "", capacity: null },
  });

  // Reset form when studentToEdit changes or dialog opens
  // Reset form when teacherToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      if (classToEdit) {
        console.log("Setting form values for edit:", classToEdit);

        form.reset({
          grade_id: classToEdit?.grade_id || "",
          name: classToEdit?.name || "",
          // section: classToEdit?.section || "",
          supervisor_teacher_id: classToEdit?.supervisor_teacher_id || "",
          room: classToEdit?.room || "",
          capacity: classToEdit?.capacity || null,
        });
      } else {
        // Reset for new teacher
        form.reset({
          grade_id: "",
          name: "",
          // section: "",
          supervisor_teacher_id: "",
          room: "",
          capacity: null
        });
      }
    }
  }, [open, classToEdit, form]);

  async function onSubmit(values) {
    console.log("Form submitted with values:", values);
    setIsSubmitting(true);

    try {

      if (isEditMode) {
        await API.put(`admin/update/classes/${classToEdit.id}`, values);
        toast.success("Class updated successfully");
      } else {
        await API.post("admin/add/classes", values);
        toast.success("Class added successfully");
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error("Submission error:", err);
      const errorMsg = err.response?.data?.error || "Failed to save class";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Add error logging
  //   useEffect(() => {
  //     const subscription = form.watch((value, { name, type }) => {
  //       console.log("Form values changed:", value);
  //     });
  //     return () => subscription.unsubscribe();
  //   }, [form.watch]);

  //   useEffect(() => {
  //     console.log("Form errors:", form.formState.errors);
  //   }, [form.formState.errors]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-3 border-b">
          <DialogTitle>
            {isEditMode ? "Edit Class" : "Add New Class"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Debug: Show validation errors at top */}
              {/* {Object.keys(form.formState.errors).length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                    <p className="text-red-600 font-semibold">Please fix the following errors:</p>
                    <ul className="text-red-500 text-sm mt-1">
                      {Object.entries(form.formState.errors).map(([key, error]) => (
                        <li key={key}>{error.message}</li>
                      ))}
                    </ul>
                  </div>
                )} */}

              {/* First Row - Student Name, Email, Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Class Name Field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Section Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter class section name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Section Grade Field */}
                <FormField
                  control={form.control}
                  name="grade_id"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false);
                    const selectedGrade = grade.find(
                      (grade) => grade.id === field.value
                    );

                    // console.log("mayank grade: ", grade);
                    // console.log("mayank selectedGrade: ", selectedGrade);

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Class</FormLabel>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-full justify-between"
                            >
                              <span className="truncate">
                                {selectedGrade?.name || "Select Class"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0 bg-white"
                            style={{
                              width: "var(--radix-popover-trigger-width)"
                            }}
                            align="start"
                          >
                            <Command>
                              <CommandInput
                                className={"focus:outline-none"}
                                placeholder="Search class..."
                              />
                              <CommandList>
                                <CommandEmpty>No class found.</CommandEmpty>
                                <CommandGroup>
                                  {grade.map((grade) => (
                                    <CommandItem
                                      key={grade.id}
                                      value={grade.id} // Changed from grade.name to grade._id
                                      onSelect={() => {
                                        field.onChange(grade.id);
                                        setOpen(false);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === grade.id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <span>{grade.name}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Room Field */}
                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter room number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Section Field */}
                {/* <FormField
                        control={form.control}
                        name="section"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Section</FormLabel>
                            <FormControl>
                            <Input {...field} placeholder="Enter section" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    /> */}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Section Teacher Field */}
                {/* <FormField
                        control={form.control}
                        name="supervisor_teacher_id"
                        render={({ field }) => {
                        const [open, setOpen] = useState(false);
                        const selectedTeacher = teacher.find(
                            (teacher) => teacher.teacher_id === field.value // Changed to teacher.id
                        );

                        return (
                            <FormItem className="flex flex-col">
                            <FormLabel>Class Teacher</FormLabel>
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-full justify-between"
                                >
                                    <span className="truncate">
                                    {selectedTeacher 
                                        ? `${selectedTeacher.user_name}${selectedTeacher.bio ? ` - ${selectedTeacher.bio}` : ''}`
                                        : `Select Teacher`
                                    }
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent 
                                className="w-[--radix-popover-trigger-width] p-0" 
                                style={{ width: "var(--radix-popover-trigger-width)" }}
                                align="start"
                                >
                                <Command>
                                    <CommandInput className={"focus:outline-none"} placeholder="Search teacher..." />
                                    <CommandList>
                                    <CommandEmpty>No teacher found.</CommandEmpty>
                                    <CommandGroup>
                                        {teacher.map((teacher) => (
                                        <CommandItem
                                            key={teacher.teacher_id} // Changed to teacher.id
                                            value={teacher.teacher_id || null} // Changed to teacher.id
                                            onSelect={() => {
                                            field.onChange(teacher.teacher_id || null); // Changed to teacher.id
                                            setOpen(false);
                                            }}
                                            className="cursor-pointer"
                                        >
                                            <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === teacher.teacher_id // Changed to teacher.id
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                            />
                                            <span>{teacher.user_name}{teacher.bio ? ` - ${teacher.bio}` : ''}</span>
                                        </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    </CommandList>
                                </Command>
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        );
                        }}
                    /> */}

                {/* Capacity Field */}
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter class room capacity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Section Teacher Field */}
                <FormField
                  control={form.control}
                  name="supervisor_teacher_id"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false);
                    const selectedTeacher = teacher.find(
                      (teacher) => teacher.teacher_id === field.value
                    );

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Class Teacher</FormLabel>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-full justify-between"
                            >
                              <span className="truncate">
                                {selectedTeacher
                                  ? `${selectedTeacher.user_name}${selectedTeacher.bio
                                    ? ` - ${selectedTeacher.bio}`
                                    : ""
                                  }`
                                  : `Select Teacher`}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0"
                            style={{
                              width: "var(--radix-popover-trigger-width)"
                            }}
                            align="start"
                          >
                            <Command>
                              <CommandInput
                                className={"focus:outline-none"}
                                placeholder="Search teacher..."
                              />
                              <CommandList>
                                <CommandEmpty>No teacher found.</CommandEmpty>
                                <CommandGroup>
                                  {/* Add "None" option first */}
                                  <CommandItem
                                    key="none"
                                    value=""
                                    onSelect={() => {
                                      field.onChange(null);
                                      setOpen(false);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === null ||
                                          field.value === ""
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <span className="text-muted-foreground">
                                      None (Remove teacher)
                                    </span>
                                  </CommandItem>

                                  {/* Teachers list */}
                                  {teacher.map((teacher) => (
                                    <CommandItem
                                      key={teacher.teacher_id}
                                      value={teacher.teacher_id || null}
                                      onSelect={() => {
                                        field.onChange(
                                          teacher.teacher_id || null
                                        );
                                        setOpen(false);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === teacher.teacher_id
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      <span>
                                        {teacher.user_name}
                                        {teacher.bio ? ` - ${teacher.bio}` : ""}
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              <div className="pb-4"></div>
            </form>
          </Form>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={form.handleSubmit(onSubmit)}
          >
            {isSubmitting
              ? "Saving..."
              : isEditMode
                ? "Update Class"
                : "Add Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}