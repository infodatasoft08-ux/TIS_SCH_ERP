// components/AddTeacherDialog.jsx
import React, { useState, useEffect } from "react";
import API from "@/api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageCropUpload from "@/widgets/ImageCropUpload";
import { convertToYYYYMMDD } from "@/helper/dateconversion";
// import toast from "react-hot-toast";
import { toast } from "sonner";

const AccountantSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
  gender: z.string().min(1, "Gender is required"),
  phone: z.string().min(1, "Phone is required"),
  role_id: z.number().min(1, "Role is required"),
  avatar_url: z.any().optional(),
}).refine((data) => {
  // Only require password when creating new teacher (not editing)
  if (!isEditMode) {
    return data.password && data.password.length >= 1;
  }
  return true;
}, {
  message: "Password is required",
  path: ["password"],
});

let isEditMode = false; // Will be set dynamically

export default function AddAccountantDialog({
  open,
  onOpenChange,
  teacherToEdit = null,
  onSuccess,
  roles = []
}) {
  const [croppedImage, setCroppedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  isEditMode = !!accountantToEdit;

  const form = useForm({
    resolver: zodResolver(AccountantSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      gender: "",
      password: "",
      phone: "",
      role_id: 4, // Default to Accountant role
      avatar_url: ""
    }
  });

  // Reset form when teacherToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      if (accountantToEdit) {
        console.log("Setting form values for edit:", accountantToEdit);

        form.reset({
          name: accountantToEdit.user_name || "",
          email: accountantToEdit.user_email || "",
          gender: accountantToEdit.user_gender || "",
          password: "", // Empty for edit mode
          phone: accountantToEdit.user_phone || "",
          role_id: accountantToEdit.role_id || 2,
          avatar_url: accountantToEdit.avatar_url || ""
        });
      } else {
        // Reset for new teacher
        form.reset({
          name: "",
          email: "",
          gender: "",
          password: "",
          phone: "",
          role_id: 2,
          avatar_url: ""
        });
      }
    }
  }, [open, accountantToEdit, form]);

  async function onSubmit(values) {
    console.log("Form submitted with values:", values);
    setIsSubmitting(true);

    try {
      const formData = new FormData();


      // Add other fields - skip password if empty in edit mode
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          // Skip empty password in edit mode
          if (isEditMode && key === 'password' && value === '') {
            return;
          }
          formData.append(key, value);
        }
      });

      if (croppedImage) {
        formData.append("avatar_url", croppedImage);
      }

      console.log("Submitting form data:", Object.fromEntries(formData));

      if (isEditMode) {
        await API.put(`/teachers/update/teacher/${teacherToEdit.teacher_id}`, formData);
        toast.success("Teacher updated successfully");
      } else {
        await API.post("/teachers/add/teacher", formData);
        toast.success("Teacher added successfully");
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error("Submission error:", err);
      const errorMsg = err.response?.data?.error || "Failed to save teacher";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-3 border-b">
          <DialogTitle>
            {isEditMode ? "Edit Teacher" : "Add New Teacher"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Debug: Show validation errors at top */}
              {Object.keys(form.formState.errors).length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded p-3 mb-4">
                  <p className="text-red-600 dark:text-red-400 font-semibold">
                    Please fix the following errors:
                  </p>
                  <ul className="text-red-500 dark:text-red-400 text-sm mt-1">
                    {Object.entries(form.formState.errors).map(
                      ([key, error]) => (
                        <li key={key}>{error.message}</li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {/* First Row - Teacher Name, Email, Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teacher Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter teacher name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          placeholder="email@gmail.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone *</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          {...field}
                          placeholder="Enter phone number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Second Row - Password, Employee Code, Hire Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {!isEditMode && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            {...field}
                            placeholder="Create password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="employee_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Code *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter employee code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hire_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Third Row - Qualification, Bio, Role */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qualification *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter qualification" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter bio" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fourth Row - Gender, Profile Image */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className="sm:col-span-2">
                  <FormLabel className={"pb-3"}>Profile Image (Optional)</FormLabel>
                  <ImageCropUpload
                    onCropped={(file) => setCroppedImage(file)}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => (
                  <FormItem>
                    {/* <FormLabel>Role *</FormLabel> */}
                    <FormControl>
                      <Input
                        {...field}
                        value="2"
                        disabled={true}
                        readOnly={true}
                        type="hidden"
                        className="bg-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                ? "Update Teacher"
                : "Add Teacher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}