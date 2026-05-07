import React, { useState, useEffect } from "react";
import API from "@/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, BookOpen, Trash2, Edit, Calendar, LayoutGrid, List, Filter, Download, Send } from "lucide-react";
import DataTable from "@/widgets/DataTable";
import { toast } from "sonner";
import AddHomeworkForm from "./forms/AddHomeworkForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

export default function HomeworkPage() {
  const [homeworks, setHomeworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [grades, setGrades] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [sendId, setSendId] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const loadHomeworks = async () => {
    setIsLoading(true);
    try {
      let url = "/homework/list";
      const params = new URLSearchParams();
      if (selectedGrade !== "all") params.append("grade_id", selectedGrade);
      if (selectedClass !== "all") params.append("class_id", selectedClass);

      const res = await API.get(`${url}?${params.toString()}`);
      setHomeworks(res.data.homeworks || []);
    } catch (err) {
      toast.error("Failed to load homeworks");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      const [gRes, cRes] = await Promise.all([
        API.get("/admin/get/grades"),
        API.get("/admin/get/classes")
      ]);
      setGrades(gRes.data.grades || []);
      setClasses(cRes.data.classes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGrades();
  }, []);

  useEffect(() => {
    loadHomeworks();
  }, [selectedGrade, selectedClass]);

  const handleDelete = async () => {
    try {
      await API.delete(`/homework/delete/${deleteId}`);
      toast.success("Homework deleted successfully");
      loadHomeworks();
    } catch (err) {
      toast.error("Failed to delete homework");
    } finally {
      setDeleteId(null);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!sendId) return;
    setIsSending(true);
    try {
      await API.post(`/homework/send-whatsapp/${sendId}`);
      toast.success("WhatsApp messages sent successfully");
    } catch (err) {
      toast.error("Failed to send WhatsApp messages");
    } finally {
      setIsSending(false);
      setSendId(null);
    }
  };

  const columns = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-bold">{row.original.title}</span>
          <span className="text-xs text-muted-foreground">{new Date(row.original.homework_date).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      accessorKey: "grade_name",
      header: "Class / Grade",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Badge variant="outline">{row.original.grade_name}</Badge>
          {row.original.class_name && <Badge variant="secondary">{row.original.class_name}</Badge>}
        </div>
      )
    },
    {
      accessorKey: "details",
      header: "Subjects",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.details?.map((d, i) => (
            <Badge key={i} variant="ghost" className="bg-blue-50 text-blue-700 text-[10px]">
              {d.subject_name}
            </Badge>
          ))}
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedHomework(row.original);
              setIsFormOpen(true);
            }}
          >
            <Edit className="h-4 w-4 text-blue-600" />
          </Button>
          {row.original.attachment_url && (
            <Button
              variant="ghost"
              size="icon"
              asChild
            >
              <a href={row.original.attachment_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 text-green-600" />
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSendId(row.original.id)}
            title="Send WhatsApp Notification"
          >
            <Send className="h-4 w-4 text-indigo-600" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 md:p-10 mb-8 rounded-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-blue-200" />
              Homework Management
            </h1>
            <p className="mt-2 text-blue-100/90 text-lg max-w-xl">
              Create, manage and distribute daily homework to students and parents.
            </p>
          </div>
          {/* <Button
            onClick={() => {
              setSelectedHomework(null);
              setIsFormOpen(true);
            }}
            className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-6 h-12 shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Homework
          </Button> */}
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-7xl mx-auto relative z-20">
        <Card className="border-0 shadow-xl backdrop-blur-md">
          <CardContent className="p-6">
            <DataTable
              columns={columns}
              data={homeworks}
              isLoading={isLoading}
              onAddNew={() => {
                setSelectedHomework(null);
                setIsFormOpen(true);
              }}
              addButtonText="New Homework"
              onRefresh={loadHomeworks}
              leftOfSearch={
                <div className="flex gap-2 w-full lg:w-auto">
                  <Select onValueChange={setSelectedGrade} value={selectedGrade}>
                    <SelectTrigger className="w-full lg:w-[150px] bg-white">
                      <SelectValue placeholder="All Grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {grades.map(g => (
                        <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select onValueChange={setSelectedClass} value={selectedClass}>
                    <SelectTrigger className="w-full lg:w-[150px] bg-white">
                      <SelectValue placeholder="All Sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sections</SelectItem>
                      {classes
                        .filter(c => selectedGrade === "all" || c.grade_id.toString() === selectedGrade)
                        .map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>

      <AddHomeworkForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={loadHomeworks}
        homeworkToEdit={selectedHomework}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this homework and its details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!sendId} onOpenChange={() => !isSending && setSendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send WhatsApp Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the homework details to all students/parents of the assigned grade and class via WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSendWhatsApp();
              }}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={isSending}
            >
              {isSending ? "Sending..." : "Send Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}