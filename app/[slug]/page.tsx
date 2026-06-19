import * as pagesRepo from "@/lib/repositories/contentPage.repository";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";

type Props = {
  params: { slug: string };
};

export const dynamic = "force-dynamic";

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const page = await pagesRepo.findPublishedBySlug(params.slug);

  if (!page) {
    return { title: "Not Found" };
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
  };
}

export default async function DynamicContentPage({ params }: Props) {
  const page = await pagesRepo.findPublishedBySlug(params.slug);

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="mx-auto max-w-4xl bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-4xl md:text-5xl font-bold font-outfit text-gray-900 mb-8 pb-6 border-b">
          {page.title}
        </h1>
        <div 
          className="prose prose-lg max-w-none text-gray-700
                     prose-headings:font-outfit prose-headings:font-semibold prose-headings:text-gray-900
                     prose-a:text-[#045830] hover:prose-a:text-[#034620]
                     prose-img:rounded-xl prose-img:shadow-md"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}
