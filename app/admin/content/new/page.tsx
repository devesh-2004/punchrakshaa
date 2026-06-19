import { ContentForm } from "@/components/admin/ContentForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewContentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/content" className="p-2 hover:bg-gray-200 rounded-full transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Informational Page</h1>
      </div>
      <ContentForm />
    </div>
  );
}
