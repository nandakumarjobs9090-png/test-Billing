
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-card rounded-xl border shadow-md", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4 w-full block", // Force block layout for month
        month_caption: "flex justify-center pt-1 relative items-center h-10 mb-2",
        caption_label: "text-sm font-bold",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 z-10"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 z-10"
        ),
        month_grid: "w-full border-collapse grid grid-cols-1",
        weekdays: "grid grid-cols-7 w-full mb-1",
        weekday: "text-muted-foreground rounded-md font-bold text-[0.7rem] uppercase tracking-widest flex items-center justify-center h-9",
        week: "grid grid-cols-7 w-full mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 flex items-center justify-center mx-auto",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 flex items-center justify-center rounded-lg transition-all hover:bg-primary/10 hover:text-primary"
        ),
        range_start: "day-range-start bg-primary text-primary-foreground rounded-l-lg",
        range_end: "day-range-end bg-primary text-primary-foreground rounded-r-lg",
        range_middle: "aria-selected:bg-accent/10 aria-selected:text-accent-foreground rounded-none",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent/10 text-accent font-bold ring-1 ring-accent/30",
        outside: "day-outside text-muted-foreground opacity-30 aria-selected:bg-accent/20 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
