import { redirect } from "next/navigation";

// Bare /best-dividend-stocks always lands on the current year's page so
// inbound links don't break when the year rolls over.
export default function BestDividendStocksIndex() {
  redirect(`/best-dividend-stocks/${new Date().getFullYear()}`);
}
