import React, { useState } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

export const MultiSelectCombobox = ({
    field,
    fieldState,
    items = [],
    valueKey = "id",
    labelKey = "name",
    searchKey = "name",
    placeholder = "Select items...",
    searchPlaceholder = "Search...",
    emptyMessage = "No items found.",
    label = "",
    required = false,
    className = "",
    disabled = false,
    isLoading = false,
    renderSubLabel = null, // function(item) returns string or node
}) => {
    const [open, setOpen] = useState(false);
    const error = fieldState?.error;

    // field.value should be an array of strings or numbers
    const selectedValues = Array.isArray(field.value) ? field.value.map(String) : [];

    const toggleItem = (id) => {
        const idStr = String(id);
        if (selectedValues.includes(idStr)) {
            field.onChange(selectedValues.filter(val => val !== idStr));
        } else {
            field.onChange([...selectedValues, idStr]);
        }
    };

    const selectAll = () => {
        field.onChange(items.map(item => String(item[valueKey])));
    };

    const deselectAll = () => {
        field.onChange([]);
    };

    return (
        <div className={cn("space-y-2 flex flex-col", className)}>
            {label && (
                <Label className={cn(error && "text-destructive")}>
                    {label} {selectedValues.length > 0 && `(${selectedValues.length} selected)`}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}
            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between h-auto min-h-[20px] py-2 px-3 font-normal",
                            !selectedValues.length && "text-muted-foreground",
                            error && "border-destructive focus-visible:ring-destructive"
                        )}
                    >
                        <div className="flex flex-wrap gap-1 max-w-[90%]">
                            {selectedValues.length > 0 ? (
                                selectedValues.slice(0, 2).map((id) => {
                                    const item = items.find(i => String(i[valueKey]) === id);
                                    return item ? (
                                        <Badge key={id} variant="secondary" className="font-normal">
                                            {item[labelKey]}
                                        </Badge>
                                    ) : null;
                                })
                            ) : (
                                placeholder
                            )}
                            {selectedValues.length > 2 && (
                                <Badge variant="secondary" className="font-normal">
                                    +{selectedValues.length - 2} more
                                </Badge>
                            )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    <Command>
                        <CommandInput
                            className="focus:outline-none"
                            placeholder={searchPlaceholder}
                        />
                        <div className="flex items-center justify-between p-2 border-b">
                            <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-xs">Select All</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={deselectAll} className="text-xs">Deselect All</Button>
                        </div>
                        <CommandList>
                            <CommandEmpty>{isLoading ? "Loading..." : emptyMessage}</CommandEmpty>
                            <CommandGroup>
                                <ScrollArea className="h-64">
                                    {items.map((item) => (
                                        <CommandItem
                                            key={item[valueKey]}
                                            value={String(item[searchKey] || item[labelKey])}
                                            onSelect={() => toggleItem(item[valueKey])}
                                            className="cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2 w-full">
                                                <Checkbox
                                                    checked={selectedValues.includes(String(item[valueKey]))}
                                                    onCheckedChange={() => toggleItem(item[valueKey])}
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{item[labelKey]}</span>
                                                    {renderSubLabel && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {renderSubLabel(item)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </ScrollArea>
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {error && (
                <p className="text-[0.8rem] font-medium text-destructive">
                    {error.message || error}
                </p>
            )}
        </div>
    );
};
