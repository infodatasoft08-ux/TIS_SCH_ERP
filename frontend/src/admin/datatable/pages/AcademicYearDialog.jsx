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
import { toast } from "sonner";
import { CalendarDays } from "lucide-react";

const academicYearSchema = z.object({
  name: z.string().min(1, "Academic year name is required").regex(/^\d{4}-\d{4}$/, "Format must be YYYY-YYYY (e.g., 2025-2026)"),
  status: z.string().min(1, "Status is required"),
});

export default function AcademicYearDialog({
  open,
  onOpenChange,
  yearToEdit = null,
  onSuccess
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!yearToEdit;

  const form = useForm({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      name: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      if (yearToEdit) {
        form.reset({
          name: yearToEdit.name || "",
          status: yearToEdit.status || "active",
        });
      } else {
        form.reset({
          name: "",
          status: "active",
        });
      }
    }
  }, [open, yearToEdit, form]);

  async function onSubmit(values) {
    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await API.put(`/admin/update/academic-year/${yearToEdit.id}`, values);
        toast.success("Academic year updated successfully");
      } else {
        await API.post("/admin/add/academic-years", values);
        toast.success("Academic year added successfully");
      }
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save academic year");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden border-0 shadow-2xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6" />
              {isEditMode ? "Edit Academic Year" : "Add Academic Year"}
            </DialogTitle>
            <p className="text-blue-100/80 text-sm mt-1">
              {isEditMode ? "Update the academic year details." : "Define a new academic period for the system."}
            </p>
          </DialogHeader>
        </div>

        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 2025-2026" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
