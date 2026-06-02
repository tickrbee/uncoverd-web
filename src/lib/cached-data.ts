import { unstable_cache } from "next/cache";
import {
  listStocks,
  countStocks,
  listGrowersWithStocks,
  dividendCalendar,
  payoutChanges,
  listEtfsByCategory,
  industriesInSector,
} from "@/lib/data";

// Cached wrappers for the heavy, USER-INDEPENDENT list/calendar/count queries
// the listing views run. The views are force-dynamic (they read premium +
// currency cookies per request), which meant every request re-ran these
// multi-thousand-row scans. unstable_cache memoises the RESULT across requests
// keyed by the call args, so a dynamic render becomes a cache hit + cheap
// per-request premium gating instead of a full DB scan.
//
// IMPORTANT: only wrap functions returning JSON-serializable data (arrays /
// numbers). Map-returning enrichers (getStockRatings/getStockExtras/…) can't be
// cached this way — JSON.stringify turns a Map into {} — so they stay direct.
const OPTS = { revalidate: 300 };

export const cachedListStocks = unstable_cache(listStocks, ["v1:listStocks"], OPTS);
export const cachedCountStocks = unstable_cache(countStocks, ["v1:countStocks"], OPTS);
export const cachedListGrowersWithStocks = unstable_cache(listGrowersWithStocks, ["v1:growers"], OPTS);
export const cachedDividendCalendar = unstable_cache(dividendCalendar, ["v1:dividendCalendar"], OPTS);
export const cachedPayoutChanges = unstable_cache(payoutChanges, ["v1:payoutChanges"], OPTS);
export const cachedListEtfsByCategory = unstable_cache(listEtfsByCategory, ["v1:listEtfsByCategory"], OPTS);
export const cachedIndustriesInSector = unstable_cache(industriesInSector, ["v1:industriesInSector"], OPTS);
