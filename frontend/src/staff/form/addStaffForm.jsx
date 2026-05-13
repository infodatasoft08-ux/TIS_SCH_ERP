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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const StaffSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
  gender: z.string().min(1, "Gender is required"),
  phone: z.string().min(1, "Phone is required"),
  role_id: z.number().min(1, "Role is required"),
  employee_code: z.string().optional(),
  hire_date: z.string().min(1, "Hire date is required"),
  qualification: z.string().min(1, "Qualification is required"),
  bio: z.string().optional(),
  department: z.string().min(1, "Department is required"),
  address: z.string().min(1, "Address is required"),
  adhar_no: z.string().max(12, "12 Digit Adhar Number is required"),
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

export default function AddStaffDialog({
  open,
  onOpenChange,
  staffToEdit = null,
  onSuccess,
  roles = []
}) {
  const [croppedImage, setCroppedImage] = useState(null);
  const [isImageCleared, setIsImageCleared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  isEditMode = !!staffToEdit;

  // Format date for input field
  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const form = useForm({
    resolver: zodResolver(StaffSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      gender: "",
      password: "",
      phone: "",
      role_id: "", // Default to Accountant role
      employee_code: "",
      hire_date: "",
      qualification: "",
      bio: "",
      department: "",
      avatar_url: ""
    }
  });

  // Reset form when teacherToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      setCroppedImage(null);
      setIsImageCleared(false);
      if (staffToEdit) {
        console.log("Setting form values for edit:", staffToEdit);

        form.reset({
          name: staffToEdit.user_name || "",
          email: staffToEdit.user_email || "",
          gender: staffToEdit.user_gender || "",
          password: "", // Empty for edit mode
          phone: staffToEdit.user_phone || "",
          role_id: staffToEdit.role_id || "",
          employee_code: staffToEdit.employee_code || "",
          hire_date: formatDateForInput(staffToEdit.hire_date),
          qualification: staffToEdit.qualification || "",
          bio: staffToEdit.bio || "",
          department: staffToEdit.department || "",
          address: staffToEdit.user_address || "",
          adhar_no: staffToEdit.user_adhar_no || "",
          avatar_url: staffToEdit.avatar_url || ""
        });
      } else {
        // Reset for new teacher
        form.reset({
          name: "",
          email: "",
          gender: "",
          password: "",
          phone: "",
          role_id: "",
          employee_code: "",
          hire_date: "",
          qualification: "",
          bio: "",
          department: "",
          address: "",
          adhar_no: "",
          avatar_url: ""
        });
      }
    }
  }, [open, staffToEdit, form]);

  async function onSubmit(values) {
    console.log("Form submitted with values:", values);
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Add other fields - skip password if empty in edit mode
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          // Skip empty password in edit mode
          if (isEditMode && key === "password" && value === "") {
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
        await API.put(`/staffUser/update/staff/${staffToEdit.staff_id}`, formData);
        toast.success("Teacher updated successfully");
      } else {
        await API.post("/staffUser/add/staff", formData);
        toast.success("Teacher added successfully");
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Submission error:", err);
      const errorMsg = err.response?.data?.error || "Failed to save staff";
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
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              {isEditMode ? "Edit Staff Profile" : "New Staff Registration"}
            </DialogTitle>
            <p className="text-blue-100/80 text-sm mt-1">
              {isEditMode ? "Update faculty details and qualifications." : "Register a new faculty member."}
            </p>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto px-6">
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

              {/* First Row - Staff Name, Email, Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter staff name" />
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
                            disabled={isEditMode}
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
                        {/* <Input {...field} placeholder="Enter Adhar Number" /> */}
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
                  name="role_id"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false);
                    const selectedRole = roles.find(
                      (role) => role.id === field.value
                    );

                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>Assign Role *</FormLabel>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-full justify-between"
                            >
                              <span className="truncate">
                                {selectedRole
                                  ? `${selectedRole.role_name}`
                                  : "Select Role"}
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
                                className="focus:outline-none"
                                placeholder="Search role..."
                              />
                              <CommandList>
                                <CommandEmpty>No roles found.</CommandEmpty>
                                <CommandGroup>
                                  {roles
                                    .filter((role) => role.sub_role === "staff" || (!["student", "teacher", "admin", "super"].includes(String(role.role_name).toLowerCase()) && !role.sub_role))
                                    .map((role) => (
                                      <CommandItem
                                        key={role.id}
                                        value={role.id}
                                        onSelect={() => {
                                          field.onChange(role.id);
                                          setOpen(false);
                                        }}
                                        className="cursor-pointer"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === role.id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        <span>{role.role_name}</span>
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

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter department" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="sm:col-span-2">
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

                  <FormLabel className={"pb-3 pt-5"}>
                    Profile Image (Optional)
                  </FormLabel>
                  <ImageCropUpload
                    value={croppedImage || (isEditMode && !isImageCleared ? staffToEdit?.avatar_url : null)}
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
                ? "Update Staff"
                : "Add Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}