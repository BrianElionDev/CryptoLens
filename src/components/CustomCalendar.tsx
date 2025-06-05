"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export type CustomCalendarProps = {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
};

export function CustomCalendar({
  selected,
  onSelect,
  disabled,
  className = "",
}: CustomCalendarProps) {
  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
      navLayout="around"
      className={`min-w-[200px] p-3 ${className}`}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-2 sm:space-y-0",
        month: "space-y-2",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "text-center text-sm relative p-0 focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-blue-500/10",
        day: "h-9 w-9 p-0 font-normal text-gray-100 hover:bg-gray-800 rounded-md",
        day_selected: "bg-blue-500 text-white hover:bg-blue-600",
        day_today: "bg-gray-800 text-white",
        day_outside: "text-gray-500 opacity-50",
        day_disabled: "text-gray-500 opacity-50",
        day_hidden: "invisible",
      }}
    />
  );
}
