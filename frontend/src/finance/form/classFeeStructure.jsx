// src/pages/finance/ClassFeeStructure.js
import React, { useState, useEffect } from "react";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ComboboxFormField } from "@/widgets/comboboxFormField";
import {
  Plus,
  Search,
  Edit,
  RefreshCw,
  DollarSign,
  School,
  Tag,
  Trash,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ClassFeeStructure() {
  const [feeStructures, setFeeStructures] = useState([]);
  const [filteredStructures, setFilteredStructures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingFeeTypes, setLoadingFeeTypes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [classes, setClasses] = useState([]);
  const [grades, setGrades] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // class_id: "",
    fee_type_ids: [],
    monthly_amount: "",
    grade_id: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadFeeStructures();
    // loadClasses();
    loadFeeTypes();
    loadGrades();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStructures(feeStructures);
    } else {
      const filtered = feeStructures.filter(structure => {
        const gradeName = grades.find(c => c.id === structure.grade_id)?.name || "";
        const feeTypeName = feeTypes.find(f => f.id === structure.fee_type_id)?.name || "";
        return (
          gradeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          feeTypeName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredStructures(filtered);
    }
  }, [searchQuery, feeStructures, grades, feeTypes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  async function loadFeeStructures() {
    setLoading(true);
    try {
      // Note: You'll need to create this API endpoint or modify existing one
      const res = await API.get(`/fee/list/class-structure`);
      setFeeStructures(res.data.fee_structure || []);
      setFilteredStructures(res.data.fee_structure || []);
    } catch (err) {
      console.error("Failed to load fee structures", err);
      toast.error("Failed to load fee structures");
    } finally {
      setLoading(false);
    }
  }

  // async function loadClasses() {
  //   setLoadingClasses(true);
  //   try {
  //     const res = await API.get("/admin/get/classes");
  //     setClasses(res.data.classes || res.data || []);
  //   } catch (err) {
  //     console.error("Failed to load classes", err);
  //     toast.error("Failed to load classes");
  //   } finally {
  //     setLoadingClasses(false);
  //   }
  // }

  // Load grades
  async function loadGrades() {
    setLoadingGrades(true);
    try {
      const response = await API.get("/admin/get/grades");
      setGrades(response.data.grades || []);
    } catch (err) {
      toast.error("Failed to load grades");
    } finally {
      setLoadingGrades(false);
    }
  }


  async function loadFeeTypes() {
    setLoadingFeeTypes(true);
    try {
      const res = await API.get(`/fee/list/feestype`, {
        params: { limit: 100, offset: 0 }
      });
      setFeeTypes(res.data.fee_types || []);
    } catch (err) {
      console.error("Failed to load fee types", err);
      toast.error("Failed to load fee types");
    } finally {
      setLoadingFeeTypes(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingStructure(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await API.post(`/fee/add/class-structure`, {
        // class_id: parseInt(formData.class_id),
        grade_id: parseInt(formData.grade_id),
        fee_type_id: formData.fee_type_ids, // Passing the array
        monthly_amount: parseFloat(formData.monthly_amount)
      });
      toast.success("Fee structure added successfully");
      setDialogOpen(false);
      resetForm();
      loadFeeStructures();
    } catch (err) {
      console.error("Failed to add fee structure", err);
      toast.error(err.response?.data?.error || "Failed to add fee structure");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!editingStructure) return;

    try {
      await API.put(`/fee/update/class-structure/${editingStructure.id}`, {
        monthly_amount: parseFloat(editingStructure.monthly_amount)
      });
      toast.success("Fee structure updated successfully");
      setEditDialogOpen(false);
      setEditingStructure(null);
      loadFeeStructures();
    } catch (err) {
      console.error("Failed to update fee structure", err);
      toast.error(err.response?.data?.error || "Failed to update fee structure");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteFeeStructure = async (id) => {
    if (!confirm("Are you sure you want to delete this fee structure?")) return;

    try {
      await API.delete(`/fee/delete/class-structure/${id}`);
      toast.success("Fee structure deleted successfully");
      loadFeeStructures();
    } catch (err) {
      console.error("Failed to delete fee structure", err);
      toast.error(err.response?.data?.error || "Failed to delete fee structure");
    }
  };

  const openEditDialog = (structure) => {
    setEditingStructure({ ...structure });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      // class_id: "",
      fee_type_ids: [],
      monthly_amount: "",
      months_count: "1",
      period_start: new Date().toISOString().split('T')[0],
      student_ids: [],
      grade_id: ""
    });
  };

  // const getClassName = (classId) => {
  //   const cls = classes.find(c => c.id === classId);
  //   return cls ? cls.name : `Section ${classId}`;
  // };

  const getGradeName = (gradeId) => {
    const cls = grades.find(c => c.id === gradeId);
    return cls ? cls.name : `Class ${gradeId}`;
  };

  const getFeeTypeName = (feeTypeId) => {
    const feeType = feeTypes.find(f => f.id === feeTypeId);
    return feeType ? feeType.name : `Fee Type ${feeTypeId}`;
  };

  const getFeeTypeCode = (feeTypeId) => {
    const feeType = feeTypes.find(f => f.id === feeTypeId);
    return feeType ? feeType.code : `CODE${feeTypeId}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="p-3 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Class Fee Structure</h1>
          <p className="text-muted-foreground mt-1">
            Manage fee structures for different classes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadFeeStructures}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Structure
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Add Class Fee Structure</DialogTitle>
                <DialogDescription>
                  Assign fee types to classes with monthly amounts
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  {/* <div className="space-y-2">
                    <label className="text-sm font-medium">Section</label>
                    <Select 
                      value={formData.class_id} 
                      onValueChange={(value) => handleSelectChange("class_id", value)}
                      disabled={loadingClasses}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id.toString()}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div> */}
                  <ComboboxFormField
                    field={{
                      value: formData.grade_id,
                      onChange: (value) => handleSelectChange("grade_id", value)
                    }}
                    label="Class"
                    required
                    items={grades}
                    valueKey="id"
                    labelKey="name"
                    searchKey="name"
                    disabled={loadingGrades}
                    placeholder="Select a class"
                    searchPlaceholder="Search class..."
                    emptyMessage="No grade found."
                  />
                  <div className="space-y-2 flex flex-col">
                    <label className="text-sm font-medium">Fee Types *</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="justify-between"
                        >
                          {formData.fee_type_ids.length > 0
                            ? `${formData.fee_type_ids.length} fee types selected`
                            : "Select Fee Types"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput className="focus:outline-none" placeholder="Search fee type..." />
                          <CommandList>
                            <CommandEmpty>No fee type found.</CommandEmpty>
                            <CommandGroup>
                              {feeTypes.map(ft => {
                                const checked = formData.fee_type_ids.includes(ft.id);
                                return (
                                  <CommandItem
                                    key={ft.id}
                                    onSelect={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        fee_type_ids: checked
                                          ? prev.fee_type_ids.filter(id => id !== ft.id)
                                          : [...prev.fee_type_ids, ft.id]
                                      }));
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        checked ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {ft.code} - {ft.name}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="monthly_amount" className="text-sm font-medium">Monthly Amount</label>
                    <Input
                      id="monthly_amount"
                      name="monthly_amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.monthly_amount}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adding..." : "Add Structure"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit Fee Structure</DialogTitle>
            <DialogDescription>
              Update monthly amount for fee structure
            </DialogDescription>
          </DialogHeader>
          {editingStructure && (
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Class</label>
                  {/* <div className="p-2 border rounded bg-muted/50">
                    {getClassName(editingStructure.class_id)}
                  </div> */}
                  <div className="p-2 border rounded bg-muted/50">
                    {getGradeName(editingStructure.grade_id)}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fee Type</label>
                  <div className="p-2 border rounded bg-muted/50">
                    {getFeeTypeName(editingStructure.fee_type_id)}
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-monthly_amount" className="text-sm font-medium">Monthly Amount</label>
                  <Input
                    id="edit-monthly_amount"
                    name="monthly_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editingStructure.monthly_amount}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Structure"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Search and Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by class or fee type..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <School className="h-3 w-3 mr-1" />
                {filteredStructures.length} Structures
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Structures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Class Fee Structures</CardTitle>
          <CardDescription>
            Monthly fee amounts by class and fee type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Loading fee structures...</p>
            </div>
          ) : filteredStructures.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No fee structures found</p>
              <p className="text-sm text-muted-foreground/80 mt-1">
                {searchQuery ? "Try a different search query" : "Click 'Add Fee Structure' to create one"}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden xl:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead className="text-right">Monthly Amount</TableHead>
                      <TableHead className="w-32">Created</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStructures.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((structure) => (
                      <TableRow key={structure.id}>
                        <TableCell>
                          {/* <div className="font-medium">{getClassName(structure.class_id)}</div> */}
                          <div className="font-medium">{getGradeName(structure.grade_id)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{getFeeTypeName(structure.fee_type_id)}</div>
                          <div className="text-xs text-muted-foreground">
                            Code: {getFeeTypeCode(structure.fee_type_id)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className="font-bold">{formatCurrency(structure.monthly_amount)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(structure.created_at).toLocaleDateString("en-GB")}
                          </div>
                        </TableCell>
                        <TableCell className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(structure)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteFeeStructure(structure.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:hidden">
                {filteredStructures.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((structure) => (
                  <Card key={structure.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-lg">{getGradeName(structure.grade_id)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-primary">{formatCurrency(structure.monthly_amount)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1 -mb-1">
                      <div>
                        <div className="text-xs text-muted-foreground">Fee Type</div>
                        <div className="font-medium">{getFeeTypeName(structure.fee_type_id)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Code</div>
                        <div><Badge variant="outline">{getFeeTypeCode(structure.fee_type_id)}</Badge></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        {new Date(structure.created_at).toLocaleDateString("en-GB")}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(structure)}
                      >
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteFeeStructure(structure.id)}
                      >
                        <Trash className="h-4 w-4 mr-2" /> Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page</span>
                  {/* <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder={pageSize} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select> */}
                  <select
                    className="h-8 w-[80px] rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadFeeStructures}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(filteredStructures.length / pageSize) || 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredStructures.length / pageSize), p + 1))}
                      disabled={currentPage === Math.ceil(filteredStructures.length / pageSize) || filteredStructures.length === 0}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}