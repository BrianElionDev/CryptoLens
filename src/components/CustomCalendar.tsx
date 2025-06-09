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
      className={`w-full p-2 ${className}`}
      classNames={{
        months: "flex flex-col space-y-3",
        month: "w-full",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-white",
        nav: "space-x-1 flex items-center",
        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 cursor-pointer",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex w-full",
        head_cell:
          "text-gray-400 rounded-md w-8 font-normal text-[0.8rem] text-center",
        row: "flex w-full mt-1",
        cell: "text-center text-sm p-0 relative w-8 [&:has([aria-selected])]:bg-blue-500/10",
        day: "h-8 w-8 p-0 font-normal text-gray-100 hover:bg-gray-700 rounded-md mx-auto cursor-pointer transition-colors",
        day_selected: "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer",
        day_today: "bg-gray-800 text-white cursor-pointer",
        day_outside: "text-gray-500 opacity-50 cursor-pointer",
        day_disabled: "text-gray-500 opacity-50 cursor-not-allowed",
        day_hidden: "invisible",
      }}
    />
  );
}
