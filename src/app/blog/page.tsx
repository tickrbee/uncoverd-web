import type { Metadata } from "next";
import { BlogIndexView } from "@/components/blog/blog-index-view";
import { getAllPosts } from "@/lib/content";
import { blogIndexMetadata } from "@/lib/blog-meta";

export const metadata: Metadata = blogIndexMetadata("en");

export default function BlogIndexPage() {
  return <BlogIndexView posts={getAllPosts("en")} locale="en" />;
}
