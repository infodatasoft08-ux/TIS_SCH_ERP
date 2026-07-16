import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, BookOpen, Layers, Edit, PlusCircle, CheckCircle, Loader2, RefreshCw, Trash2, CalendarClock, Globe, Lock, Printer, MoreVertical, FileText, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/auth/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatDate = (dateString) => {
  if (!dateString) return '';
  if (typeof dateString === 'string' && dateString.includes('-')) {
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateString;
};

export default function ExamList({ exams, onAddMarks, onAddExam, onEditExam, onCreateRoutine, onTogglePublish, onToggleResultsPublish, onGenerateConsolidatedMarksheet, deleteExam, hasMore, isLoading, currentPage, onNextPage, onPrevPage, onRefresh, limit = 10, setLimit, total = 0, offset = 0 }) {
  const { user } = useAuth();
  const isTeacher = user?.role_id === 2;

  if (!exams || exams.length === 0) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No exams found</p>
        <Button
          size="sm"
          className="mt-4"
          onClick={() => onAddExam()}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create First Exam
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => onAddExam()} className="bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Exam
        </Button>
      </div>

      {/* Web View: Data Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border bg-white dark:bg-gray-900 shadow-sm mb-6">
        <Table>
          <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
            <TableRow>
              <TableHead className="font-bold">Exam Name</TableHead>
              <TableHead className="font-bold">Grade/Class</TableHead>
              <TableHead className="font-bold">Dates</TableHead>
              <TableHead className="font-bold text-center">Subjects</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => {
              const isOver = exam.status === 'Over';
              const isPublished = exam.status === 'Published';
              const academicSubjectsCount = exam.subjects?.filter(s => {
                const n = s.subject_name?.toLowerCase().trim();
                return !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
              }).length || 0;

              return (
                <TableRow key={exam.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <TableCell className="font-medium text-gray-900 dark:text-gray-100">{exam.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{exam.section_names ? 'Sections' : (exam.class_name ? 'Class' : 'Grade')}</span>
                      {exam.section_names ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {exam.section_names.split(', ').map((sec, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                              {sec}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{exam.class_name || exam.grade_name || "All"}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {exam.start_date && exam.end_date ? `${formatDate(exam.start_date)} - ${formatDate(exam.end_date)}` : formatDate(exam.start_date) || formatDate(exam.end_date) || 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="font-normal">{academicSubjectsCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={isOver ? "secondary" : (isPublished ? "success" : "warning")}>
                      {exam.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {!exam.is_results_published && (
                            <DropdownMenuItem onClick={() => onEditExam(exam)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Exam Details
                            </DropdownMenuItem>
                          )}
                          {!isOver && (
                            <>
                              {/* <DropdownMenuItem onClick={() => onEditExam(exam)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Exam Details
                              </DropdownMenuItem> */}
                              {!isTeacher && (
                                <DropdownMenuItem onClick={() => onTogglePublish(exam)}>
                                  {isPublished ? <Lock className="mr-2 h-4 w-4" /> : <Globe className="mr-2 h-4 w-4" />}
                                  {isPublished ? 'Unpublish Exam' : 'Publish Exam'}
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          <DropdownMenuItem onClick={() => onCreateRoutine(exam)}>
                            <CalendarClock className="mr-2 h-4 w-4" /> Schedule/Routine
                          </DropdownMenuItem>
                          {!exam.is_results_published && (
                            <>
                              <DropdownMenuItem onClick={() => onAddMarks(exam, 'add')} className="text-blue-600 font-medium">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Marks
                              </DropdownMenuItem>
                              {/* <DropdownMenuItem onClick={() => onAddMarks(exam, 'update')} className="text-indigo-600 font-medium">
                                <CheckCircle className="mr-2 h-4 w-4" /> Update Marks
                              </DropdownMenuItem> */}
                            </>
                          )}
                          {isOver && (
                            <>
                              {!isTeacher && (
                                <DropdownMenuItem onClick={() => onToggleResultsPublish(exam)}>
                                  {exam.is_results_published ? <Lock className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                  {exam.is_results_published ? 'Unpublish Results' : 'Publish Results'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1.5 flex items-center justify-between rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 pl-1">Consolidated Statement</span>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40" onClick={(e) => { e.stopPropagation(); onGenerateConsolidatedMarksheet(exam, 'download'); }} title="Download">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40" onClick={(e) => { e.stopPropagation(); onGenerateConsolidatedMarksheet(exam, 'print'); }} title="Print">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                          {exam.status === 'Draft' && (
                            <DropdownMenuItem onClick={() => deleteExam(exam.id)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View: Cards */}
      <div className="grid md:hidden grid-cols-1 gap-6">
        {exams.map((exam, index) => {
          const isOver = exam.status === 'Over';
          const isPublished = exam.status === 'Published';
          const isDraft = exam.status === 'Draft';

          return (
            <Card key={exam.id} className="group hover:shadow-xl transition-all duration-300 flex flex-col h-full border-t-4 border-t-transparent bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 border-x-gray-100 dark:border-x-gray-800 border-b-gray-100 dark:border-b-gray-800 relative overflow-hidden">
              {/* Gradient Top Border */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${isOver ? 'bg-gray-500' : isPublished ? 'bg-green-500' : 'bg-orange-500'}`} />

              <CardHeader className="pb-3 pt-5">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors text-gray-800 dark:text-gray-100" title={exam.name}>
                    {exam.name}
                  </CardTitle>
                  <Badge variant={isOver ? "secondary" : (isPublished ? "success" : "warning")} className="shrink-0 border-0">
                    {exam.status}
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1 font-medium justify-between">
                  <div className="flex items-center">
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                    {exam.start_date && exam.end_date ? `${formatDate(exam.start_date)} to ${formatDate(exam.end_date)}` : exam.start_date ? `Starts: ${formatDate(exam.start_date)}` : exam.end_date ? `Ends: ${formatDate(exam.end_date)}` : 'No Dates'}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-grow text-sm space-y-3 pb-2">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Layers className="mr-2.5 h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="font-semibold text-gray-700 dark:text-gray-200 mr-1.5 shrink-0">{exam.section_names ? 'Sections:' : (exam.class_name ? 'Class:' : 'Grade:')}</span> 
                  {exam.section_names ? (
                    <div className="flex flex-wrap gap-1 ml-1">
                      {exam.section_names.split(', ').map((sec, idx) => (
                        <Badge key={idx} variant="outline" className="text-[10px] h-4 px-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                          {sec}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span>{exam.class_name || exam.grade_name || "All Classes"}</span>
                  )}
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <BookOpen className="mr-2.5 h-4 w-4 text-purple-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-200 mr-1.5">Subjects:</span> {exam.subjects?.filter(s => {
                    const n = s.subject_name?.toLowerCase().trim();
                    return !(n === 'lunch' || n === 'break' || n === 'lunch/break' || n === 'lunch break');
                  }).length || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 bg-gray-100/50 dark:bg-gray-800/50 p-2.5 rounded-md border border-gray-100 dark:border-gray-800">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Note:</span> {exam.note || "None"}
                </div>
              </CardContent>

              <CardFooter className="pt-4 flex flex-col gap-2 w-full">
                <div className="flex flex-col gap-2 w-full">
                  {!exam.is_results_published && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-transparent dark:hover:bg-gray-800 dark:text-gray-200 justify-start"
                      onClick={() => onEditExam(exam)}
                    >
                      <Edit className="mr-2 h-3.5 w-3.5 text-gray-500" />
                      Edit Exam Details
                    </Button>
                  )}

                  {!isOver && !isTeacher && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-transparent dark:hover:bg-gray-800 dark:text-gray-200 justify-start"
                      onClick={() => onTogglePublish(exam)}
                    >
                      {isPublished ? <Lock className="mr-2 h-3.5 w-3.5 text-orange-500" /> : <Globe className="mr-2 h-3.5 w-3.5 text-green-500" />}
                      {isPublished ? 'Unpublish Exam' : 'Publish Exam'}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-transparent dark:hover:bg-gray-800 dark:text-gray-200 justify-start"
                    onClick={() => onCreateRoutine(exam)}
                  >
                    <CalendarClock className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                    Routine / Schedule
                  </Button>

                  {!exam.is_results_published && (
                    <Button
                      size="sm"
                      className="w-full text-xs bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md border-0 justify-start"
                      onClick={() => onAddMarks(exam, 'add')}
                    >
                      <PlusCircle className="mr-2 h-3.5 w-3.5" />
                      Add Marks
                    </Button>
                  )}

                  {isOver && (
                    <>
                      {!isTeacher && (
                        <Button
                          size="sm"
                          className={`w-full text-xs justify-start ${exam.is_results_published ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                          onClick={() => onToggleResultsPublish(exam)}
                        >
                          {exam.is_results_published ? <Lock className="mr-2 h-3.5 w-3.5" /> : <CheckCircle className="mr-2 h-3.5 w-3.5" />}
                          {exam.is_results_published ? 'Unpublish Results' : 'Publish Results'}
                        </Button>
                      )}
                      <div className="flex items-center justify-between w-full p-2 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                        <span className="text-xs font-medium pl-1 text-slate-700 dark:text-slate-300">Consolidated Statement</span>
                        <div className="flex items-center space-x-2">
                          <Button size="icon" variant="outline" className="h-7 w-7 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:hover:bg-indigo-950/30" onClick={(e) => { e.stopPropagation(); onGenerateConsolidatedMarksheet(exam, 'download'); }}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-7 w-7 border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:hover:bg-emerald-950/30" onClick={(e) => { e.stopPropagation(); onGenerateConsolidatedMarksheet(exam, 'print'); }}>
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {exam.status === 'Draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-red-200 dark:border-red-900/50 hover:bg-red-50 text-red-600 dark:hover:bg-red-950/20 justify-start"
                      onClick={() => deleteExam(exam.id)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5 text-red-500" />
                      Delete Exam
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {exams.length > 0 && !isLoading && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 w-full sm:w-auto">
            <p className="text-xs sm:text-sm text-muted-foreground font-medium text-center">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} records
            </p>
            {setLimit && (
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground">Rows per page:</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(val) => setLimit(Number(val))}
                >
                  <SelectTrigger className="h-8 w-[65px] text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
            </Button>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mx-1 sm:mx-2">
              Page {currentPage}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevPage}
              disabled={currentPage === 1}
              className="rounded-xl border-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs sm:text-sm px-2 sm:px-3"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextPage}
              disabled={!hasMore}
              className="rounded-xl border-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs sm:text-sm px-2 sm:px-3"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
