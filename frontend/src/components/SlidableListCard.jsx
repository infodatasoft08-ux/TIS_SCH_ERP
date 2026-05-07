import React, { useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Eye, FilePen, Trash2, Download, UserPlus, FileText } from 'lucide-react';

export const SlidableListCard = ({
  children,
  onEdit,
  onDelete,
  onView,
  onDownload,
  onPromote,
  onSubmission,
  actions = [], // ['view', 'edit', 'delete', 'download', 'promote']
  className
}) => {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);

  // Dynamic threshold based on number of left/right actions
  const leftActions = actions.filter(a => ['view', 'edit', 'promote', 'download', 'submission'].includes(a));
  const rightActions = actions.filter(a => ['delete'].includes(a));

  const leftButtonsThreshold = leftActions.length * 70;
  const rightButtonThreshold = rightActions.length * -80;

  const handleDragEnd = (event, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > 40 || velocity > 200) {
      if (leftActions.length > 0) {
        animate(x, leftButtonsThreshold, { type: "spring", bounce: 0, duration: 0.3 });
        setIsOpen(true);
      } else {
        animate(x, 0, { type: "spring", bounce: 0, duration: 0.3 });
        setIsOpen(false);
      }
    } else if (offset < -40 || velocity < -200) {
      if (rightActions.length > 0) {
        animate(x, rightButtonThreshold, { type: "spring", bounce: 0, duration: 0.3 });
        setIsOpen(true);
      } else {
        animate(x, 0, { type: "spring", bounce: 0, duration: 0.3 });
        setIsOpen(false);
      }
    } else {
      animate(x, 0, { type: "spring", bounce: 0, duration: 0.3 });
      setIsOpen(false);
    }
  };

  const close = () => {
    animate(x, 0, { type: "spring", bounce: 0, duration: 0.3 });
    setIsOpen(false);
  };

  const actionConfig = {
    view: { icon: Eye, color: 'emerald', label: 'View', handler: onView },
    edit: { icon: FilePen, color: 'blue', label: 'Edit', handler: onEdit },
    delete: { icon: Trash2, color: 'red', label: 'Delete', handler: onDelete },
    download: { icon: Download, color: 'indigo', label: 'Save', handler: onDownload },
    promote: { icon: UserPlus, color: 'amber', label: 'Promote', handler: onPromote },
    submission: { icon: FileText, color: 'purple', label: 'Submissions', handler: onSubmission },
  };

  return (
    <div className={cn(
      "relative w-full overflow-hidden bg-gray-50 dark:bg-gray-800/50 rounded-xl mb-3 shadow-none select-none",
      className
    )}>
      {/* Background Actions */}
      <div className="absolute inset-0 flex items-center justify-between">
        {/* Left Side Actions */}
        <div className="flex items-center h-full pl-2">
          {leftActions.map(action => {
            const config = actionConfig[action];
            if (!config || !config.handler) return null;
            const Icon = config.icon;
            return (
              <button
                key={action}
                onClick={(e) => { e.stopPropagation(); config.handler(); close(); }}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full font-bold gap-1 transition-colors",
                  action === 'view' ? "rounded-l-xl" : "",
                  `text-${config.color}-600 dark:text-${config.color}-400 hover:bg-${config.color}-50 dark:hover:bg-${config.color}-900/20`
                )}
              >
                <div className={`bg-${config.color}-100 dark:bg-${config.color}-900/30 p-2 rounded-full`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase">{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center h-full pr-2">
          {rightActions.map(action => {
            const config = actionConfig[action];
            if (!config || !config.handler) return null;
            const Icon = config.icon;
            return (
              <button
                key={action}
                onClick={(e) => { e.stopPropagation(); config.handler(); close(); }}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full font-bold gap-1 transition-colors rounded-r-xl",
                  `text-${config.color}-600 dark:text-${config.color}-400 hover:bg-${config.color}-50 dark:hover:bg-${config.color}-900/20`
                )}
              >
                <div className={`bg-${config.color}-100 dark:bg-${config.color}-900/30 p-2 rounded-full`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Foreground Draggable Card */}
      <motion.div
        className="relative bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 w-full z-10"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: rightButtonThreshold, right: leftButtonsThreshold }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
        onClick={() => {
          if (isOpen) {
            close();
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};
