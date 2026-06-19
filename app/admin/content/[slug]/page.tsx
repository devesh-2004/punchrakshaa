import { ContentForm } from "@/components/admin/ContentForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as pagesRepo from "@/lib/repositories/contentPage.repository";
import { requireAdmin } from "@/lib/utils/adminAuth";

export default async function EditContentPage({ params }: { params: { slug: string } }) {
  const admin = await requireAdmin();
  if (!admin) return <div>Unauthorized</div>;

  const page = await pagesRepo.findBySlug(params.slug);
  if (!page) return notFound();

  const serialized = JSON.parse(JSON.stringify(page));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/content" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Edit Page: {page.title}</h1>
      </div>
      <ContentForm initialData={serialized} isEdit />
    </div>
  );
}
