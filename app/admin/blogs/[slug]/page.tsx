import { BlogForm } from "@/components/admin/BlogForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as blogsRepo from "@/lib/repositories/blog.repository";
import { requireAdmin } from "@/lib/utils/adminAuth";

export default async function EditBlogPage({ params }: { params: { slug: string } }) {
  const admin = await requireAdmin();
  if (!admin) return <div>Unauthorized</div>;

  const blog = await blogsRepo.findBySlug(params.slug);
  if (!blog) return notFound();

  const serialized = JSON.parse(JSON.stringify(blog));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/blogs" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Blog: {blog.title}</h1>
      </div>
      <BlogForm existingBlog={serialized} />
    </div>
  );
}
