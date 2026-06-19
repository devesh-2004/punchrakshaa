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

        <div className="mt-[60px] grid grid-cols-1 gap-x-[30px] gap-y-[50px] md:grid-cols-2 xl:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="mx-auto block w-full max-w-[590px] group">
              <div className="shadow-none transition-shadow hover:shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
                <div className="relative h-[310px] w-full bg-gray-100">
                  {p.coverImage && <Image src={p.coverImage} alt={p.title} fill className="object-cover" />}
                </div>
              </div>
              <p className="mt-6 text-center font-outfit text-[18px] font-semibold md:text-[20px] text-text-main group-hover:text-[#045830] transition-colors lg:px-4">
                {p.title}
              </p>
            </Link>
          ))}
          {posts.length === 0 && (
             <div className="col-span-1 md:col-span-2 xl:col-span-3 text-center py-20 text-gray-500">
                No blog posts available at the moment.
             </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="mt-[80px] flex items-center justify-center gap-2 font-outfit">
            {page > 1 && (
              <Link href={`/blog?page=${page - 1}`} className="flex h-10 w-10 items-center justify-center bg-[#F3FCEB] text-text-main hover:bg-[#A3D27B]">
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
                  className={`flex h-10 w-10 items-center justify-center font-medium transition-colors ${isActive ? "bg-[#A3D27B] text-white" : "bg-[#F3FCEB] text-text-main hover:bg-[#A3D27B] hover:text-white"}`}
                >
                  {p}
                </Link>
              );
            })}

            {page < totalPages && (
              <Link href={`/blog?page=${page + 1}`} className="flex h-10 w-10 items-center justify-center bg-[#F3FCEB] text-text-main hover:bg-[#A3D27B]">
                &gt;
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
