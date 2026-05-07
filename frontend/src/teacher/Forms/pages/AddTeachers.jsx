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
import { DatePicker } from "@/components/ui/date-picker";
// import toast from "react-hot-toast";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff } from "lucide-react";

const teacherSchema = z.object({
  name: z.string().min(1, "Teacher name required"),
  email: z.string().email("Valid email required"),
  gender: z.string().min(1, "Gender is required"),
  phone: z.string().min(1, "Phone is required"),
  role_id: z.number().min(1, "Role is required"),
  employee_code: z.string().optional(),
  hire_date: z.string().min(1, "Hire date is required"),
  qualification: z.string().min(1, "Qualification is required"),
  bio: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  adhar_no: z.string().min(1, "Adhar Number is required"),
  avatar_url: z.any().optional(),
  password: z.string().optional(),
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

export default function AddTeacherDialog({
  open,
  onOpenChange,
  teacherToEdit = null,
  onSuccess,
  roles = []
}) {
  const [croppedImage, setCroppedImage] = useState(null);
  const [isImageCleared, setIsImageCleared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  isEditMode = !!teacherToEdit;

  // Format date for input field
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const form = useForm({
    resolver: zodResolver(teacherSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      gender: "",
      password: "",
      phone: "",
      role_id: 2, // Default to teacher role
      employee_code: "",
      hire_date: "",
      qualification: "",
      bio: "",
      address: "",
      adhar_no: "",
      avatar_url: ""
    }
  });

  // Reset form when teacherToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      setCroppedImage(null);
      setIsImageCleared(false);
      if (teacherToEdit) {
        console.log("Setting form values for edit:", teacherToEdit);

        form.reset({
          name: teacherToEdit.user_name || "",
          email: teacherToEdit.user_email || "",
          gender: teacherToEdit.user_gender || "",
          password: "", // Empty for edit mode
          phone: teacherToEdit.user_phone || "",
          role_id: teacherToEdit.role_id || 2,
          employee_code: teacherToEdit.employee_code || "",
          hire_date: formatDateForInput(teacherToEdit.hire_date),
          qualification: teacherToEdit.qualification || "",
          bio: teacherToEdit.bio || "",
          address: teacherToEdit.user_address || "",
          adhar_no: teacherToEdit.user_adhar_no || "",
          avatar_url: teacherToEdit.avatar_url || ""
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
          employee_code: "",
          hire_date: "",
          qualification: "",
          bio: "",
          address: "",
          adhar_no: "",
          avatar_url: ""
        });
      }
    }
  }, [open, teacherToEdit, form]);

  async function onSubmit(values) {
    console.log("Form submitted with values:", values);
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Format dates
      const formattedHireDate = convertToYYYYMMDD(values.hire_date);
      if (formattedHireDate) {
        formData.append('hire_date', formattedHireDate);
      }

      // Add other fields - skip password if empty in edit mode
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && key !== 'hire_date') {
          // Skip empty password in edit mode
          if (isEditMode && key === 'password' && value === '') {
            return;
          }
          formData.append(key, value);
        }
      });

      if (croppedImage) {
        formData.append("image", croppedImage);
      } else if (isEditMode && isImageCleared) {
        formData.append("avatar_url", "");
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh] border-0 shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              {isEditMode ? "Edit Teacher Profile" : "New Teacher Registration"}
            </DialogTitle>
            <p className="text-blue-100/80 text-sm mt-1">
              {isEditMode ? "Update faculty details and qualifications." : "Register a new faculty member."}
            </p>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50/50 dark:bg-gray-900/10" style={{ scrollbarWidth: "thin", scrollbarColor: "#8b5cf6 #f3f4f6", scrollBehavior: "smooth", msScrollbarArrowColor: "#8b5cf6" }}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Debug: Show validation errors at top */}
              {/* {Object.keys(form.formState.errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <p className="text-red-600 font-semibold">
                    Please fix the following errors:
                  </p>
                  <ul className="text-red-500 text-sm mt-1">
                    {Object.entries(form.formState.errors).map(
                      ([key, error]) => (
                        <li key={key}>{error.message}</li>
                      )
                    )}
                  </ul>
                </div>
              )} */}

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
                        {/* <Input
                          type="email"
                          {...field}
                          placeholder="email@gmail.com"
                        /> */}
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter email address"
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase();
                            field.onChange(value);
                          }}
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
                        {/* <Input
                          type="tel"
                          {...field}
                          placeholder="Enter phone number"
                        /> */}
                        <Input
                          {...field}
                          maxLength={10}
                          placeholder="Enter phone number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, ""); // allow only digits
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Second Row - Password, Employee Code, Hire Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password {isEditMode ? "" : "*"}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            {...field}
                            placeholder={isEditMode ? "Leave empty to keep current" : "Create password"}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full hover:bg-transparent"
                            onClick={togglePasswordVisibility}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEditMode && (
                  <FormField
                    control={form.control}
                    name="employee_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee Code *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            // disabled // Usually employee code shouldn't change, but definitely disabled for new
                            placeholder={isEditMode ? field.value : "Auto-generated"}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="hire_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date *</FormLabel>
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
                  name="adhar_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adhar Number *</FormLabel>
                      <FormControl>
                        {/* <Input {...field} maxLength={12} placeholder="Enter adhar number" /> */}
                        <Input
                          {...field}
                          maxLength={12}
                          placeholder="Enter Aadhar number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, ""); // allow only digits
                            field.onChange(value);
                          }}
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
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Enter address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="sm:col-span-2">
                  <FormLabel className={"pb-3"}>Profile Image (Optional)</FormLabel>
                  <ImageCropUpload
                    value={croppedImage || (isEditMode && !isImageCleared ? teacherToEdit?.avatar_url : null)}
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
                        className="bg-gray-50"
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