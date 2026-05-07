import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BulkImport from "./BulkImport";

export default function BulkImportDialog({
    open,
    setOpen,
    importType,
    refreshTable
}) {

    const handleImportComplete = () => {
        if (refreshTable) refreshTable();
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        Bulk Import {importType.charAt(0).toUpperCase() + importType.slice(1)}
                    </DialogTitle>
                </DialogHeader>

                <BulkImport
                    defaultType={importType}
                    disableTypeSelect={true}
                    onImportComplete={handleImportComplete}
                />
            </DialogContent>
        </Dialog>
    );
}