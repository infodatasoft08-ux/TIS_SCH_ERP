// components/ComboboxFormField.jsx
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export const ComboboxFormField = ({
    field,
    fieldState, // Added fieldState
    items = [],
    valueKey = "id",
    labelKey = "name",
    searchKey = "name",
    placeholder = "Select an item...",
    searchPlaceholder = "Search...",
    emptyMessage = "No items found.",
    label = "",
    required = false,
    className = "",
    disabled = false,
}) => {
    const [open, setOpen] = useState(false);
    const error = fieldState?.error; // Get error from fieldState

    const selectedItem = items.find(
        (item) => item[valueKey]?.toString() === field.value?.toString()
    );

    return (
        <div className={cn("space-y-2 flex flex-col", className)}>
            {label && (
                <Label className={cn(error && "text-destructive")}>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between font-normal",
                            !selectedItem && "text-muted-foreground",
                            error && "border-destructive focus-visible:ring-destructive"
                        )}
                    >
                        <span className="truncate">
                            {selectedItem ? selectedItem[labelKey] : placeholder}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                >
                    <Command>
                        <CommandInput
                            className="focus:outline-none"
                            placeholder={searchPlaceholder}
                        />
                        <CommandList>
                            <CommandEmpty>{emptyMessage}</CommandEmpty>
                            <CommandGroup>
                                {items.map((item) => (
                                    <CommandItem
                                        key={item[valueKey]}
                                        value={String(item[searchKey])}
                                        onSelect={() => {
                                            field.onChange(item[valueKey]?.toString());
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value == item[valueKey]
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        <span>{item[labelKey]}</span>
                                    </CommandItem>
                                ))}
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