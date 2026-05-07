import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, BookOpen, Layers, Edit, PlusCircle, CheckCircle, Loader2, RefreshCw, Trash2, CalendarClock, Globe, Lock, Printer, MoreVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ExamList({ exams, onAddMarks, onAddExam, onEditExam, onCreateRoutine, onTogglePublish, onToggleResultsPublish, deleteExam, hasMore, isLoading, currentPage, onNextPage, onPrevPage, onRefresh }) {

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
                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{exam.class_name ? 'Class' : 'Grade'}</span>
                                <span className="text-sm font-medium">{exam.class_name || exam.grade_name || "All"}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {exam.start_date && exam.end_date ? `${exam.start_date} - ${exam.end_date}` : exam.start_date || exam.end_date || 'N/A'}
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
                                        {!isOver && (
                                            <>
                                                <DropdownMenuItem onClick={() => onEditExam(exam)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onTogglePublish(exam)}>
                                                    {isPublished ? <Lock className="mr-2 h-4 w-4" /> : <Globe className="mr-2 h-4 w-4" />}
                                                    {isPublished ? 'Unpublish' : 'Publish'}
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        <DropdownMenuItem onClick={() => onCreateRoutine(exam)}>
                                            <CalendarClock className="mr-2 h-4 w-4" /> Schedule/Routine
                                        </DropdownMenuItem>
                                        {!isOver ? (
                                            <DropdownMenuItem onClick={() => onAddMarks(exam)} className="text-blue-600 font-medium">
                                                <CheckCircle className="mr-2 h-4 w-4" /> Add Marks
                                            </DropdownMenuItem>
                                        ) : (
                                            <>
                                                <DropdownMenuItem onClick={() => onToggleResultsPublish(exam)}>
                                                    {exam.is_results_published ? <Lock className="mr-2 h-4 w-4" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                                    {exam.is_results_published ? 'Unpublish Results' : 'Publish Results'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.print()}>
                                                    <Printer className="mr-2 h-4 w-4" /> Print Marksheet
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {!isOver && (
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
                      {exam.start_date && exam.end_date ? `${exam.start_date} to ${exam.end_date}` : exam.start_date ? `Starts: ${exam.start_date}` : exam.end_date ? `Ends: ${exam.end_date}` : 'No Dates'}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-grow text-sm space-y-3 pb-2">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Layers className="mr-2.5 h-4 w-4 text-indigo-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-200 mr-1.5">{exam.class_name ? 'Class:' : 'Grade:'}</span> {exam.class_name || exam.grade_name || "All Classes"}
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

              <CardFooter className="pt-4 flex flex-col gap-2">
                  <div className="flex w-full gap-2">
                      {!isOver && (
                          <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-transparent dark:hover:bg-gray-800 dark:text-gray-200"
                              onClick={() => onEditExam(exam)}
                          >
                              <Edit className="mr-1.5 h-3.5 w-3.5 text-gray-500" />
                              Edit
                          </Button>
                      )}
                      
                      {!isOver && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-transparent dark:hover:bg-gray-800 dark:text-gray-200"
                            onClick={() => onTogglePublish(exam)}
                        >
                            {isPublished ? <Lock className="mr-1.5 h-3.5 w-3.5 text-orange-500" /> : <Globe className="mr-1.5 h-3.5 w-3.5 text-green-500" />}
                            {isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                      )}

                      {!isOver && (
                          <Button
                              variant="outline"
                              size="sm"
                              className="w-10 px-0 text-xs border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:bg-transparent dark:hover:bg-gray-800 dark:text-gray-200"
                              onClick={() => deleteExam(exam.id)}
                          >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                      )}
                  </div>

                   <div className="flex w-full gap-2">
                      <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => onCreateRoutine(exam)}
                      >
                          <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                          Routine
                      </Button>
                      {!isOver ? (
                          <Button
                              size="sm"
                              className="flex-1 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 border-0"
                              onClick={() => onAddMarks(exam)}
                          >
                              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                              Add Marks
                          </Button>
                      ) : (
                          <div className="flex flex-1 gap-2">
                              <Button
                                  size="sm"
                                  className={`flex-1 text-xs ${exam.is_results_published ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                                  onClick={() => onToggleResultsPublish(exam)}
                              >
                                  {exam.is_results_published ? <Lock className="mr-1.5 h-3.5 w-3.5" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
                                  {exam.is_results_published ? 'Unpublish Results' : 'Publish Results'}
                              </Button>
                              <Button
                                  size="sm"
                                  variant="default"
                                  className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => window.print()}
                              >
                                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                                  Print
                              </Button>
                          </div>
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
        <div className="flex items-center justify-end gap-4 mt-8">
          {/* Refresh */}
          <Button
            variant="outline"
            onClick={onRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
          </Button>
          <Button
            variant="outline"
            onClick={onPrevPage}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {currentPage}
          </div>
          <Button
            variant="outline"
            onClick={onNextPage}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
