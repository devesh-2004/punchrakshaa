import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ButtonBase } from "../ui/ButtonBase";

export function BlogPreviewSection({ posts }: { posts?: { slug: string; title: string; image: string; alt?: string }[] }) {
  const displayPosts = posts ?? [];
  if (displayPosts.length === 0) return null;
  return (
    <section className="w-full bg-[#f2fcf6] border-t border-black sections-padding section-padding-45">
      <div className="px-4 md:px-6">
        <h2 className="mb-[15px] md:mb-[20px] text-center font-semibold text-gray-900 font-outfit txt-h2-lg">
          Informative Health Blog
        </h2>
        <p className="mx-auto pb-[30px] md:pb-[45px] md:max-w-[50%] text-center text-gray-700 font-outfit txt-p-lg">
          Ready to expand your knowledge and inspire your wellness journey? Our blog is a treasure trove of articles designed to educate and motivate you.
        </p>

        <div className="grid grid-cols-1 gap-0  md:gap-[26px] md:grid-cols-2  lg:grid-cols-3">
          {displayPosts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="block overflow-hidden transition mb-[10px] md:mb-[0px]"
            >
              <div className="relative h-[240px] w-full">
                <Image src={p.image} alt={p.alt || p.title} fill className="object-cover" />
              </div>
              <div className="px-[18px] pt-[10px] pb-[20px] md:pb-[0px]">
                <h3 className="font-semibold text-gray-900 font-outfit text-center txt-h3-lg">
                  {p.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-[10px] pb-[15px] md:mb-[0px] md:mt-[45px] flex justify-center">
          <ButtonBase href="/blog" className="flex-none px-[15px] md:px-[22px]">
            READ MORE BLOG
          </ButtonBase>
        </div>
      </div>
    </section>
  );
}

