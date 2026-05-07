// components/AdvancedComboboxFormField.jsx
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
import { FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export const AdvancedComboboxFormField = ({
    field,
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
    renderItem = null, // Custom render function for items
    renderSelected = null, // Custom render function for selected value
}) => {
    const [open, setOpen] = useState(false);

    const selectedItem = items.find(
        (item) => item[valueKey]?.toString() === field.value?.toString()
    );

    const getItemLabel = (item) => {
        if (renderItem) return renderItem(item);
        return item[labelKey];
    };

    const getSelectedLabel = () => {
        if (renderSelected && selectedItem) return renderSelected(selectedItem);
        if (selectedItem) return selectedItem[labelKey];
        return placeholder;
    };

    return (
        <FormItem className={cn("flex flex-col", className)}>
            {label && (
                <FormLabel>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <span className="truncate">
                            {getSelectedLabel()}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0 bg-white"
                    style={{
                        width: "var(--radix-popover-trigger-width)"
                    }}
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
                                        value={item[searchKey]}
                                        onSelect={() => {
                                            field.onChange(item[valueKey]?.toString());
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === item[valueKey]?.toString()
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        <span>{getItemLabel(item)}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <FormMessage />
        </FormItem>
    );
};