import Image from "next/image";

const points = [
  {
    key: 'ayurveda',
    alt: 'crafted from 1000 plus years of Ayurvedic knowledge',
    content: <>Crafted from <span className="font-semibold">1000+ years</span><br className="hidden md:block" /> of Ayurvedic knowledge</>,
    img: '/images/homepage/ayurveda 1.svg'
  },
  {
    key: 'ginger',
    alt: 'ayurvedic approach focused on treating root cause',
    content: <>Not Just Relief — <span className="font-semibold">A Root-<br className="hidden md:block" />Cause Approach</span></>,
    img: '/images/homepage/ginger 1.svg'
  },
  {
    key: 'satisfaction',
    alt: 'trusted by 300 plus customers across India',
    content: <>Trusted by <span className="font-semibold">300+<br className="hidden md:block" /> Customers</span> Across India</>,
    img: '/images/homepage/satisfaction 1.svg'
  },
  {
    key: 'quality',
    alt: 'premium Ayurvedic ingredients with strict testing',
    content: <><span className="font-semibold">Pure Ingredients.</span> Strict<br className="hidden md:block" /> Quality Checks.</>,
    img: '/images/homepage/quality 1.svg'
  },
  {
    key: 'refresh',
    alt: 'non habit forming Ayurvedic formula for safe use',
    content: <><span className="font-semibold">Non-Habit</span> Forming<br className="hidden md:block" /> Formula.</>,
    img: '/images/homepage/refresh 1.svg'
  },
  {
    key: 'doctor',
    alt: 'formulated by experienced Ayurvedic professionals',
    content: <>Formulated by <span className="font-semibold">Experienced<br className="hidden md:block" /> Professionals</span></>,
    img: '/images/homepage/doctor 1.svg'
  },
];

function IconSquare() {
  return (
    <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[12px] bg-primary/10">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l3 6 7 .9-5 4.8 1.2 7.1L12 17.8 5.8 20.8 7 13.7 2 8.9 9 8l3-6Z"
          fill="#045830"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}

export function WhyPunchRaksha() {
  return (
    <section className="w-full bg-white sections-padding-90 section-py-0">
      <div className="mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-2 md:gap-16">
          <div className="relative md:grid-cols-5 h-[350px] w-full md:h-[840px]">
            <Image src="/images/homepage/Homepage-content/holistic-ayurvedic-healthcare.webp" alt="natural treatment that focuses on root cause not temporary relief" fill className="object-cover md:object-contain" />
          </div>

          <div className="md:grid-cols-span-7 whypunchraksha">
            <h2 className="mt-[15px] md:mt-0 mb-4 md:mb-6 font-semibold text-center md:text-left text-[#111] font-outfit txt-h2-lg">
              <span className="hidden md:block">Measurable Standards. Visible<br /> Difference.</span>
              <span className="md:hidden">Measurable Standards.<br /> Visible Difference.</span>
            </h2>
            <p className="text-center md:text-left text-[#333] px-4 md:px-0 font-outfit txt-p-lg">
              We create safe and effective Ayurvedic solutions that focus on the root cause, not just temporary relief. Our goal is simple — natural ingredients, proper formulation, and results you can trust.
            </p>
            <hr className="my-8 md:mt-[45px] md:mb-[61px] border-gray-300" />

            <div className="grid grid-cols-2 md:grid-cols-2 gap-x-4 gap-y-10 md:gap-x-8 md:gap-y-12 px-2 md:px-0">
              {points.map((p) => (
                <div key={p.key} className="flex flex-col items-center text-center gap-3 md:flex-row md:items-center md:text-left md:gap-5">
                  <div className="relative h-[65px] w-[65px] shrink-0 md:h-[72px] md:w-[72px]">
                    <Image src={p.img} alt={p.alt} fill className="object-cover sm:object-contain" />
                  </div>
                  <div className="px-1">
                    <p className="text-[#333] font-outfit txt-p-lg">
                      {p.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

