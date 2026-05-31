import type { Metadata } from "next";
import { BlogIndexView } from "@/components/blog/blog-index-view";
import { getAllPosts } from "@/lib/content";
import { blogIndexMetadata } from "@/lib/blog-meta";

export const metadata: Metadata = blogIndexMetadata("de");

export default function DeBlogIndexPage() {
  return <BlogIndexView posts={getAllPosts("de")} locale="de" />;
}
