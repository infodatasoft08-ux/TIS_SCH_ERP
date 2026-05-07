import React from 'react';
import { SlidableListCard } from './SlidableListCard';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const MobileSlidableList = ({
  data = [],
  renderItem,
  onEdit,
  onDelete,
  onView,
  onDownload,
  onPromote,
  onSubmission,
  actions = [],
  hasMore,
  isLoading,
  serverSidePagination,
  currentPage,
  onNextPage,
  onPrevPage,
  emptyMessage = "No items found.",
  onRefresh = null,
}) => {

  if (data.length === 0 && !isLoading) {
    return (
      <div className="py-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full pb-4">
      {data.map((item, index) => (
        <SlidableListCard
          key={item.id || index}
          onEdit={onEdit ? () => onEdit(item) : undefined}
          onDelete={onDelete ? () => onDelete(item) : undefined}
          onView={onView ? () => onView(item) : undefined}
          onDownload={onDownload ? () => onDownload(item) : undefined}
          onPromote={onPromote ? () => onPromote(item) : undefined}
          onSubmission={onSubmission ? () => onSubmission(item) : undefined}
          actions={actions}
        >
          {renderItem(item)}
        </SlidableListCard>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="py-4 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading...</span>
        </div>
      )}

      {/* Manual Pagination Controls for Mobile */}
      {serverSidePagination && data.length > 0 && !isLoading && (
        <div className="flex items-center justify-between gap-4 mt-6 px-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
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
            size="sm"
            onClick={onNextPage}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
