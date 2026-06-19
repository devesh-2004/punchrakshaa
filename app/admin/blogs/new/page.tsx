import { BlogForm } from "@/components/admin/BlogForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewBlogPage({ searchParams }: { searchParams: { clone?: string } }) {
  const cloneSlug = searchParams?.clone;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/blogs" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">
          {cloneSlug ? "Duplicate Article" : "Write New Article"}
        </h1>
      </div>
      <BlogForm duplicateSlug={cloneSlug} />
    </div>
  );
}
