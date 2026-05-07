import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SearchX, Info, ListFilter } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/**
 * ResponsiveDataTable component for displaying data in a table on desktop and cards on mobile.
 * Now supports internal Tabs for multi-section views.
 */
const ResponsiveDataTable = ({
    tabs = [], // [{ value, label, icon, data, columns, renderCard, content, ... }]
    defaultTab,
    onTabChange,
    // Fallback props if tabs are not used
    data: initialData = [],
    columns: initialColumns = [],
    renderCard: initialRenderCard,
    searchKey = 'id',
    searchPlaceholder = "Search...",
    statusKey = 'status',
    statusOptions = [],
    loading = false,
    emptyTitle = "No Data Found",
    emptyDescription = "We couldn't find any results matching your search or filters.",
    onRowClick,
    className,
    forceCards = false, // If true, shows card grid even on desktop
}) => {
    const [activeTab, setActiveTab] = useState(defaultTab || (tabs.length > 0 ? tabs[0].value : null));
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Handle tab change
    const handleTabChange = (val) => {
        setActiveTab(val);
        setSearchQuery('');
        setStatusFilter('all');
        onTabChange?.(val);
    };

    // Get current configuration based on active tab or fallback props
    const currentTab = tabs.find(t => t.value === activeTab);
    const activeData = currentTab ? (currentTab.data || []) : initialData;
    const activeColumns = currentTab ? (currentTab.columns || []) : initialColumns;
    const activeRenderCard = currentTab ? currentTab.renderCard : initialRenderCard;
    const activeSearchKey = currentTab ? (currentTab.searchKey || 'id') : searchKey;
    const activeSearchPlaceholder = currentTab ? (currentTab.searchPlaceholder || "Search...") : searchPlaceholder;
    const activeStatusKey = currentTab ? (currentTab.statusKey || 'status') : statusKey;
    const activeStatusOptions = currentTab ? (currentTab.statusOptions || []) : statusOptions;
    const activeForceCards = currentTab ? (currentTab.forceCards || forceCards) : forceCards;

    const filteredData = useMemo(() => {
        return activeData.filter(item => {
            const val = String(item[activeSearchKey] || '').toLowerCase();
            const matchesSearch = val.includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || item[activeStatusKey] === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [activeData, searchQuery, statusFilter, activeSearchKey, activeStatusKey]);

    const TableSkeleton = () => (
        <div className={cn(activeForceCards ? "hidden" : "hidden md:block")}>
            <Card className="border-none shadow-md ring-1 ring-border">
                <CardContent className="p-0">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-4 border-b last:border-0 flex justify-between">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-8 w-20" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );

    const CardSkeleton = () => (
        <div className={cn(
            "grid grid-cols-1 gap-4",
            activeForceCards ? "md:grid-cols-2 lg:grid-cols-3" : "md:hidden"
        )}>
            {[1, 2, 3].map(i => (
                <Card key={i} className="border-none shadow-md ring-1 ring-border">
                    <CardHeader className="pb-2">
                        <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    if (loading) {
        return (
            <div className="space-y-6">
                {tabs.length > 0 && <Skeleton className="h-10 w-full md:w-96 mb-6" />}
                <div className="space-y-4 animate-pulse">
                    <TableSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        );
    }

    const renderDataTable = () => (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={activeSearchPlaceholder}
                        className="pl-9 h-10 border-muted-foreground/20 focus-visible:ring-primary/30"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {activeStatusOptions.length > 0 && (
                    <div className="flex gap-1 bg-muted/30 p-1 rounded-lg border border-muted-foreground/10 w-full md:w-auto overflow-x-auto no-scrollbar shadow-sm">
                        <Button
                            variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={`h-8 text-xs capitalize whitespace-nowrap px-3 ${statusFilter === 'all' ? 'bg-slate-200 hover:bg-slate-300' : ''}`}
                            onClick={() => setStatusFilter('all')}
                        >
                            All
                        </Button>
                        {activeStatusOptions.map(opt => (
                            <Button
                                key={opt.value}
                                variant={statusFilter === opt.value ? 'secondary' : 'ghost'}
                                size="sm"
                                className={`h-8 text-xs capitalize whitespace-nowrap px-3 ${statusFilter === opt.value ? 'bg-slate-200 hover:bg-slate-300' : ''}`}
                                onClick={() => setStatusFilter(opt.value)}
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Area */}
            {filteredData.length > 0 ? (
                <div className={cn(activeForceCards ? "" : "CardContainer")}>
                    {/* Desktop Table View */}
                    {!activeForceCards && (
                        <Card className="hidden md:block border-none shadow-lg ring-1 ring-border overflow-hidden bg-background/60 backdrop-blur-sm">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/40">
                                        <TableRow className="hover:bg-transparent">
                                            {activeColumns.map((col, idx) => (
                                                <TableHead key={idx} className={cn("text-xs font-bold uppercase tracking-wider", col.headerClassName)}>
                                                    {col.label}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredData.map((item, rowIdx) => (
                                            <TableRow
                                                key={rowIdx}
                                                className={cn(
                                                    "group hover:bg-muted/20 transition-all duration-200 border-b last:border-0",
                                                    onRowClick && "cursor-pointer"
                                                )}
                                                onClick={() => onRowClick?.(item)}
                                            >
                                                {activeColumns.map((col, colIdx) => (
                                                    <TableCell key={colIdx} className={cn("py-4", col.cellClassName)}>
                                                        {col.render ? col.render(item) : item[col.key]}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <CardFooter className="bg-muted/30 border-t border-muted-foreground/10 py-3 flex justify-between items-center text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                <div className="flex items-center gap-1.5">
                                    <Info className="h-3.5 w-3.5 text-primary/60" />
                                    <span>{filteredData.length} records found</span>
                                </div>
                                <span className="opacity-60">Filtered by {statusFilter}</span>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Card List View (Mobile or forced desktop) */}
                    <div className={cn(
                        "grid grid-cols-1",
                        activeForceCards ? "md:grid-cols-2 lg:grid-cols-3 gap-6" : "md:hidden divide-y divide-muted-foreground/10 border-none shadow-lg ring-1 ring-border overflow-hidden bg-background/60 backdrop-blur-sm rounded-xl"
                    )}>
                        {filteredData.map((item, idx) => (
                            <div key={idx} onClick={() => onRowClick?.(item)} className={cn("active:bg-muted/40 transition-colors", !activeForceCards && "bg-background/60")}>
                                {activeRenderCard ? activeRenderCard(item) : (
                                    <div className="p-4 space-y-2">
                                        {activeColumns.map((col, colIdx) => (
                                            <div key={colIdx} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground font-medium">{col.label}:</span>
                                                <span className="font-semibold text-right">{col.render ? col.render(item) : item[col.key]}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {activeForceCards && (
                        <div className="mt-8 flex justify-center border-t border-muted pt-4">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                <Info className="h-4 w-4 text-primary/60" />
                                <span>Showing {filteredData.length} records in card view</span>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-2xl border-2 border-dashed border-muted-foreground/20 animate-in fade-in zoom-in duration-300">
                    <div className="relative mb-4">
                        <SearchX className="h-14 w-14 text-muted-foreground opacity-20" />
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 bg-primary/10 rounded-full p-1"
                        >
                            <Info className="h-4 w-4 text-primary" />
                        </motion.div>
                    </div>
                    <h3 className="text-xl font-bold text-foreground/80">{emptyTitle}</h3>
                    <p className="text-muted-foreground max-w-xs text-center mt-2 px-6 text-sm leading-relaxed">
                        {emptyDescription}
                    </p>
                    {(searchQuery || statusFilter !== 'all') && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSearchQuery(''); setStatusFilter('all') }}
                            className="mt-6 font-semibold hover:bg-primary/5 border-primary/20 hover:border-primary/40 transition-all"
                        >
                            Reset Search & Filters
                        </Button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className={cn("w-full", className)}>
            {tabs.length > 0 ? (
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="mb-8">
                        <TabsList className="bg-muted/40 p-1.5 h-auto flex-wrap justify-start gap-1.5 border border-muted-foreground/10 shadow-sm">
                            {tabs.map((tab) => (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className="data-[state=active]:bg-background data-[state=active]:shadow-md px-4 py-2 transition-all duration-300"
                                >
                                    {tab.icon && <tab.icon className="h-4 w-4 mr-2" />}
                                    <span className="font-semibold text-sm">{tab.label}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                            {tabs.map((tab) => (
                                <TabsContent key={tab.value} value={tab.value} className="mt-0 focus-visible:ring-0">
                                    {tab.content ? tab.content : renderDataTable()}
                                </TabsContent>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                </Tabs>
            ) : (
                renderDataTable()
            )}
        </div>
    );
};

export default ResponsiveDataTable;
