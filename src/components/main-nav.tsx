// Compatibility shim: the original MainNav has been replaced by SiteHeader
// (the new dividend tools mega-menu). Re-exporting here so existing imports
// continue to work without touching every page.
export { SiteHeader as MainNav } from "@/components/site-header";
