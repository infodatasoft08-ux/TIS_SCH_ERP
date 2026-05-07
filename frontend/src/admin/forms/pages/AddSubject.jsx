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
import { toast } from "sonner";
import ImageCropUpload from "@/widgets/ImageCropUpload";

// Create a dynamic schema based on edit mode
const createSubjectSchema = (isEditMode) => z.object({
  code: z.string().min(1, "Code required").trim(),
  name: z.string().min(1, "Name required").trim(),
  description: z.string().optional(),
});

export default function AddSubjectDialog({
  open,
  onOpenChange,
  subjectToEdit = null,
  onSuccess,
}) {
  const [croppedImage, setCroppedImage] = useState(null);
  const [isImageCleared, setIsImageCleared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!subjectToEdit;
  const subjectSchema = createSubjectSchema(isEditMode);

  const form = useForm({
    resolver: zodResolver(subjectSchema),
    mode: "onChange", // Validate on change to see errors immediately
    defaultValues: { code: "", name: "", description: "" },
  });

  // Reset form when studentToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      setCroppedImage(null);
      setIsImageCleared(false);
      if (subjectToEdit) {
        console.log("Setting form values for edit:", subjectToEdit);

        form.reset({
          code: subjectToEdit?.code || "",
          name: subjectToEdit?.name || "",
          description: subjectToEdit?.description || "",
        });
      } else {
        // Reset for new subject
        form.reset({
          code: "",
          name: "",
          description: "",
        });
      }
    }
  }, [open, subjectToEdit, form]);

  async function onSubmit(values) {
    console.log("Form submitted with values:", values);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          formData.append(key, value);
        }
      });

      if (croppedImage) {
        formData.append("image", croppedImage);
      } else if (isEditMode && isImageCleared) {
        formData.append("clear_image", "true");
        formData.append("image_url", "");
      }

      console.log("Submitting form data:", Object.fromEntries(formData));

      if (isEditMode) {
        await API.put(`admin/update/subjects/${subjectToEdit.id}`, formData);
        toast.success("Subject updated successfully");
      } else {
        await API.post("admin/add/subjects", formData);
        toast.success("Subject added successfully");
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error("Submission error:", err);
      const errorMsg = err.response?.data?.error || "Failed to save subject";
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
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-3 border-b">
          <DialogTitle>
            {isEditMode ? "Edit Subject" : "Add New Subject"}
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

              {/* First Row - Subject Code, Name, Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Code *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter subject code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter subject name" />
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
                        <Input {...field} placeholder="Enter description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormLabel>Subject Image (Optional)</FormLabel>
                <ImageCropUpload
                  value={croppedImage || (isEditMode && !isImageCleared ? (subjectToEdit?.image_url || subjectToEdit?.avatar_url) : null)}
                  onCropped={(file) => {
                    setCroppedImage(file);
                    setIsImageCleared(false);
                  }}
                  onClear={() => {
                    setCroppedImage(null);
                    setIsImageCleared(true);
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
            {isSubmitting ? "Saving..." : (isEditMode ? "Update Subject" : "Add Subject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}