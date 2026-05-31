import type { Metadata } from "next";
import { BlogIndexView } from "@/components/blog/blog-index-view";
import { getAllPosts } from "@/lib/content";
import { blogIndexMetadata } from "@/lib/blog-meta";

export const metadata: Metadata = blogIndexMetadata("es");

export default function EsBlogIndexPage() {
  return <BlogIndexView posts={getAllPosts("es")} locale="es" />;
}
