import React, { useEffect, useState } from 'react';
import API from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { 
  CheckCircle, XCircle, Eye, Users, GraduationCap, Briefcase, 
  Layers, RefreshCw, CheckSquare, Search, FileJson
} from 'lucide-react';
import DataTable from '@/widgets/DataTable';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RegisteredRequests() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filters and Pagination
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Custom bulk selection tracked by item ID
  const [selectedIds, setSelectedIds] = useState([]);
  
  // JSON View Modal state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [bulkApproving, setBulkApproving] = useState(false);

  const fetchRequests = async (reset = false, newOffset = offset, newLimit = limit, q = search, t = typeFilter, s = statusFilter) => {
    setIsLoading(true);
    const actualOffset = reset ? 0 : newOffset;
    try {
      const res = await API.get(`/admin/registrations?limit=${newLimit}&offset=${actualOffset}&q=${encodeURIComponent(q)}&type=${t === 'all' ? '' : t}&status=${s === 'all' ? '' : s}`);
      const fetchedData = res.data?.data || [];
      setRequests(fetchedData);
      setTotal(res.data?.total || 0);
      setHasMore(fetchedData.length === newLimit && actualOffset + fetchedData.length < (res.data?.total || 0));
      setOffset(actualOffset);
      setLimit(newLimit);
      if (reset) setSelectedIds([]);
    } catch (err) {
      toast.error('Failed to load registration requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(true);
  }, [typeFilter, statusFilter]);

  const handleSearch = (val) => {
    setSearch(val);
    fetchRequests(true, 0, limit, val, typeFilter, statusFilter);
  };

  const handleNextPage = () => { if (hasMore) fetchRequests(false, offset + limit, limit, search, typeFilter, statusFilter); };
  const handlePrevPage = () => { if (offset >= limit) fetchRequests(false, offset - limit, limit, search, typeFilter, statusFilter); };
  const handlePageSizeChange = (newSize) => { fetchRequests(true, 0, newSize, search, typeFilter, statusFilter); };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSelectAllCurrent = () => {
    const pendingIds = requests.filter(r => r.status === 'pending').map(r => r.id);
    if (selectedIds.length === pendingIds.length && pendingIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const handleApproveSingle = async (id) => {
    setApprovingId(id);
    try {
      const res = await API.put(`/admin/registrations/${id}/approve`);
      toast.success(res.data?.message || 'Registration successfully approved and data migrated!');
      fetchRequests(false);
      if (selectedRequest && selectedRequest.id === id) {
        setIsModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve registration request.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one pending request to approve.');
      return;
    }
    setBulkApproving(true);
    try {
      const res = await API.put('/admin/registrations/bulk-approve', { ids: selectedIds });
      toast.success(res.data?.message || 'Bulk approval complete.');
      setSelectedIds([]);
      fetchRequests(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error during bulk approval execution.');
    } finally {
      setBulkApproving(false);
    }
  };

  const handleRejectOrDelete = async (id, isReject = true) => {
    const actionText = isReject ? 'reject' : 'delete';
    if (!confirm(`Are you sure you want to ${actionText} this request?`)) return;
    try {
      await API.delete(`/admin/registrations/${id}?action=${actionText}`);
      toast.success(`Request ${actionText}ed successfully.`);
      fetchRequests(false);
    } catch (err) {
      toast.error(`Failed to ${actionText} request.`);
    }
  };

  const parseJsonData = (rawData) => {
    if (!rawData) return {};
    if (typeof rawData === 'string') {
      try { return JSON.parse(rawData); } catch(e) { return {}; }
    }
    return rawData;
  };

  const columns = [
    {
      id: 'select',
      header: ({ table }) => (
        <input 
          type="checkbox" 
          onChange={handleSelectAllCurrent}
          checked={requests.length > 0 && requests.filter(r => r.status === 'pending').every(r => selectedIds.includes(r.id))}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
          title="Select all pending on page"
        />
      ),
      cell: ({ row }) => {
        const isPending = row.original.status === 'pending';
        return (
          <input 
            type="checkbox" 
            disabled={!isPending}
            checked={selectedIds.includes(row.original.id)}
            onChange={() => handleToggleSelect(row.original.id)}
            className={`rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 ${isPending ? 'cursor-pointer' : 'opacity-40'}`}
          />
        );
      }
    },
    {
      accessorKey: 'name',
      header: 'Applicant Name',
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-gray-900 dark:text-white">{row.getValue('name')}</div>
          <div className="text-xs text-gray-500">{row.original.email}</div>
        </div>
      )
    },
    {
      accessorKey: 'registration_type',
      header: 'Role Type',
      cell: ({ row }) => {
        const t = row.getValue('registration_type');
        const config = {
          student: { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: GraduationCap },
          teacher: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Briefcase },
          staff: { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Users }
        }[t] || { bg: 'bg-gray-50 text-gray-700 border-gray-200', icon: Layers };
        const Icon = config.icon;
        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${config.bg}`}>
            <Icon className="w-3 h-3" /> {t}
          </span>
        );
      }
    },
    {
      accessorKey: 'phone',
      header: 'Contact / ID',
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.getValue('phone') || 'N/A'}</div>
          {row.original.adhar_no && <div className="text-xs text-gray-400">UID: {row.original.adhar_no}</div>}
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'Approval Status',
      cell: ({ row }) => {
        const s = row.getValue('status');
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase inline-flex items-center gap-1 ${
            s === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
            s === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' :
            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
          }`}>
            {s === 'approved' && <CheckCircle className="w-3 h-3" />}
            {s === 'rejected' && <XCircle className="w-3 h-3" />}
            {s}
          </span>
        );
      }
    },
    {
      accessorKey: 'created_at',
      header: 'Submitted Date',
      cell: ({ row }) => <div className="text-xs font-medium text-gray-600 dark:text-gray-300">{new Date(row.getValue('created_at')).toLocaleDateString()}</div>
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const item = row.original;
        const isPending = item.status === 'pending';
        const isCurrentApproving = approvingId === item.id;

        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline" size="sm" 
              className="h-8 bg-gray-50 hover:bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              onClick={() => { setSelectedRequest(item); setIsModalOpen(true); }}
              title="View Complete Submitted JSON Data"
            >
              <Eye className="w-4 h-4 mr-1 text-blue-600" /> View
            </Button>

            {isPending && (
              <>
                <Button
                  size="sm" 
                  disabled={isCurrentApproving}
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5"
                  onClick={() => handleApproveSingle(item.id)}
                  title="Approve & Migrate to Active System Users"
                >
                  {isCurrentApproving ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  variant="outline" size="sm" 
                  className="h-8 border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5"
                  onClick={() => handleRejectOrDelete(item.id, true)}
                  title="Reject Application"
                >
                  Reject
                </Button>
              </>
            )}
            
            {!isPending && (
              <Button
                variant="ghost" size="sm" 
                className="h-8 text-gray-400 hover:text-red-600"
                onClick={() => handleRejectOrDelete(item.id, false)}
                title="Permanently Delete Record"
              >
                Delete
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  const currentPageNum = Math.floor(offset / limit) + 1;

  // Custom Top Action Component passed to leftOfSearch
  const TopActions = (
    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="h-10 w-[150px] rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="student">Students</SelectItem>
          <SelectItem value="teacher">Teachers</SelectItem>
          <SelectItem value="staff">Staff</SelectItem>
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-10 w-[150px] rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 focus:outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      {selectedIds.length > 0 && (
        <Button
          onClick={handleBulkApprove}
          disabled={bulkApproving}
          className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md animate-bounce-short flex items-center gap-2"
        >
          <CheckSquare className="w-4 h-4" />
          {bulkApproving ? 'Migrating...' : `Bulk Approve (${selectedIds.length})`}
        </Button>
      )}
    </div>
  );

  const parsedModalData = selectedRequest ? parseJsonData(selectedRequest.data) : {};

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-800 via-blue-800 to-purple-800 p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest inline-block mb-2">
              System Migrations Core
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              Registered Applications & Approvals
            </h1>
            <p className="text-blue-100/90 text-sm max-w-xl mt-1">
              Review self-registered public applicants. Approving a request triggers secure transactional SQL insertions into active production child directories.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
            <div className="text-center">
              <div className="text-2xl font-black text-amber-300">{total}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-200">Total Entries</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Datatable Card */}
      <Card className="border-0 shadow-xl overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl">
        <CardContent className="pt-6">
          <DataTable
            data={requests}
            columns={columns}
            title="Public Registration Submissions"
            description="Manage and filter pending student, faculty, and operational staff requests."
            isLoading={isLoading}
            pageSize={limit}
            enableSearch={true}
            searchPlaceholder="Search name, email, phone..."
            hasMore={hasMore}
            serverSidePagination={true}
            currentPage={currentPageNum}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            onSearch={handleSearch}
            onPageSizeChange={handlePageSizeChange}
            onRefresh={() => fetchRequests(true)}
            leftOfSearch={TopActions}
          />
        </CardContent>
      </Card>

      {/* Comprehensive JSON Data View Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 rounded-3xl border-0 shadow-2xl p-6 overflow-hidden">
          <DialogHeader className="border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <FileJson className="w-5 h-5" />
              <span className="text-xs uppercase font-extrabold tracking-widest">Payload Inspector</span>
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-between mt-1">
              <span>{selectedRequest?.name || 'Applicant'} Details</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 font-bold uppercase">
                {selectedRequest?.registration_type}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto pr-2 space-y-4">
            {/* Core Snapshot */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
              <div>
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Submitted Email</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 break-all">{selectedRequest?.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Contact Number</span>
                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{selectedRequest?.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Submission Status</span>
                <span className="text-xs font-bold uppercase text-amber-600">{selectedRequest?.status}</span>
              </div>
            </div>

            {/* Extracted JSON Fields Grid */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3">Extracted Form Payload Data</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.keys(parsedModalData).map((key) => {
                  const val = parsedModalData[key];
                  if (key === 'password_hash') return null; // skip raw hash display
                  return (
                    <div key={key} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3 rounded-xl shadow-xs">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block mt-0.5 whitespace-pre-wrap break-words">
                        {val !== null && val !== undefined && val !== '' ? String(val) : <span className="text-gray-400 italic">Not Provided</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-100 dark:border-gray-800 pt-4 flex items-center justify-between gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">
              Close Viewer
            </Button>
            {selectedRequest?.status === 'pending' && (
              <Button 
                onClick={() => handleApproveSingle(selectedRequest.id)}
                disabled={approvingId === selectedRequest.id}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
              >
                {approvingId === selectedRequest.id ? 'Processing Migration...' : 'Approve & Migrate Applicant'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
