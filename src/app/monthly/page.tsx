import type { Metadata } from "next";
import { MonthlyView, type MonthlySearch } from "@/components/views/monthly-view";

export const metadata: Metadata = {
  title: "Monthly Dividend Stocks",
  description:
    "Stocks and ETFs that pay dividends every month, ranked by yield, payout ratio and uncoverd rating. Build a monthly dividend income stream with reliable payers.",
  alternates: { canonical: "/monthly" },
};

export const dynamic = "force-dynamic";

export default async function MonthlyDividendsPage({
  searchParams,
}: {
  searchParams: Promise<MonthlySearch>;
}) {
  return <MonthlyView locale="en" sp={await searchParams} />;
}
