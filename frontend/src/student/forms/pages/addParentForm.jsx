import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ParentFormCard from "@/parents/forms/ParentFormCard";


export default function AddParentDialog({ open, onOpenChange, student, parent, onSuccess }) {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-3 border-b">
          <DialogTitle>
            Add / Manage Parents for {student.user_name} (ID: {student.id})
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mt-4">
                <ParentFormCard
                    title="Father Information"
                    relation="father"
                    studentId={student.id}
                    parentToEdit={parent}
                    onSuccess={onSuccess}
                />

                <ParentFormCard
                    title="Mother Information"
                    relation="mother"
                    studentId={student.id}
                    parentToEdit={parent}
                    onSuccess={onSuccess}
                />

                <ParentFormCard
                    title="Guardian Information"
                    relation="guardian"
                    studentId={student.id}
                    parentToEdit={parent}
                    onSuccess={onSuccess}
                />
            </div>
        </div>
        
      </DialogContent>
    </Dialog>
  );
}