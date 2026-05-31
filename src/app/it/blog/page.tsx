import type { Metadata } from "next";
import { BlogIndexView } from "@/components/blog/blog-index-view";
import { getAllPosts } from "@/lib/content";
import { blogIndexMetadata } from "@/lib/blog-meta";

export const metadata: Metadata = blogIndexMetadata("it");

export default function ItBlogIndexPage() {
  return <BlogIndexView posts={getAllPosts("it")} locale="it" />;
}
