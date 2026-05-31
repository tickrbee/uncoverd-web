import { tickerOgImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const runtime = "edge";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Dividend stock profile on uncoverd";

export default async function Image({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  return tickerOgImage(
    ticker.toUpperCase(),
    "Dividend yield, ratings, payout history & financials",
  );
}
