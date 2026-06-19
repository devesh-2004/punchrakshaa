import Image from "next/image";

const badges = [
  { id: 1, text: "No Sugar\nAdded", alt: "sugar free herbal product", src: "/images/homepage/sugar_free.svg" },
  { id: 2, text: "100%\nVegetarian", alt: "pure vegetarian herbal formula", src: "/images/homepage/vegetarian.svg" },
  { id: 3, text: "100%\nVegan", alt: "plant based Ayurvedic solution", src: "/images/homepage/vegan.svg" },
  { id: 4, text: "Cruelty\nFree", alt: "cruelty free Ayurvedic health products", src: "/images/homepage/cruelty_free.svg" },
  { id: 5, text: "Gluten\nFree", alt: "gluten free Ayurvedic health products", src: "/images/homepage/gluten_free.svg" },
  { id: 6, text: "Artificial\nColour Free", alt: "natural products with no added colour for safe use", src: "/images/homepage/artificial_colour_free.svg" },
];

export function AyurvedicBadges({ className, heading }: { className?: string; heading?: string }) {
  const defaultHeading = "Powerful Ayurvedic Care for\nComplete Health Support";
  const displayHeading = heading || defaultHeading;

  return (
    <section className={`w-full relative sections-padding overflow-hidden ${className}`}>
      {/* Background Image (Mobile & Desktop) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none bg-[url('/images/homepage/powerful-ingredients.png')] md:bg-[url('/images/homepage/badges-bg-desktop.png')] md:backdrop-blur-sm bg-cover bg-center bg-no-repeat"
      />

      <div className="relative z-10 max-w-[1300px] mx-auto px-4 md:px-6">
        <div className="text-center mb-[30px] md:mb-14">
          <h2 className="font-semibold text-white font-outfit txt-h2-lg whitespace-pre-line max-w-[640px] mx-auto">
            {displayHeading}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-y-8 md:gap-y-0 md:flex md:flex-nowrap justify-between items-center sm:px-4 lg:px-12">
          {badges.map((badge, index) => [
            <div
              key={`badge-${badge.id}`}
              className={`flex items-center justify-center relative group hover:scale-105 transition-transform py-2 md:py-0 ${index % 3 !== 2 ? 'after:content-[""] after:absolute after:right-0 after:top-[10%] after:h-[80%] after:w-[1px] after:bg-white/50 md:after:hidden' : ''
                }`}
            >
              <div className="flex flex-col items-center justify-center gap-[12px] md:gap-[23px] px-1 md:px-0">
                <div className="relative flex items-center justify-center h-[42px] w-[42px] md:h-[64px] md:w-[64px] shrink-0">
                  <Image
                    alt={badge.alt}
                    className="object-contain"
                    fill
                    src={badge.src}
                  />
                </div>
                <p className="font-medium text-white text-center whitespace-pre-line font-outfit txt-p-lg">
                  {badge.text}
                </p>
              </div>
            </div>,
            index !== badges.length - 1 && (
              <div key={`div-${badge.id}`} className="hidden md:block h-[121px] w-[1px] bg-white/50 shrink-0"></div>
            )
          ])}
        </div>
      </div>
    </section>
  );
}
