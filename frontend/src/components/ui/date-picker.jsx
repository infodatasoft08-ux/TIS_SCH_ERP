"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * DatePicker Component
 * 
 * Displays dates in dd/mm/yyyy format to the user
 * Returns dates in yyyy-mm-dd format for API submission
 * 
 * @param {Date|string} value - The date value (can be Date object or yyyy-mm-dd string)
 * @param {Function} onChange - Callback function that receives yyyy-mm-dd formatted string
 * @param {string} placeholder - Placeholder text (default: "dd/mm/yyyy")
 * @param {boolean} disabled - Whether the input is disabled
 * @param {string} className - Additional CSS classes
 */
export function DatePicker({
    value,
    onChange,
    placeholder = "dd/mm/yyyy",
    disabled = false,
    className,
    ...props
}) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")
    const [selectedDate, setSelectedDate] = React.useState(undefined)
    const [month, setMonth] = React.useState(undefined)

    // Parse the incoming value to a Date object
    React.useEffect(() => {
        if (value) {
            let dateObj

            // If value is already a Date object
            if (value instanceof Date) {
                dateObj = value
            }
            // If value is a string in yyyy-mm-dd format
            else if (typeof value === 'string') {
                // Try parsing yyyy-mm-dd format
                if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                    dateObj = parse(value, 'yyyy-MM-dd', new Date())
                }
                // Try parsing dd/mm/yyyy format
                else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
                    dateObj = parse(value, 'dd/MM/yyyy', new Date())
                }
            }

            if (dateObj && isValid(dateObj)) {
                setSelectedDate(dateObj)
                setMonth(dateObj) // Set the calendar month to the selected date
                setInputValue(format(dateObj, 'dd/MM/yyyy'))
            }
        } else {
            setSelectedDate(undefined)
            setMonth(undefined)
            setInputValue("")
        }
    }, [value])

    // Handle manual input changes
    const handleInputChange = (e) => {
        // Only allow numbers and slashes
        const newValue = e.target.value.replace(/[^\d/]/g, '')
        setInputValue(newValue)

        // Try to parse the input as dd/mm/yyyy
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(newValue)) {
            const parsedDate = parse(newValue, 'dd/MM/yyyy', new Date())
            if (isValid(parsedDate)) {
                setSelectedDate(parsedDate)
                setMonth(parsedDate)
                // Send yyyy-mm-dd format to parent
                onChange(format(parsedDate, 'yyyy-MM-dd'))
            }
        }
    }

    // Handle calendar selection
    const handleSelect = (date) => {
        if (date && isValid(date)) {
            setSelectedDate(date)
            setMonth(date)
            setInputValue(format(date, 'dd/MM/yyyy'))
            // Send yyyy-mm-dd format to parent
            onChange(format(date, 'yyyy-MM-dd'))
            setOpen(false)
        }
    }

    // Handle input blur - validate and format
    const handleBlur = () => {
        if (!inputValue) {
            setSelectedDate(undefined)
            setMonth(undefined)
            onChange("")
            return
        }

        // Try to parse various formats
        let parsedDate

        // Try dd/mm/yyyy
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(inputValue)) {
            const parts = inputValue.split('/')
            const paddedValue = `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`
            parsedDate = parse(paddedValue, 'dd/MM/yyyy', new Date())
        }

        if (parsedDate && isValid(parsedDate)) {
            setSelectedDate(parsedDate)
            setMonth(parsedDate)
            setInputValue(format(parsedDate, 'dd/MM/yyyy'))
            onChange(format(parsedDate, 'yyyy-MM-dd'))
        } else {
            // Invalid date, reset
            setInputValue(selectedDate ? format(selectedDate, 'dd/MM/yyyy') : "")
        }
    }

    // When popover opens, ensure month is set to selected date or current date
    const handleOpenChange = (isOpen) => {
        setOpen(isOpen)
        if (isOpen && !month) {
            setMonth(selectedDate || new Date())
        }
    }

    return (
        <div className={cn("relative flex gap-2", className)}>
            <Input
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                className="pr-10"
                onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setOpen(true)
                    }
                }}
                {...props}
            />
            <Popover open={open} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={disabled}
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2 p-0"
                    >
                        <CalendarIcon className="size-3.5" />
                        <span className="sr-only">Select date</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                >
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleSelect}
                        month={month}
                        onMonthChange={setMonth}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
