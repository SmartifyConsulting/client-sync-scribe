import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type Locale } from "react-day-picker";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// Custom locale objects for each language using i18n translations
const createLocale = (t: any): Locale => ({
  months: [
    t("calendar.months.january"),
    t("calendar.months.february"),
    t("calendar.months.march"),
    t("calendar.months.april"),
    t("calendar.months.may"),
    t("calendar.months.june"),
    t("calendar.months.july"),
    t("calendar.months.august"),
    t("calendar.months.september"),
    t("calendar.months.october"),
    t("calendar.months.november"),
    t("calendar.months.december"),
  ],
  monthsShort: [
    t("calendar.monthsShort.jan"),
    t("calendar.monthsShort.feb"),
    t("calendar.monthsShort.mar"),
    t("calendar.monthsShort.apr"),
    t("calendar.monthsShort.may"),
    t("calendar.monthsShort.jun"),
    t("calendar.monthsShort.jul"),
    t("calendar.monthsShort.aug"),
    t("calendar.monthsShort.sep"),
    t("calendar.monthsShort.oct"),
    t("calendar.monthsShort.nov"),
    t("calendar.monthsShort.dec"),
  ],
  weekdays: [
    t("calendar.days.sunday"),
    t("calendar.days.monday"),
    t("calendar.days.tuesday"),
    t("calendar.days.wednesday"),
    t("calendar.days.thursday"),
    t("calendar.days.friday"),
    t("calendar.days.saturday"),
  ],
  weekdaysShort: [
    t("calendar.daysShort.sun"),
    t("calendar.daysShort.mon"),
    t("calendar.daysShort.tue"),
    t("calendar.daysShort.wed"),
    t("calendar.daysShort.thu"),
    t("calendar.daysShort.fri"),
    t("calendar.daysShort.sat"),
  ],
  weekdaysNarrow: [
    t("calendar.daysNarrow.s"),
    t("calendar.daysNarrow.m"),
    t("calendar.daysNarrow.t"),
    t("calendar.daysNarrow.w"),
    t("calendar.daysNarrow.t"),
    t("calendar.daysNarrow.f"),
    t("calendar.daysNarrow.s"),
  ],
  firstWeekContainsDate: 4,
});

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const { t } = useTranslation();
  const locale = createLocale(t);

  return (
    <DayPicker
      locale={locale}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-[10px] font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[8px]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-[10px] p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
