"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

export function DateTimePicker({ value, onChange, label = "Pick date & time", minTime = "08:00", maxTime = "16:00", minuteStep = 5, required = false }) {
  // Parse the input value (YYYY-MM-DD HH:MM:SS format from MySQL)
  const parseInputValue = (val) => {
    if (!val) return { date: null, hour: "09", minute: "00", period: "AM" };
    
    try {
      // Handle formats like "2026-01-12 21:30:00" or "2026-01-12T21:30:00"
      const dateTimeStr = val.replace('T', ' ');
      const [datePart, timePart] = dateTimeStr.split(' ');
      
      if (!datePart || !timePart) return { date: null, hour: "09", minute: "00", period: "AM" };
      
      const [hours, minutes] = timePart.split(':');
      let h = Number(hours);
      let period = "AM";
      
      // Convert 24-hour to 12-hour format
      if (h >= 12) {
        period = "PM";
        if (h > 12) h -= 12;
      } else if (h === 0) {
        h = 12;
      }
      
      const newDate = new Date(datePart + 'T00:00:00');
      
      // console.log('DateTimePicker parsing:', { val, parsed: { h, minute: String(minutes), period } });
      
      return {
        date: newDate,
        hour: String(h).padStart(2, '0'),
        minute: String(minutes).padStart(2, '0'),
        period: period
      };
    } catch {
      return { date: null, hour: "09", minute: "00", period: "AM" };
    }
  };

  const initialParsed = parseInputValue(value);
  const [date, setDate] = React.useState(initialParsed.date)
  const [hour, setHour] = React.useState(initialParsed.hour)
  const [minute, setMinute] = React.useState(initialParsed.minute)
  const [period, setPeriod] = React.useState(initialParsed.period)

  // Update state when value prop changes (for edit mode)
  React.useEffect(() => {
    const parsed = parseInputValue(value);
    setDate(parsed.date);
    setHour(parsed.hour);
    setMinute(parsed.minute);
    setPeriod(parsed.period);
  }, [value])

  // Convert 12-hour to 24-hour and emit the formatted datetime
  const emitDateTime = React.useCallback((d, h, m, p) => {
    if (!d || !h || !m) return;
    
    let hours24 = Number(h);
    if (p === "PM" && hours24 !== 12) {
      hours24 += 12;
    } else if (p === "AM" && hours24 === 12) {
      hours24 = 0;
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(d.getDate()).padStart(2, '0');
    const formattedHours = String(hours24).padStart(2, '0');
    const formattedMinutes = String(m).padStart(2, '0');
    
    // Format: YYYY-MM-DD HH:MM:SS (MySQL format, 24-hour)
    const dateTimeString = `${year}-${month}-${dayOfMonth} ${formattedHours}:${formattedMinutes}:00`;
    onChange(dateTimeString);
  }, [onChange]);

  const handleDateSelect = (d) => {
    setDate(d);
    emitDateTime(d, hour, minute, period);
  };

  const handleHourChange = (h) => {
    setHour(h);
    emitDateTime(date, h, minute, period);
  };

  const handleMinuteChange = (m) => {
    setMinute(m);
    emitDateTime(date, hour, m, period);
  };

  const handlePeriodChange = (p) => {
    setPeriod(p);
    emitDateTime(date, hour, minute, p);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "MMM dd, yyyy") + " " + `${hour}:${minute} ${period}` : label}
        </Button>
      </PopoverTrigger>

      <PopoverContent side="left" align="center" sideOffset={8} className="w-auto p-4 space-y-4">
        {/* Date */}
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          initialFocus
        />

        {/* Time (shadcn Selects) */}
        <div className="flex gap-2">
          {/* Hour (1-12 for 12-hour format) */}
          <Select value={hour} onValueChange={handleHourChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const h = String(i + 1).padStart(2, "0")
                return <SelectItem key={h} value={h}>{h}</SelectItem>
              })}
            </SelectContent>
          </Select>

          {/* Minute */}
          <Select value={minute} onValueChange={handleMinuteChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 60 }, (_, i) => {
                const m = String(i).padStart(2, "0");
                return <SelectItem key={m} value={m}>{m}</SelectItem>
              })}
            </SelectContent>
          </Select>

          {/* AM/PM */}
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM">AM</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
