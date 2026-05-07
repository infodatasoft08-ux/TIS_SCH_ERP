// src/pages/finance/FeeTypes.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  DollarSign,
  Tag,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FeeTypes() {
  const [feeTypes, setFeeTypes] = useState([]);
  const [filteredFeeTypes, setFilteredFeeTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState(null);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: ""
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadFeeTypes();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredFeeTypes(feeTypes);
    } else {
      const filtered = feeTypes.filter(feeType =>
        feeType.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feeType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (feeType.description && feeType.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredFeeTypes(filtered);
    }
  }, [searchQuery, feeTypes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  async function loadFeeTypes() {
    setLoading(true);
    try {
      const res = await API.get(`/fee/list/feestype`, {
        params: { limit: 100, offset: 0 }
      });
      setFeeTypes(res.data.fee_types || []);
      setFilteredFeeTypes(res.data.fee_types || []);
    } catch (err) {
      console.error("Failed to load fee types", err);
      toast.error("Failed to load fee types");
    } finally {
      setLoading(false);
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditingFeeType(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await API.post(`/fee/add/feestype`, formData);
      toast.success("Fee type created successfully");
      setDialogOpen(false);
      resetForm();
      loadFeeTypes();
    } catch (err) {
      console.error("Failed to create fee type", err);
      toast.error(err.response?.data?.error || "Failed to create fee type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!editingFeeType) return;

    try {
      await API.put(`/fee/update/feestype/${editingFeeType.id}`, {
        code: editingFeeType.code,
        name: editingFeeType.name,
        description: editingFeeType.description
      });
      toast.success("Fee type updated successfully");
      setEditDialogOpen(false);
      setEditingFeeType(null);
      loadFeeTypes();
    } catch (err) {
      console.error("Failed to update fee type", err);
      toast.error(err.response?.data?.error || "Failed to update fee type");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (feeTypeId) => {
    try {
      await API.delete(`/fee/delete/feestype/${feeTypeId}`);
      toast.success("Fee type deleted successfully");
      loadFeeTypes();
    } catch (err) {
      console.error("Failed to delete fee type", err);
      toast.error(err.response?.data?.error || "Failed to delete fee type");
    }
  };

  const openEditDialog = (feeType) => {
    setEditingFeeType({ ...feeType });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: ""
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  return (
    <div className="p-3 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Types</h1>
          <p className="text-muted-foreground mt-1">
            Manage different types of fees for the institution
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadFeeTypes}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Add New Fee Type</DialogTitle>
                <DialogDescription>
                  Create a new fee type for the institution
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="code" className="text-sm font-medium">Code</label>
                    <Input
                      id="code"
                      name="code"
                      placeholder="e.g., TUITION"
                      value={formData.code}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Tuition Fee"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="description" className="text-sm font-medium">Description</label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Description of the fee type"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Fee Type"}
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
            <DialogTitle>Edit Fee Type</DialogTitle>
            <DialogDescription>
              Update fee type details
            </DialogDescription>
          </DialogHeader>
          {editingFeeType && (
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="edit-code" className="text-sm font-medium">Code</label>
                  <Input
                    id="edit-code"
                    name="code"
                    placeholder="e.g., TUITION"
                    value={editingFeeType.code}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-name" className="text-sm font-medium">Name</label>
                  <Input
                    id="edit-name"
                    name="name"
                    placeholder="e.g., Tuition Fee"
                    value={editingFeeType.name}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-description" className="text-sm font-medium">Description</label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    placeholder="Description of the fee type"
                    value={editingFeeType.description}
                    onChange={handleEditInputChange}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Update Fee Type
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
                placeholder="Search fee types by code or name..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="px-3 py-1">
                <Tag className="h-3 w-3 mr-1" />
                {filteredFeeTypes.length} Fee Types
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fee Types Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Types List</CardTitle>
          <CardDescription>
            All fee types available in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Loading fee types...</p>
            </div>
          ) : filteredFeeTypes.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No fee types found</p>
              <p className="text-sm text-muted-foreground/80 mt-1">
                {searchQuery ? "Try a different search query" : "Click 'Add Fee Type' to create one"}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden xl:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-32">Created</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeeTypes.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((feeType) => (
                      <TableRow key={feeType.id}>
                        <TableCell className="font-mono">
                          <Badge variant="outline" className="font-medium">
                            {feeType.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{feeType.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground max-w-md truncate">
                            {feeType.description || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(feeType.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(feeType)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Fee Type</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{feeType.name}"?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(feeType.id)}
                                    className="bg-red-600 hover:bg-red-700 dark:bg-red-900 dark:text-red-100 dark:hover:bg-red-800"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:hidden">
                {filteredFeeTypes.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((feeType) => (
                  <Card key={feeType.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-lg">{feeType.name}</div>
                      </div>
                      <Badge variant="outline" className="font-medium font-mono">
                        {feeType.code}
                      </Badge>
                    </div>
                    {feeType.description && (
                      <div className="text-sm text-muted-foreground">
                        {feeType.description}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        Created: {formatDate(feeType.created_at)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(feeType)}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Fee Type</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{feeType.name}"?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(feeType.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page</span>
                  <Select
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
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadFeeTypes}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(filteredFeeTypes.length / pageSize) || 1}
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
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredFeeTypes.length / pageSize), p + 1))}
                      disabled={currentPage === Math.ceil(filteredFeeTypes.length / pageSize) || filteredFeeTypes.length === 0}
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