import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import * as blogsRepo from "@/lib/repositories/blog.repository";

export const revalidate = 60; // 1 minute revalidate

export function generateMetadata(): Metadata {
  return {
    title: "Blog | PunchRaksha",
    description: "Informative health blog by PunchRaksha.",
    alternates: { canonical: "/blog" },
  };
}

export default async function BlogPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = parseInt(searchParams.page || "1", 10) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  const total = await blogsRepo.countDocuments();
  const totalPages = Math.ceil(total / limit);

  const posts = await blogsRepo.find({}, { skip, limit });

  return (
    <div className="w-full bg-white">
      <hr />
      <div className="mx-auto max-w-[1920px] px-4 lg:px-[50px] py-[70px]">
        <h1 className="text-center font-outfit txt-h1 font-semibold">
          Blog: Practical Advice for Your Health and Wellbeing
        </h1>
        <p className="mx-auto mt-6 max-w-[800px] text-center font-outfit txt-p">
          Welcome to our blog, your go-to resource for all things health and wellness. Whether you&apos;re looking to start a new fitness routine, follow a balanced diet, or learn more about our proven weight loss program, we have everything you need in one place.
        </p>

        <div className="mt-[60px] grid grid-cols-1 gap-x-[30px] gap-y-[40px] md:grid-cols-2 xl:grid-cols-3">
          {posts.map((p) => {
            const formattedDate = p.publishedAt
              ? new Date(p.publishedAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "";
            const firstTag = p.tags && p.tags.length > 0 ? p.tags[0] : "Ayurveda";
            return (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="mx-auto block w-full max-w-[590px] group">
                <div className="bg-white border border-gray-150 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full">
                  <div className="relative h-[280px] w-full bg-gray-50 overflow-hidden">
                    {p.coverImage ? (
                      <Image
                        src={p.coverImage}
                        alt={p.coverImageAlt || p.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                    {firstTag && (
                      <span className="absolute top-4 left-4 bg-[#045830] text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
                        {firstTag}
                      </span>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    {formattedDate && (
                      <span className="text-xs font-semibold text-[#767676] mb-2 uppercase tracking-widest font-outfit">
                        {formattedDate}
                      </span>
                    )}
                    <h3 className="font-outfit text-[20px] font-bold text-gray-900 group-hover:text-[#045830] transition-colors leading-snug mb-3">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="text-sm text-gray-600 line-clamp-3 font-outfit leading-relaxed mb-4">
                        {p.excerpt}
                      </p>
                    )}
                    <div className="mt-auto pt-2 flex items-center text-sm font-bold text-[#045830] group-hover:text-[#034524] transition-colors gap-1.5 font-outfit">
                      Read Article
                      <span className="transform group-hover:translate-x-1 transition-transform duration-200">
                        →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {posts.length === 0 && (
             <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-20 text-gray-500">
                No blog posts available at the moment.
             </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="mt-[80px] flex items-center justify-center gap-2 font-outfit">
            {page > 1 && (
              <Link href={`/blog?page=${page - 1}`} className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#daefdc] text-[#045830] font-bold hover:bg-[#045830] hover:text-white transition-colors duration-200">
                &lt;
              </Link>
            )}
            
            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const isActive = p === page;
              return (
                <Link
                  key={p}
                  href={`/blog?page=${p}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold transition-colors duration-200 ${isActive ? "bg-[#045830] text-white" : "bg-[#daefdc] text-[#045830] hover:bg-[#045830] hover:text-white"}`}
                >
                  {p}
                </Link>
              );
            })}

            {page < totalPages && (
              <Link href={`/blog?page=${page + 1}`} className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#daefdc] text-[#045830] font-bold hover:bg-[#045830] hover:text-white transition-colors duration-200">
                &gt;
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
