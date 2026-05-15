import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Search, Filter, RefreshCw, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MobileSlidableList } from '@/components/MobileSlidableList';
import { cn } from '@/lib/utils';
import { useActions } from '@/context/ActionContext';

const DataTable = ({
  data = [],
  columns = [],
  title = "",
  description = "",
  isLoading = false,
  onAddNew,
  addButtonText = "Add New",
  enableSearch = true,
  searchPlaceholder = "Search...",
  enableColumnVisibility = true,
  enablePagination = true,
  pageSize = 10,
  emptyMessage = "No data found.",
  className = "",
  // Server-side Pagination Handlers (Web & Mobile)
  serverSidePagination = false,
  currentPage = 1,
  hasMore = false,
  onNextPage = null,
  onPrevPage = null,
  onViewMobile = null,
  onEditMobile = null,
  onDeleteMobile = null,
  onDownloadMobile = null,
  onPromoteMobile = null,
  onSubmissionMobile = null,
  actions: propActions = null,
  onRefresh = null,
  onSearch = null,
  onPageSizeChange = null,
  leftOfSearch = null,
}) => {
  const { currentActions } = useActions();
  const actions = propActions || currentActions || [];

  // State declarations
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [searchValue, setSearchValue] = useState(globalFilter || '');

  // Update searchValue when globalFilter changes from outside
  useEffect(() => {
    setSearchValue(globalFilter);
  }, [globalFilter]);

  // Detect Mobile View
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Memoize columns to prevent unnecessary re-renders
  const memoizedColumns = useMemo(() => columns, [columns]);

  // Memoize data
  const memoizedData = useMemo(() => data, [data]);

  // Initialize table
  const table = useReactTable({
    data: memoizedData,
    columns: memoizedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
    // Debug logging (remove in production)
    debugTable: false,
    debugHeaders: false,
    debugColumns: false,
    onRefresh: onRefresh,
  });

  // Sync pageSize prop with table state
  useEffect(() => {
    if (pageSize) {
      table.setPageSize(pageSize);
    }
  }, [pageSize, table]);

  // Handle search input change
  const handleSearch = (value) => {
    setSearchValue(value);
  };

  const triggerSearch = (value = searchValue) => {
    if (serverSidePagination && onSearch) {
      onSearch(value);
    } else {
      setGlobalFilter(value);
    }
  };

  // Debounced search
  useEffect(() => {
    if (!enableSearch) return;

    const handler = setTimeout(() => {
      // Only trigger automatic debounced search if searchValue is different from current globalFilter
      // or if it's the initial/manual search trigger
      if (searchValue !== globalFilter) {
        triggerSearch(searchValue);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(handler);
  }, [searchValue, enableSearch, globalFilter]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      triggerSearch();
    }
  };

  // Handle row click
  // const handleRowClick = (row) => {
  //   if (onRowClick) {
  //     onRowClick(row.original);
  //   }
  // };

  // Enhanced Mobile Card Component
  const MobileCard = ({ item, row }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Identify special columns for the header
    const imageCol = columns.find(c =>
      c.accessorKey?.toLowerCase().includes('avatar') ||
      c.accessorKey?.toLowerCase().includes('photo') ||
      c.accessorKey?.toLowerCase().includes('image') ||
      c.header?.toString().toLowerCase().includes('photo')
    );

    const nameCol = columns.find(c =>
      c.accessorKey?.toLowerCase() === 'name' ||
      c.accessorKey?.toLowerCase() === 'full_name' ||
      c.header?.toString().toLowerCase().includes('name') ||
      c.accessorKey?.toLowerCase().includes('title') ||
      c.header?.toString().toLowerCase().includes('title')
    );

    const emailCol = columns.find(c =>
      c.accessorKey?.toLowerCase().includes('email') ||
      c.header?.toString().toLowerCase().includes('email')
    );

    const getVal = (col) => {
      if (!col) return null;
      let val = item[col.accessorKey] || item[col.id];
      if (typeof val === 'object' && val !== null) {
        try {
          // If it's a React element or complex object, String() might not be what we want
          // but for simple cases it works. 
          val = String(val);
        } catch (e) { }
      }
      return (val === null || val === undefined) ? '-' : val;
    };

    let imageUrl = getVal(imageCol);

    // Auto-detect image if explicit column isn't found or mapped properly
    if (!imageUrl || imageUrl === '-') {
      const imgKeys = ['profile_picture', 'profile_image', 'user_avatar_url', 'photo', 'image', 'picture', 'logo', 'image_url'];
      for (const key of imgKeys) {
        const val = item[key];
        if (val && typeof val === 'string') {
          if (val.includes('://') || val.startsWith('/') || val.startsWith('data:image') || /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(val)) {
            imageUrl = val;
            break;
          }
        }
      }
    }

    const name = getVal(nameCol);
    const email = getVal(emailCol);

    // Columns for the "Show Details" section (excluding header ones and actions)
    const detailCols = columns.filter(c => {
      const isHeaderCol = c === imageCol || c === nameCol || c === emailCol ||
        c.accessorKey?.toLowerCase().includes('name') ||
        c.accessorKey?.toLowerCase().includes('email') ||
        c.accessorKey?.toLowerCase().includes('avatar');

      return (
        c.id !== 'actions' &&
        c.id !== 'select' &&
        c.header !== 'Actions' &&
        c.accessorKey !== 'actions' &&
        !isHeaderCol
      );
    });

    const actionsCol = columns.find(c =>
      c.id === 'actions' ||
      c.header === 'Actions' ||
      c.accessorKey === 'actions'
    );

    return (
      <div className="flex flex-col w-full">
        {/* Main Card Header: Image, Name, Email */}
        <div className="flex flex-col items-center text-center pb-2">
          {imageUrl && imageUrl !== '-' && (
            <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 border-2 border-primary/10 mb-3 shadow-sm">
              <img
                src={imageUrl}
                alt={String(name)}
                className="h-full w-full object-cover"
                onError={(e) => { e.target.src = "/default-avatar.png"; }}
              />
            </div>
          )}
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
            {String(name !== '-' && name !== 'null' && name !== 'undefined' ? name : (item.name || item.full_name || item.title || 'No Name'))}
          </div>
          {email && email !== '-' && email !== 'null' && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {String(email)}
            </div>
          )}
        </div>

        {/* Collapsed/Details Section */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {detailCols.map((col, idx) => {
                let cell;
                if (row) {
                  cell = row.getVisibleCells().find(c => c.column.id === (col.id || col.accessorKey));
                }

                const val = getVal(col);
                if (val === '-' && !cell) return null;

                let displayContent;
                if (cell) {
                  displayContent = flexRender(cell.column.columnDef.cell, cell.getContext());
                } else {
                  let displayVal = String(val);
                  if ((col.accessorKey?.toLowerCase().includes('created_at') || col.accessorKey?.toLowerCase().includes('date') || col.accessorKey?.toLowerCase().includes('dob') || col.accessorKey?.toLowerCase().includes('updated_at')) && !isNaN(Date.parse(displayVal))) {
                    displayVal = new Date(displayVal).toLocaleDateString();
                  }
                  displayContent = displayVal;
                }

                return (
                  <div key={idx} className="flex flex-col items-center p-2 bg-muted/20 rounded-lg">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 text-center font-bold">
                      {typeof col.header === 'string' ? col.header : (col.id || col.accessorKey)}
                    </span>
                    <div className="text-sm text-gray-900 dark:text-gray-100 font-medium text-center">
                      {displayContent}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions Section */}
        {actionsCol && row && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap justify-center gap-2">
            {flexRender(actionsCol.cell, row.getVisibleCells().find(c => c.column.id === (actionsCol.id || actionsCol.accessorKey))?.getContext() || { row, table, column: actionsCol })}
          </div>
        )}

        {/* Toggle Button */}
        {detailCols.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10"
          >
            {isExpanded ? (
              <>Show Less</>
            ) : (
              <>Show Details</>
            )}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Title, Search, and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row items-start sm:items-center gap-3 w-full">
          {/* Search Input */}
          {(enableSearch || leftOfSearch) && (
            <div className="relative w-full flex flex-col lg:flex-row gap-2">
              {leftOfSearch}
              {enableSearch && (
                <div className="flex w-full lg:w-auto gap-2">
                  <div className="relative w-full lg:w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={searchPlaceholder}
                      value={searchValue ?? ''}
                      onChange={(e) => handleSearch(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pl-10 w-full"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-10 shrink-0"
                    onClick={() => triggerSearch()}
                  >
                    Search
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Column Visibility Toggle */}
          <div className="flex justify-center align-center gap-4">
            {enableColumnVisibility && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10">
                    <Filter className="h-4 w-4 mr-2" />
                    Columns
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) =>
                            column.toggleVisibility(!!value)
                          }
                        >
                          {typeof column.columnDef.header === 'string'
                            ? column.columnDef.header
                            : column.id.replace('_', ' ')}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Add Button */}
            {onAddNew && (
              <Button
                onClick={onAddNew}
                size="sm"
                className="h-10"
              >
                <Plus className="h-3 w-3" />
                {addButtonText}
              </Button>
            )}
          </div>

        </div>
      </div>

      {isMobile ? (
        <MobileSlidableList
          data={table.getRowModel().rows.map(r => r.original)}
          renderItem={(item) => {
            const row = table.getRowModel().rows.find(r => r.original === item);
            return <MobileCard item={item} row={row} />;
          }}
          hasMore={hasMore}
          isLoading={isLoading}
          serverSidePagination={serverSidePagination}
          currentPage={currentPage}
          onNextPage={onNextPage}
          onPrevPage={onPrevPage}
          onView={onViewMobile}
          onEdit={onEditMobile}
          onDelete={onDeleteMobile}
          onDownload={onDownloadMobile}
          onPromote={onPromoteMobile}
          onSubmission={onSubmissionMobile}
          actions={actions}
          onRefresh={onRefresh}
          emptyMessage={globalFilter ? `No results found for "${globalFilter}"` : emptyMessage}
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader className={"bg-[#87a4dc]"}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-2">Loading...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={"cursor-pointer hover:bg-muted/50"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                        // onClick={() => handleRowClick(row)}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (

                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <p className="text-muted-foreground mb-2">
                          {globalFilter
                            ? `No results found for "${globalFilter}"`
                            : emptyMessage
                          }
                        </p>
                        {globalFilter && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => triggerSearch('')}
                          >
                            Clear search
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {enablePagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Showing {table.getRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s)
                {Object.keys(rowSelection).length > 0 && (
                  <span className="ml-2">
                    ({Object.keys(rowSelection).length} selected)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {/* refresh */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => serverSidePagination ? onRefresh && onRefresh() : table.refresh()}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => serverSidePagination ? onPrevPage && onPrevPage() : table.previousPage()}
                  disabled={serverSidePagination ? currentPage === 1 : !table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium">
                  Page {serverSidePagination ? currentPage : table.getState().pagination.pageIndex + 1}
                  {!serverSidePagination && ` of ${table.getPageCount() || 1}`}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => serverSidePagination ? onNextPage && onNextPage() : table.nextPage()}
                  disabled={serverSidePagination ? !hasMore : !table.getCanNextPage()}
                >
                  Next
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page</span>

                  <Select
                    value={table.getState().pagination.pageSize.toString()}
                    onValueChange={(value) => {
                      const newSize = Number(value);
                      table.setPageSize(newSize);
                      if (onPageSizeChange) {
                        onPageSizeChange(newSize);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {[5, 10, 20, 30, 40, 50].map((size) => (
                        <SelectItem key={size} value={size.toString()}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DataTable;