import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostView } from "@/components/blog/blog-post-view";
import { getPost, getPostSlugs } from "@/lib/content";
import { blogPostMetadata } from "@/lib/blog-meta";

export function generateStaticParams() {
  return getPostSlugs("it").map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return blogPostMetadata("it", slug);
}

export default async function ItBlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost("it", slug);
  if (!post) notFound();
  return <BlogPostView post={post} locale="it" />;
}
