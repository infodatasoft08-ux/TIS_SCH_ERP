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

// Create a dynamic schema based on edit mode
const createGradeSchema = (isEditMode) => z.object({
  name: z.string().min(1, "Grade name required".trim()),
  description: z.string().optional(),
});

export default function AddGradesDialog({
  open,
  onOpenChange,
  gradeToEdit = null,
  onSuccess,
}) {
  const [croppedImage, setCroppedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!gradeToEdit;
  const gradeSchema = createGradeSchema(isEditMode);

  const form = useForm({
    resolver: zodResolver(gradeSchema),
    mode: "onChange", // Validate on change to see errors immediately
    defaultValues: { name: "", description: "" },
  });

  // Reset form when studentToEdit changes or dialog opens
  // Reset form when teacherToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      if (gradeToEdit) {
        console.log("Setting form values for edit:", gradeToEdit);

        form.reset({
          name: gradeToEdit?.name || "",
          description: gradeToEdit?.description || "",
        });
      } else {
        // Reset for new teacher
        form.reset({
          name: "",
          description: "",
        });
      }
    }
  }, [open, gradeToEdit, form]);

  async function onSubmit(values) {
    console.log("Form submitted with values:", values);
    setIsSubmitting(true);

    try {

      if (isEditMode) {
        await API.put(`admin/update/grades/${gradeToEdit.id}`, values);
        toast.success("Grade updated successfully");
      } else {
        await API.post("admin/add/grades", values);
        toast.success("Grade added successfully");
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error("Submission error:", err);
      const errorMsg = err.response?.data?.error || "Failed to save grade";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Add error logging
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      console.log("Form values changed:", value);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  useEffect(() => {
    console.log("Form errors:", form.formState.errors);
  }, [form.formState.errors]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="p-3 border-b">
          <DialogTitle>
            {isEditMode ? "Edit Grade" : "Add New Grade"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Debug: Show validation errors at top */}
              {Object.keys(form.formState.errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-red-600 font-semibold">Please fix the following errors:</p>
                  <ul className="text-red-500 text-sm mt-1">
                    {Object.entries(form.formState.errors).map(([key, error]) => (
                      <li key={key}>{error.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* First Row - Student Name, Email, Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter Class name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter Grade description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
            {isSubmitting ? "Saving..." : (isEditMode ? "Update Grade" : "Add Grade")}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}