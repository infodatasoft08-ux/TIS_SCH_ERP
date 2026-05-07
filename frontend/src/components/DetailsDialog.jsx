import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Mail, Phone, Calendar, MapPin, Briefcase, GraduationCap, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const DetailItem = ({ icon: Icon, label, value, className }) => (
  <div className={cn("flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors", className)}>
    {Icon && (
      <div className="mt-1 bg-primary/10 p-2 rounded-full text-primary">
        <Icon className="h-4 w-4" />
      </div>
    )}
    <div className="flex flex-col gap-1 flex-1">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-foreground break-words">{value || "N/A"}</span>
    </div>
  </div>
);

export default function DetailsDialog({ open, onOpenChange, title, data, fields, image }) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl sm:max-h-[85vh]">
        <DialogHeader className="p-6 pb-2 text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 overflow-hidden relative">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            {title || "Record Details"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="p-6 max-h-[70vh]">
          <div className="flex flex-col gap-8">
            {/* Profile/Image Section */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="h-32 w-32 rounded-2xl overflow-hidden border-4 border-primary/10 shadow-xl bg-muted shrink-0">
                {image ? (
                  <img src={image} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/5">
                    <User className="h-16 w-16 text-primary/20" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-center sm:text-left space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">{data.user_name || data.name || "Unnamed"}</h2>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  {data.role_name && (
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-tight">
                      {data.role_name}
                    </span>
                  )}
                  {data.employee_code && (
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full">
                      ID: {data.employee_code}
                    </span>
                  )}
                  {data.student_id && (
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-full">
                      ID: {data.student_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field, idx) => (
                <DetailItem 
                  key={idx}
                  icon={field.icon}
                  label={field.label}
                  value={field.value || data[field.key]}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
