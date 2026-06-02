"use client";

// Wraps PriceChart and re-denominates the price history into the currency of the
// listing the user picked in the ListingSwitcher. We only have one price series
// (the primary listing's), so for other listings we scale it by the ratio of the
// two listings' current prices — i.e. the implied current cross-rate. The shape
// is identical; the level matches the selected listing's price. (Same-currency
// siblings scale by ~1; cross-currency is a current-rate approximation, not real
// historical FX — good enough for a price chart, no external FX feed needed.)

import { useMemo } from "react";
import { PriceChart, type Point } from "@/components/price-chart";
import { useSelectedListing } from "@/components/listing-selection";

export type ChartListing = {
  symbol: string;
  currency: string | null;
  price: number | null;
};

export function ListingPriceChart({
  data,
  baseSymbol,
  baseCurrency,
  basePrice,
  listings,
}: {
  data: Point[];
  baseSymbol: string;
  baseCurrency: string | null;
  basePrice: number | null;
  listings: ChartListing[];
}) {
  const selected = useSelectedListing(baseSymbol);

  const { series, currency } = useMemo(() => {
    const picked = listings.find((l) => l.symbol === selected);
    // No conversion when we're on the base listing, or we can't compute a ratio.
    if (
      !picked ||
      picked.symbol === baseSymbol ||
      picked.price == null ||
      basePrice == null ||
      basePrice === 0
    ) {
      return { series: data, currency: baseCurrency };
    }
    const ratio = picked.price / basePrice;
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return { series: data, currency: baseCurrency };
    }
    return {
      series: data.map((p) => ({ date: p.date, close: p.close == null ? null : p.close * ratio })),
      currency: picked.currency ?? baseCurrency,
    };
  }, [data, listings, selected, baseSymbol, baseCurrency, basePrice]);

  return <PriceChart data={series} defaultRange="1Y" currency={currency} />;
}
