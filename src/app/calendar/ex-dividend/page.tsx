import type { Metadata } from "next";
import { CalendarView, type CalendarSearch } from "@/components/views/calendar-view";

export const metadata: Metadata = {
  title: "Ex-Dividend Calendar",
  description:
    "Upcoming ex-dividend dates, payment dates and amounts for thousands of dividend stocks and ETFs — so you can capture every payout. Updated daily on uncoverd.",
  alternates: { canonical: "/calendar/ex-dividend" },
};

export const dynamic = "force-dynamic";

export default async function ExDividendCalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarSearch>;
}) {
  return <CalendarView locale="en" sp={await searchParams} />;
}
