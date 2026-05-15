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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageCropUpload from "@/widgets/ImageCropUpload";
import { convertToYYYYMMDD } from "@/helper/dateconversion";
import { DatePicker } from "@/components/ui/date-picker";
// import toast from "react-hot-toast";
import { toast } from "sonner";
import { Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { ComboboxFormField } from "@/widgets/comboboxFormField";
import { Eye, EyeOff, Printer } from "lucide-react";

// Create a dynamic schema based on edit mode
const createStudentSchema = (isEditMode) =>
  z.object({
    name: z.string().min(1, "Student name required"),
    email: z.string().email("Valid email required"),
    gender: z.string().min(1, "Gender is required"),
    // Password only required for new students
    password: isEditMode
      ? z.string().optional()
      : z.string().min(1, "Password is required"),
    phone: z.string().min(1, "Phone is required"),
    role_id: z.number().min(1, "Role is required"),
    admission_no: isEditMode ? z.string().min(1, "Admission No is required") : z.string().optional(),
    roll_no: z.string().min(1, "Roll No is required"),
    date_of_birth: z.string().min(1, "Date of Birth is required"),
    grade_id: z.coerce.string().min(1, "Grade is required"),
    class_id: z.coerce.string().min(1, "Class is required"),
    admission_date: z.string().min(1, "Admission Date is required"),
    adhar_number: z.string().max(12, "12 Digit Adhar Number is required").optional(),
    blood_group: z.string().optional(),
    mother_contect: z.string().max(10, "Phone is required and 10 digit number").optional(),
    father_occupation: z.string().min(1, "Father Occupation is required"),
    status: z.string().min(1, "Status is required"),
    address: z.string().min(1, "Address is required"),
    fathers_name: z.string().min(1, "Father's Name is required"),
    mothers_name: z.string().min(1, "Mother's Name is required"),
    parent_contact: z.string().max(10, "Parent Contact is required and 10 digit number"),
    academic_year_id: z.coerce.string().min(1, "Academic Year is required")
  });

export default function AddStudentDialog({
  open,
  onOpenChange,
  studentToEdit = null,
  onSuccess,
  classes = []
}) {
  const [croppedImage, setCroppedImage] = useState(null);
  const [isImageCleared, setIsImageCleared] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [step, setStep] = React.useState(1);
  const [showPassword, setShowPassword] = useState(false);

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

  const isEditMode = !!studentToEdit;
  const studentSchema = createStudentSchema(isEditMode);

  const form = useForm({
    resolver: zodResolver(studentSchema),
    mode: "onChange", // Validate on change to see errors immediately
    defaultValues: {
      name: "",
      email: "",
      gender: "",
      password: "",
      phone: "",
      role_id: 1,
      admission_no: "",
      roll_no: "",
      date_of_birth: "",
      grade_id: "",
      class_id: "",
      admission_date: "",
      adhar_number: "",
      blood_group: "",
      mother_contect: "",
      father_occupation: "",
      status: "active",
      address: "",
      fathers_name: "",
      mothers_name: "",
      parent_contact: "",
      academic_year_id: "",
    }
  });

  const nextStep = async () => {
    // console.log("Current form values:", form.getValues());
    const fieldsToValidate = [
      "name",
      "email",
      "phone",
      "password",
      "roll_no",
      "admission_date",
      "date_of_birth",
      "academic_year_id",
      "class_id",
      "grade_id",
      "status",
      "gender",
      "adhar_number",
      "address"
    ];

    if (isEditMode) {
      fieldsToValidate.push("admission_no");
    }

    const valid = await form.trigger(fieldsToValidate);

    if (valid) {
      setStep(2);
    } else {
      console.log("Validation failed for fields:", form.formState.errors);
      toast.error("Please fill all required fields correctly.");
    }
  };

  const prevStep = () => setStep(1);

  // Reset form when studentToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      setCroppedImage(null);
      setIsImageCleared(false);
      if (studentToEdit) {
        console.log("Setting form values for edit:", studentToEdit);

        // Find the class to get grade_name
        const studentClass = classes.find(cls =>
          cls.id.toString() === studentToEdit.class_id?.toString()
        );

        form.reset({
          name: studentToEdit.user_name || "",
          email: studentToEdit.user_email || "",
          gender: studentToEdit.user_gender || "",
          password: "", // Empty for edit mode
          phone: studentToEdit.user_phone || "",
          role_id: studentToEdit.role_id || 1,
          admission_no: studentToEdit.admission_no || "",
          roll_no: studentToEdit.roll_no || "",
          date_of_birth: formatDateForInput(studentToEdit.date_of_birth),
          grade_id: studentToEdit.grade_id?.toString() || "",
          class_id: studentToEdit.class_id?.toString() || "",
          admission_date: formatDateForInput(studentToEdit.admission_date),
          adhar_number: studentToEdit.user_adhar_no || "",
          blood_group: studentToEdit.blood_group || "",
          mother_contect: studentToEdit.mother_contect || "",
          father_occupation: studentToEdit.father_occupation || "",
          status: studentToEdit.status || "active",
          address: studentToEdit.user_address || "",
          fathers_name: studentToEdit.fathers_name || "",
          mothers_name: studentToEdit.mothers_name || "",
          parent_contact: studentToEdit.parent_contact || "",
          academic_year_id: studentToEdit.academic_year_id?.toString() || "",
        });

        if (studentClass) {
          setSelectedClass(studentClass);
        }
      } else {
        // Reset for new student
        form.reset({
          name: "",
          email: "",
          gender: "",
          password: "",
          phone: "",
          role_id: 1,
          admission_no: "",
          roll_no: "",
          date_of_birth: "",
          grade_id: "",
          class_id: "",
          admission_date: "",
          adhar_number: "",
          blood_group: "",
          mother_contect: "",
          father_occupation: "",
          status: "active",
          address: "",
          fathers_name: "",
          mothers_name: "",
          parent_contact: "",
          academic_year_id: ""
        });
        setSelectedClass(null);
      }
    }
  }, [open, studentToEdit, classes, form]);

  // Watch for class_id changes to update grade_id
  const selectedClassId = form.watch("class_id");

  useEffect(() => {
    if (selectedClassId) {
      const selectedClassData = classes.find(cls => cls.id.toString() === selectedClassId);
      if (selectedClassData) {
        setSelectedClass(selectedClassData);
        // Auto-set the grade_id when class is selected
        form.setValue("grade_id", selectedClassData.grade_id.toString(), {
          shouldValidate: true
        });
      }
    } else {
      setSelectedClass(null);
    }
  }, [selectedClassId, classes, form]);

  // Fetch academic years
  useEffect(() => {
    async function fetchAcademicYears() {
      try {
        const res = await API.get("/admin/get/academic-years");
        setAcademicYears(res.data.academic_years || []);
      } catch (err) {
        console.error("Failed to fetch academic years", err);
      }
    }
    fetchAcademicYears();
  }, []);

  const uniqueGrades = React.useMemo(() => {
    const gradeMap = new Map();
    classes.forEach(cls => {
      if (!gradeMap.has(cls.grade_id)) {
        gradeMap.set(cls.grade_id, {
          id: cls.grade_id,
          name: cls.grade_name
        });
      }
    });
    return Array.from(gradeMap.values());
  }, [classes]);

  async function onSubmit(values) {
    console.log("Form submitted with values:", values);
    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Format dates
      const formattedAdmissionDate = convertToYYYYMMDD(values.admission_date);
      if (formattedAdmissionDate) {
        formData.append('admission_date', formattedAdmissionDate);
      }

      const formattedBirthDate = convertToYYYYMMDD(values.date_of_birth);
      if (formattedBirthDate) {
        formData.append('date_of_birth', formattedBirthDate);
      }

      // Add other fields - skip password if empty in edit mode
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && key !== 'admission_date' && key !== 'date_of_birth') {
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
        await API.put(`/students/update/student/${studentToEdit.id}`, formData);
        toast.success("Student updated successfully");
      } else {
        await API.post("/students/add/student", formData);
        toast.success("Student added successfully");
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error("Submission error:", err);
      const errorMsg = err.response?.data?.error || "Failed to save student";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Add error logging
  // useEffect(() => {
  //   const subscription = form.watch((value, { name, type }) => {
  //     console.log("Form values changed:", value);
  //   });
  //   return () => subscription.unsubscribe();
  // }, [form.watch]);

  // useEffect(() => {
  //   console.log("Form errors:", form.formState.errors);
  // }, [form.formState.errors]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handlePrint = async () => {
    if (!studentToEdit?.id) return;
    const loadingToast = toast.loading("Preparing Admission Form...");
    try {
      const response = await API.get(`/students/download/admission-form/${studentToEdit.id}`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Admission_Form_${studentToEdit.id}.pdf`);
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success("Admission form downloaded successfully");
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMsg = err.response?.data?.error || "Failed to download admission form";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handlePrintAdmissionForm = async (studentId) => {
    const loadingToast = toast.loading("Preparing Admission Form...");
    if (!studentId) return;
    try {
      const res = await API.get(`/students/download/admission-form/${studentId}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const printWindow = window.open(url, "_blank");
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        toast.error("Pop-up blocked. Please allow pop-ups to print.");
      }
    } catch (err) {
      console.error("Failed to print admission form", err);
      toast.error("Failed to generate admission form");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} >
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh] border-0 shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white shrink-0">
          <DialogHeader className="p-0">
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  {isEditMode ? "Edit Student Profile" : "New Student Registration"}
                </DialogTitle>
                <p className="text-violet-100/80 text-sm mt-1">
                  {isEditMode ? "Update student details and information." : "Enroll a new student into the system."}
                </p>
              </div>
              {/* Custom Close Button could go here if needed, but Dialog usually handles it */}
            </div>
            <div className="mt-6">
              <Stepper currentStep={step} steps={["Student Info", "Parent Info"]} />
            </div>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-white dark:bg-gray-900/10" style={{ scrollbarWidth: "thin", scrollbarColor: "#8b5cf6 #f3f4f6", scrollBehavior: "smooth", msScrollbarArrowColor: "#8b5cf6" }}>
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

              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Student Information</h3>
                  {/* Student-related fields here */}
                  {/* First Row - Student Name, Email, Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Student Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter student name"
                            />
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

                  {/* Second Row - Password, Admission No, Roll No */}
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
                        name="admission_no"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Admission No *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                // disabled
                                placeholder={isEditMode ? "Enter admission number" : "Auto-generated"}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* <FormField
                      control={form.control}
                      name="admission_no"
                      className={`${isEditMode ? "block" : "hidden"}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={`${isEditMode ? "block" : "hidden"}`}>Admission No *</FormLabel>
                          <FormControl className={`${isEditMode ? "block" : "hidden"}`}>
                            <Input
                              {...field}
                              disabled
                              placeholder={isEditMode ? "Enter admission number" : "Auto-generated"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    /> */}

                    <FormField
                      control={form.control}
                      name="roll_no"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roll No *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter roll number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Third Row - Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="admission_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admission Date *</FormLabel>
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
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
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
                      name="academic_year_id"
                      render={({ field, fieldState }) => (
                        <ComboboxFormField
                          field={{ ...field, error: fieldState.error }}
                          label="Academic Year"
                          required
                          items={academicYears}
                          valueKey="id"
                          labelKey="name"
                          searchKey="name"
                          placeholder="Select Year"
                          searchPlaceholder="Search year..."
                          emptyMessage="No academic year found."
                        />
                      )}
                    />
                  </div>

                  {/* Fourth Row - Class, Grade, Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="class_id"
                      render={({ field, fieldState }) => (
                        <ComboboxFormField
                          field={{ ...field, error: fieldState.error }}
                          label="Section"
                          required
                          items={classes.map(cls => ({
                            id: cls.id,
                            display: `${cls.name} (Grade: ${cls.grade_name})`
                          }))}
                          valueKey="id"
                          labelKey="display"
                          searchKey="display"
                          placeholder="Select section"
                          searchPlaceholder="Search section..."
                          emptyMessage="No section found."
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="grade_id"
                      render={({ field, fieldState }) => (
                        <ComboboxFormField
                          field={{ ...field, error: fieldState.error }}
                          label="Class"
                          required
                          items={uniqueGrades}
                          valueKey="id"
                          labelKey="name"
                          searchKey="name"
                          placeholder={selectedClass ? selectedClass.grade_name : "Select grade"}
                          searchPlaceholder="Search grade..."
                          emptyMessage="No grade found."
                        />
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="alumni">Alumni</SelectItem>
                              <SelectItem value="left">Left</SelectItem>
                              <SelectItem value="suspended">
                                Suspended
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    <FormField
                      control={form.control}
                      name="blood_group"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Blood Group *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter your blood group"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="adhar_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adhar Number(Optional)</FormLabel>
                          <FormControl>
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

                  <div>
                    <FormLabel className={"pb-3"}>
                      Profile Image (Optional)
                    </FormLabel>
                    <ImageCropUpload
                      value={croppedImage || (isEditMode && !isImageCleared ? studentToEdit?.user_avatar_url : null)}
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
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Parent Information</h3>
                  {/* Parent-related fields here */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fathers_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Father's Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter father's name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mothers_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mother's Name *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter mother's name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parent_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fathers Contact *</FormLabel>
                          <FormControl>
                            {/* <Input
                              {...field}
                              type="tel"
                              placeholder="Enter father's mobile number"
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
                    <FormField
                      control={form.control}
                      name="mother_contect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mother's Contact *</FormLabel>
                          <FormControl>
                            {/* <Input
                              {...field}
                              type="tel"
                              placeholder="Enter mother's mobile number"
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

                    <FormField
                      control={form.control}
                      name="father_occupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Father Occupation *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter Your Father Occpation"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Fifth Row - Gender, Parents Info */}
              {/* <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                </div> */}

              {/* Sixth Row - Parent Contact, Address */}
              {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div> */}

              {/* Profile Image */}
              {/* <div>
                  <FormLabel className={"pb-3"}>Profile Image (Optional)</FormLabel>
                  <ImageCropUpload onCropped={(file) => setCroppedImage(file)} />
                </div> */}

              {/* Hidden Role ID */}
              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => <Input type="hidden" {...field} />}
              />

              <div className="pb-4"></div>
            </form>
          </Form>
        </div>

        {/* Footer */}
        {/* <DialogFooter className="p-3 border-t">
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
            {isSubmitting ? "Saving..." : (isEditMode ? "Update Student" : "Add Student")}
          </Button>
        </DialogFooter> */}

        <DialogFooter className="flex justify-between p-3 border-t">
          {step === 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                Next
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
                Previous
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                onClick={form.handleSubmit(onSubmit)}
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditMode
                    ? "Update Student"
                    : "Add Student"}
              </Button>
              {isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                  onClick={() => handlePrintAdmissionForm(studentToEdit.id)}
                  disabled={isSubmitting}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Form
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}