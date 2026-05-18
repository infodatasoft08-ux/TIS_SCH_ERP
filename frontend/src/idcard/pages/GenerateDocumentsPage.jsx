import React, { useState, useMemo, useEffect, startTransition } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import API, { BASE_URL } from '@/api';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, Printer, Download, Users, FileType, CheckCircle2 } from 'lucide-react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper();

export default function GenerateDocumentsPage() {
  const [docType, setDocType] = useState('id_card');
  const [userType, setUserType] = useState('student');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const [generatedBlob, setGeneratedBlob] = useState(null);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Filters
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');


  // Fetch Master Data
  const { data: grades = [] } = useQuery({
    queryKey: ['grades'],
    queryFn: async () => {
      const res = await API.get('/admin/get/grades');
      const data = res.data.grades || res.data || [];
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await API.get('/admin/get/classes');
      const data = res.data.classes || res.data || [];
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic_years'],
    queryFn: async () => {
      const res = await API.get('/admin/get/academic-years');
      const data = res.data.academic_years || res.data.academicYears || res.data || [];
      return Array.isArray(data) ? data : [];
    }
  });

  // Fetch Templates
  const { data: templates = [] } = useQuery({
    queryKey: ['document_templates'],
    queryFn: documentApi.getTemplates,
  });

  const filteredTemplates = templates.filter(t => t.type === docType && t.user_type === userType);

  // Fetch Users (Students/Teachers/Staff)
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users_list', userType, selectedGrade, selectedClass, selectedYear],

    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,

    refetchOnWindowFocus: false,
    queryFn: async () => {
      let endpoint = '';
      if (userType === 'student') endpoint = '/students/get/student';
      else if (userType === 'teacher') endpoint = '/teachers/get/teacher';
      else endpoint = '/staffUser/get/staff';

      const params = new URLSearchParams();
      if (selectedGrade !== 'all') params.append('grade_id', selectedGrade);
      if (selectedClass !== 'all') params.append('class_id', selectedClass);
      if (selectedYear !== 'all') params.append('academic_year_id', selectedYear);

      try {
        const res = await API.get(`${endpoint}?${params.toString()}`);

        // Extract the array correctly based on the endpoint's response format
        const rawList = res.data.students || res.data.teachers || res.data.users || (Array.isArray(res.data) ? res.data : []);

        // Normalize data: ensure every user has a consistent 'id' field
        return rawList.map((u, idx) => ({
          ...u,
          id: String(u.id || u.teacher_id || u.staff_id || `row-${idx}`),
          // Ensure we have name and code for columns regardless of backend key
          display_name: u.name || u.user_name || 'Unknown',
          display_code: u.admission_no || u.employee_code || u.admission_number || 'N/A',
          display_sub: u.class_name || u.department || 'N/A'
        }));
      } catch (err) {
        console.error("Fetch users error:", err);
        return [];
      }
    }
  });

  // Table Columns - Stable definitions
  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'display_name',
      cell: info => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
            {String(info.getValue() || '?').charAt(0)}
          </div>
          <span className="font-medium">{info.getValue()}</span>
        </div>
      ),
    },
    {
      id: 'code',
      header: 'ID / Code',
      accessorKey: 'display_code',
      cell: info => <Badge variant="secondary">{info.getValue()}</Badge>,
    },
    {
      id: 'sub',
      header: userType === 'student' ? 'Class' : 'Department',
      accessorKey: 'display_sub',
      cell: info => <span className="text-slate-500">{info.getValue()}</span>,
    },
  ], [userType]);

  const filteredUsers = useMemo(() => {
    if (!globalFilter) return users;

    return users.filter((u) =>
      u.display_name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
      u.display_code?.toLowerCase().includes(globalFilter.toLowerCase())
    );
  }, [users, globalFilter]);

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: {
      rowSelection,
      globalFilter,
    },
    getRowId: row => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const handleDownloadPrint = (action) => {
    if (!generatedBlob) return;
    
    const blobUrl = window.URL.createObjectURL(generatedBlob);
    
    if (action === 'download') {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${docType}_bulk_${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } else if (action === 'print') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }, 500);
        };
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return toast.error('Please select a template');
    const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id);
    if (selectedIds.length === 0) return toast.error('Please select at least one user');

    setIsGenerating(true);
    try {
      const blob = await documentApi.generate({
        template_id: selectedTemplate,
        user_ids: selectedIds,
        user_type: userType
      });
      setGeneratedBlob(blob);
      toast.success(`Successfully generated bulk document`);
    } catch (err) {
      toast.error('Generation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    setRowSelection({});
  }, [selectedGrade, selectedClass, selectedYear, userType]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* {isPending && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white px-6 py-3 rounded-xl shadow-xl">
            Loading...
          </div>
        </div>
      )} */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-indigo-200 shadow-lg">
            <Printer className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Document Generator</h1>
            <p className="text-slate-500 text-sm">Bulk generate ID cards and certificates.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="w-[160px] bg-slate-50 dark:bg-slate-900 border-none shadow-none font-medium">
              <FileType className="w-4 h-4 mr-2 text-indigo-500" />
              <SelectValue placeholder="Doc Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id_card">ID Card</SelectItem>
              <SelectItem value="certificate">Certificate</SelectItem>
            </SelectContent>
          </Select>

          <Select value={userType} onValueChange={(val) => {
            startTransition(() => {
              setUserType(val);
            });
            setRowSelection({}); // Clear selection on type change
          }}>
            <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-900 border-none shadow-none font-medium">
              <Users className="w-4 h-4 mr-2 text-indigo-500" />
              <SelectValue placeholder="User Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>

          {/* Filters */}
          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden lg:block" />

          {userType === 'student' && (
            <>
              <Select value={selectedGrade} onValueChange={(value) => {
                startTransition(() => {
                  setSelectedGrade(value);
                });
              }}>
                <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-900 border-none shadow-none">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {grades.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={selectedClass} onValueChange={(value) => {
                startTransition(() => {
                  setSelectedClass(value);
                });
              }}>
                <SelectTrigger className="w-[140px] bg-slate-50 dark:bg-slate-900 border-none shadow-none">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}

          <Select value={selectedYear} onValueChange={(value) => {
            startTransition(() => {
              setSelectedYear(value);
            });
          }}>
            <SelectTrigger className="w-[160px] bg-slate-50 dark:bg-slate-900 border-none shadow-none">
              <SelectValue placeholder="Academic Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {academicYears.map(y => <SelectItem key={y.id} value={String(y.id)}>{y.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Template Selection */}
        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Step 1: Choose Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredTemplates.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No templates found for this selection.</p>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map(tpl => (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={cn(
                        "p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group",
                        selectedTemplate === tpl.id
                          ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800"
                          : "bg-white border-slate-200 dark:bg-slate-950 dark:border-slate-800 hover:border-indigo-300"
                      )}
                    >
                      <div>
                        <p className={cn("font-medium text-sm", selectedTemplate === tpl.id ? "text-indigo-700" : "text-slate-700")}>{tpl.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{tpl.template_type} Design</p>
                      </div>
                      {selectedTemplate === tpl.id && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {generatedBlob && (
            <Card className="border-green-100 bg-green-50/30 dark:bg-green-900/10 dark:border-green-900/30 shadow-none animate-in zoom-in-95 duration-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Generation Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-xs text-green-600">Successfully generated bulk PDF.</p>
                  <Button variant="outline" size="sm" className="w-full text-green-700 border-green-200 bg-white" onClick={() => handleDownloadPrint('download')}>
                    <Download className="w-3 h-3 mr-2" /> Download Batch
                  </Button>
                  <Button variant="outline" size="sm" className="w-full text-emerald-700 border-emerald-200 bg-white" onClick={() => handleDownloadPrint('print')}>
                    <Printer className="w-3 h-3 mr-2" /> Print Batch
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main: User Selection Table */}
        <div className="lg:col-span-3">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Step 2: Select Users ({table.getSelectedRowModel().rows.length} selected)</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Quick search..."
                  value={globalFilter}
                  onChange={e => setGlobalFilter(e.target.value)}
                  className="pl-9 w-[250px] h-9 bg-slate-50 dark:bg-slate-900 border-none shadow-none"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th key={header.id} className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                    {loadingUsers ? (
                      <tr><td colSpan={4} className="py-12 text-center text-slate-400 italic">Loading records...</td></tr>
                    ) : table.getRowModel().rows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-4 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-slate-400">
                  Showing {table.getPaginationRowModel().rows.length} of {users.length} records
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-700 px-10 shadow-lg shadow-indigo-200 dark:shadow-none"
                  onClick={handleGenerate}
                  disabled={isGenerating || table.getSelectedRowModel().rows.length === 0}
                >
                  {isGenerating ? 'Generating PDFs...' : 'Start Bulk Generation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
