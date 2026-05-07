import React, { useEffect, useState } from "react";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import toast from "react-hot-toast";
import { toast } from "sonner";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageCropUpload from "@/widgets/ImageCropUpload";

const parentSchema = z.object({
  name: z.string().min(1, "Parent name is required"),
  email: z.string().email("Valid email is required"),
  gender: z.string().min(1, "Gender is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Valid phone number is required"),
  occupation: z.string().min(1, "Occupation is required"),
  relation: z.string().min(1, "Relationship is required"),
  role_id: z.number().default(5), // Assuming 5 is parent role
});

export default function ParentFormCard({ title, relation, studentId, parentToEdit = null, onSuccess }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [croppedImage, setCroppedImage] = useState(null);


  const isEditMode = !!parentToEdit;
    const form = useForm({
        resolver: zodResolver(parentSchema),
        mode: "onChange",
        defaultValues: {
            name: "",
            email: "",
            gender: "",
            password: "",
            phone: "",
            occupation: "",
            relation: relation,
            address: "",
            alternate_phone: "",
            role_id: 5,
        }
    });
//   const [form, setForm] = useState({
//     name: "",
//     email: "",
//     gender: "",
//     phone: "",
//     occupation: "",
//     password: ""
//   });

    useEffect(() => {
        if (open) {
            if (parentToEdit) {
                console.log("Setting form values for edit:", parentToEdit);
                
                form.reset({
                    name: parentToEdit.user_name || "",
                    email: parentToEdit.user_email || "",
                    gender: parentToEdit.user_gender || "",
                    password: "", // Empty for edit mode
                    phone: parentToEdit.user_phone || "",
                    occupation: parentToEdit.occupation || "",
                    relation: parentToEdit.relation || "",
                    address: parentToEdit.address || "",
                    alternate_phone: parentToEdit.alternate_phone || "",
                    role_id: parentToEdit.role_id || 5,
                });
            } else {
                form.reset({
                    name: "",
                    email: "",
                    gender: "",
                    password: "",
                    phone: "",
                    occupation: "",
                    relation: "",
                    address: "",
                    alternate_phone: "",
                    role_id: 5,
                });
            }
        }
    }, [open, parentToEdit, form]);
  const [parentId, setParentId] = useState(null);

//   function onChange(e) {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   }

//   async function saveParent() {
//     try {
//       const res = await API.post("/parents/add/parents", {
//         ...form,
//         relation,
//         role_id: 5
//       });

//       const createdParentId = res.data.parent.id;
//       setParentId(createdParentId);

//       // 🔗 link parent with student
//       await API.post(`/students/add/student/${studentId}/parents`, {
//         parent_id: createdParentId,
//         relationship: relation
//       });

//       toast.success(`${title} added & linked`);
//     } catch (err) {
//       toast.error(err.response?.data?.error || "Failed to save parent");
//     }
//   }


    async function onSubmit(values) {
        console.log("Parent form submitted with values:", values);
        setIsSubmitting(true);

        try {
            const formData = new FormData();

            // Add all fields to formData
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
                formData.append("photo_url", croppedImage);
            }

            let parentId;

            if (isEditMode) {
                await API.put(`/parents/update/parents/${parentToEdit.id}`, formData);
                parentId = parentToEdit.id;
                toast.success("Parent updated successfully");
            } else {
                const response = await API.post("/parents/add/parents", formData);
                parentId = response.data.parent?.id;
                toast.success("Parent added successfully");
            }

            // Link parent to student if studentId is provided
            if (studentId && parentId) {
                setIsLinking(true);
                try {
                    await API.post(`/students/add/student/${studentId}/parents`, {
                        parent_id: parentId,
                        relationship: values.relation
                    });
                toast.success("Parent linked to student successfully");
                } catch (linkError) {
                    console.error("Failed to link parent:", linkError);
                    // Don't show error toast here to avoid confusion
                } finally {
                    setIsLinking(false);
                }
            }

            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error("Submission error:", err);
            const errorMsg = err.response?.data?.error || "Failed to save parent";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function removeParent() {
        if (!parentId) return;
        if (!confirm("Remove parent from student?")) return;

        try {
            await API.delete(`/parents/delete/parents/${parentId}/children/${studentId}`);
            setParentId(null);
            setForm({ name: "", email: "", phone: "", occupation: "", password: "" });
            toast.success(`${title} removed`);
        } catch {
            toast.error("Failed to remove parent");
        }
    }

    const relationshipOptions = [
        { value: "father", label: "Father" },
        { value: "mother", label: "Mother" },
        { value: "guardian", label: "Guardian" },
        { value: "other", label: "Other" },
    ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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

              {/* First Row - Parent Name, Email, Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter parent name" />
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
                        <Input type="email" {...field} placeholder="email@gmail.com" />
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
                        <Input type="tel" {...field} placeholder="Enter phone number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Second Row - Password, Occupation, gender */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {!isEditMode && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password *</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} placeholder="Create password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter occupation" />
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
              </div>

              {/* Third Row - Relationship */}
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="relation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {relationshipOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Profile Image */}
              <div>
                <FormLabel className="pb-3">Profile Image (Optional)</FormLabel>
                <ImageCropUpload 
                  onCropped={(file) => setCroppedImage(file)} 
                  aspectRatio={1} // Square aspect for profile
                />
              </div>

              {/* Hidden Role ID */}
              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => (
                  <Input type="hidden" {...field} />
                )}
              />

              <div className="pb-4"></div>

            </form>
          </Form>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" className="flex-1" disabled={isSubmitting || isLinking} onClick={form.handleSubmit(onSubmit)}>
            {/* {parentId ? "Update" : "Save"} */}
            {isSubmitting || isLinking 
              ? "Saving..." 
              : (isEditMode 
                  ? "Update Parent" 
                  : studentId 
                    ? "Add & Link Parent" 
                    : "Add Parent"
                )
            }

          </Button>
          {isEditMode && (
            <Button variant="destructive" onClick={removeParent} disabled={isSubmitting || isLinking}>
              Remove
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isLinking}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}