"use client";

import { useState, useRef, useEffect } from "react";
import SafeImage from "@/components/common/SafeImage";
import InlineImage from "@/components/ui/InlineImage";

// --- Unified tab renderer (used when product.tabs is populated) ---

function autoTitle(tabName: string, productName: string): string {
  switch (tabName) {
    case "Key Features": return `Key Features of ${productName}`;
    case "Who Should Use": return `Who Should Use ${productName}?`;
    case "Dosage": return `Recommended Dosage of ${productName}`;
    case "Ingredients": return `Ingredients used in ${productName}.`;
    case "Guidelines": return `Guidelines for Using ${productName}`;
    case "How to Use": return `How to Use ${productName}`;
    default: return tabName;
  }
}

function UnifiedTabContent({ tabData, productName, importantNotes }: {
  tabData: { name: string; title: string; items: { text: string; image: string; label: string; altText?: string }[]; note: string };
  productName: string;
  importantNotes?: string[];
}) {
  const title = tabData.title || autoTitle(tabData.name, productName);

  return (
    <div className="animate-fadeIn">
      <h2 className="font-outfit txt-h2 !font-semibold text-[#111] mb-[15px] md:mb-[30px]">
        {title}
      </h2>
      <div className="space-y-[10px] md:space-y-[15px]">
        {tabData.items.map((item, idx) => (
          <div key={idx} className="flex gap-[10px] md:gap-[15px] items-start">
            {item.image ? (
              <InlineImage
                src={item.image}
                alt={item.altText || item.label || ""}
                className="w-[40px] h-[40px] md:w-[52px] md:h-[52px] shrink-0 overflow-hidden"
              />
            ) : (
              <SafeImage
                src="/images/product/right-arrow-green.svg"
                alt="bullet"
                width={19}
                height={19}
                className="mt-[2px] md:mt-[5px] shrink-0"
              />
            )}
            <p className="text-[#121212] txt-p-lg">
              {item.label && <b className="font-semibold">{item.label} </b>}
              <span dangerouslySetInnerHTML={{ __html: item.text }} />
            </p>
          </div>
        ))}
      </div>

      {tabData.note && (
        <div className="mt-[20px] md:mt-[30px] border-t border-t-[#121212] border-opacity-50">
          <p
            className="text-[#121212] txt-p-lg pt-[20px] md:pt-[30px]"
            dangerouslySetInnerHTML={{ __html: tabData.note }}
          />
        </div>
      )}

      {importantNotes && importantNotes.length > 0 && (
        <div className="mt-[20px] md:mt-[30px] pt-[20px] md:pt-[30px] border-t border-t-[#121212] border-opacity-50">
          <h3 className="font-semibold txt-h3-sm mb-[20px]">*Important Information:</h3>
          <div className="space-y-[10px] md:space-y-[15px]">
            {importantNotes.map((note: string, idx: number) => (
              <div key={idx} className="flex gap-[10px] md:gap-[15px] items-start">
                <div className="mt-[4px] md:mt-[7px] shrink-0">
                  <SafeImage
                    src="/images/product/right-arrow-green.svg"
                    alt="bullet"
                    width={19}
                    height={19}
                    className="w-[16px] h-[16px] md:w-[19px] md:h-[19px]"
                  />
                </div>
                <p className="text-[#121212] txt-p-lg">{note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function CheckIcon() {
  return (
    <div className="min-w-[24px] h-[24px] rounded bg-[#5bb37d] flex items-center justify-center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M20 6 9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function HowToUseIcon({ type }: { type: string }) {
  if (type.startsWith("step")) {
    const stepNum = type.replace("step", "");
    return (
      <div className="w-[40px] h-[40px] md:w-[52px] md:h-[52px] rounded-full bg-[#3D8F45] text-white flex items-center justify-center font-bold text-[18px] md:text-[22px] shrink-0">
        {stepNum}
      </div>
    );
  }
  const icons: any = {
    // eslint-disable-next-line @next/next/no-img-element
    beforeBed: <SafeImage src="/images/product/before-bedtime-laxative-churna-consumption.svg" alt="before bed" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    followRecommended: <SafeImage src="/images/product/follow-recommended-dosage-of-laxative-powder.svg" alt="follow recommended" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    mixLaxative: <SafeImage src="/images/product/mix-laxative-powder-with-lukewarm-water.svg" alt="mix laxative" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    naturalMaouthFresh: <SafeImage src="/images/product/natural-mouth-freshener-after-herbal-powder.svg" alt="natural mouth freshner" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    avoidFood: <SafeImage src="/images/product/avoid-food-after-laxative-powder.svg" alt="avoid food" width={52} height={52} />,
  }
  return <div className="w-[40px] h-[40px] md:w-[52px] md:h-[52px] rounded text-white flex items-center justify-center">{icons[type] || icons.beforeBed}</div>;
}


function DosageIcon({ type }: { type: string }) {
  const icons: any = {
    // eslint-disable-next-line @next/next/no-img-element
    quarterSpoon: <SafeImage src="/images/product/quarter-spoon.svg" alt="quarter spoon" className="icons-img" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    halfSpoon: <SafeImage src="/images/product/half-spoon.svg" alt="half spoon" className="icons-img" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    threeQuarterSpoon: <SafeImage src="/images/product/three-quarter-spoon.svg" alt="three quarter spoon" className="icons-img" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    oneSpoon: <SafeImage src="/images/product/one-spoon.svg" alt="one spoon" className="icons-img" width={52} height={52} />,
  };

  return (
    <div className="w-[40px] h-[40px] md:w-[52px] md:h-[52px] rounded text-white flex items-center justify-center">
      {icons[type] || icons.quarterSpoon}
    </div>
  );
}

function GuidelineIcon({ type }: { type: string }) {
  if (type === "bullet") {
    return (
      <div className="w-[40px] h-[40px] md:w-[52px] md:h-[52px] flex items-center justify-center shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <SafeImage src="/images/product/right-arrow-green.svg" alt="bullet" width={19} height={19} />
      </div>
    );
  }
  const icons: any = {
    // eslint-disable-next-line @next/next/no-img-element
    consistentUse: <SafeImage src="/images/product/consistent-use-ayurvedic-constipation-relief-powder.svg" alt="consistent use" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    TakeOnce: <SafeImage src="/images/product/once-daily-use-ayurvedic-laxative-powder.svg" alt="take once" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    consultDoctor: <SafeImage src="/images/product/consult-doctor-if-needed.svg" alt="consult doctor" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    MaintainHydration: <SafeImage src="/images/product/stay-hydrated-for-bowel-regulation.svg" alt="stay hydrated" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    NoSideEffects: <SafeImage src="/images/product/maintain-gap-after-dinner-and-laxative-churna.svg" alt="maintain gap" width={52} height={52} />,
    // eslint-disable-next-line @next/next/no-img-element
    AvoidMilk: <SafeImage src="/images/product/avoid-milk-before-during-after-ayurvedic-stool-softener.svg" alt="avoid milk" width={52} height={52} />,
  };
  return <div className="w-[40px] h-[40px] md:w-[52px] md:h-[52px] rounded text-white flex items-center justify-center">{icons[type] || icons.consistentUse}</div>;
}

// --- Ingredients Tab (handles mobile pagination internally) ---
function IngredientsTab({ product, ingredients }: { product?: any; ingredients: any[] }) {
  const [mobilePage, setMobilePage] = useState(0);
  const totalPages = Math.ceil(ingredients.length / 2);

  const mobileItems = ingredients.slice(mobilePage * 2, mobilePage * 2 + 2);

  const prev = () => setMobilePage((p) => (p <= 0 ? totalPages - 1 : p - 1));
  const next = () => setMobilePage((p) => (p >= totalPages - 1 ? 0 : p + 1));

  return (
    <div className="animate-fadeIn">
      <div className="pb-[20px] md:pb-[30px]">
        <h2 className="font-outfit txt-h2  md:txt-h2 !font-semibold text-[#111] mb-[15px] md:mb-[30px]">
          Ingredients used in {product?.name || "PunchRaksha piles medicine"}.
        </h2>
        <p className="text-[#121212] txt-p-lg">
          PunchRaksha is a potent blend of 100% natural and herbal ingredients, and designed to address the underlying causes of digestive distress and eliminate piles from the roots.
        </p>
      </div>

      {/* Mobile: show 2 items per page */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 min-h-[220px]">
          {mobileItems.map((ing: any, idx: number) => (
            <div key={idx} className="flex flex-col items-center text-center ingredient-px">
              <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-[4px] border-[#eaf5ef] shadow-sm mb-[10px]">
                {ing.image ? (
                  <SafeImage src={ing.image} alt={ing.name} width={100} height={100} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#f5fbf8]" />
                )}
              </div>
              <h3 className="txt-h3-sm mb-0.5">{ing.name}</h3>
              <p className="txt-p text-[#121212]">{ing.description}</p>
            </div>
          ))}
        </div>

        {/* Mobile Navigation Arrows (same style as BestSelling) */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-[20px]">
            <button
              onClick={prev}
              className="flex h-[43px] w-[50px] items-center justify-center bg-[#A4D25E]/15 text-[#045830] active:scale-95 py-[14.5px] px-[21.5px] transition-transform"
              aria-label="Previous ingredients"
            >
              <SafeImage src="/images/homepage/left-arrow-m.svg" alt="Left Arrow" width={14} height={7} />
            </button>
            <button
              onClick={next}
              className="flex h-[43px] w-[50px] items-center justify-center bg-[#A4D25E] text-[#000] active:scale-95 py-[14.5px] px-[21.5px] transition-transform"
              aria-label="Next ingredients"
            >
              <SafeImage src="/images/homepage/right-arrow-m.svg" alt="Right Arrow" width={14} height={7} />
            </button>
          </div>
        )}
      </div>

      {/* Desktop: show all in 3-column grid (unchanged) */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-[30px]">
        {ingredients.map((ing: any, idx: number) => (
          <div key={idx} className="flex flex-col items-center text-center ingredient-px">
            <div className="w-[135px] h-[135px] rounded-full overflow-hidden border-[4px] border-[#eaf5ef] shadow-sm mb-[10px] md:mb-[15px]">
              {ing.image ? (
                <SafeImage src={ing.image} alt={ing.name} width={135} height={135} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#f5fbf8]" />
              )}
            </div>
            <h3 className="txt-h3-sm md:mb-[5px] ">{ing.name}</h3>
            <p className="txt-p leading-[25px] text-[#121212]">{ing.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductTabs({ product, className = "" }: { product?: any, className?: string }) {
  const [activeTab, setActiveTab] = useState("Key Features");
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const hasTabs = Array.isArray(product?.tabs) && product.tabs.length > 0;
  const getTabData = (name: string) => product?.tabs?.find((t: any) => t.name === name);

  // Ingredients always come from the dedicated product.ingredients field
  const hasIngredients = (product?.ingredients?.length ?? 0) > 0;

  const visibleTabs = hasTabs
    ? [
        ...product.tabs
          .filter((t: any) => t.items?.length > 0 && t.name !== "Ingredients")
          .map((t: any) => t.name as string),
        ...(hasIngredients ? ["Ingredients"] : []),
        "Product Info",
      ]
    : [
        "Key Features",
        "Who Should Use",
        ...(product?.dosageInstructions?.length > 0 ? ["Dosage"] : []),
        ...(hasIngredients ? ["Ingredients"] : []),
        "Guidelines",
        "Product Info",
        ...(product?.howToUse?.length > 0 ? ["How to Use"] : []),
      ];

  // If the active tab is no longer in the visible list (e.g., product changed), reset to first tab
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab("Key Features");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?._id]);

  // Check if tabs container can scroll left/right
  const checkScroll = () => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    const current = tabsRef.current;
    if (current) {
      current.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (current) {
        current.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      }
    };
  }, []);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const benefits = product?.benefits?.length ? product.benefits : [
    "Helps in controlling bleeding",
    "Facilitates a Smooth Morning Routine Without Fear of Bleeding",
    "Regulates the Digestion to Stop the Root Cause of Constipation",
    "Strengthens Your Weak Veins From the Inside to Stop Them From Swelling Again.",
    "Soothes the Burning Sensation and Irritation",
    "Reduces the Piles Mass/Lump",
    "Regenerates Damaged Skins and Small Cuts",
  ];

  const whoShouldUse = product?.whoShouldUse?.length ? product.whoShouldUse : [
    "Individuals with mild, moderate, severe, or chronic constipation can use PunchRaksha constipation relief powder.",
    "Suitable for those experiencing hyperacidity, gas, bloating, or indigestion",
    "Also beneficial for individuals unable to meet their daily fiber needs through food or fiber supplements.",

  ];

  const ingredients = product?.ingredients?.length ? product.ingredients : [
    { name: "Surana", description: "Improves digestion and reduces the size of fleshy projections." },
    { name: "Daruharidra", description: "Helps reduce infection and swelling in the anal region." },
    { name: "Nagakesara", description: "Controls excessive bleeding associated with hemorrhoids." },
    { name: "Lodhra", description: "Strengthens the skin tissues and reduces the inflammation of the affected area." },
  ];

  const dosage = product?.dosageInstructions?.length ? product.dosageInstructions : [
    { icon: "capsule", text: "Recommended Dosage: Take 1 piles relief tablet once daily, or as advised by your healthcare professional." },
    { icon: "clock", text: "When to Take: Best after lunch to support better absorption and effective care." },
    { icon: "question", text: "How to Take: Swallow with lukewarm water. Do not chew, break, or crush." },
    { icon: "hourglass", text: "Usage Duration: Continue regularly as directed for long-term piles relief." },
  ];

  const guidelines = product?.guidelines?.length ? product.guidelines : [
    { icon: "recycle", text: "Consistency is Key: Use regularly for 1–2 months to support management." },
    { icon: "water", text: "Stay Hydrated: Drink 3.5 liters daily for best results in piles relief." },
    { icon: "doctor", text: "Professional Advice: Consult a professional if you have any medical condition." },
  ];

  const productDetails = product?.productDetails || {
    brand: "PunchRaksha",
    shelfLife: "18–24 months",
    dosageForm: "Tablet",
    netQuantity: "30 Tablets per bottle",
    fullDescription: "PunchRaksha’s piles relief medicine is a holistic, 100% Ayurvedic formula designed to provide long-term relief from piles, and fissures."
  };

  const howToUse = product?.howToUse || [
    { icon: "capsule", text: "Recommended Dosage: Take 1 piles relief tablet once daily, or as advised by your healthcare professional." },
    { icon: "clock", text: "When to Take: Best after lunch to support better absorption and effective care." },
    { icon: "question", text: "How to Take: Swallow with lukewarm water. Do not chew, break, or crush." },
    { icon: "hourglass", text: "Usage Duration: Continue regularly as directed for long-term piles relief." },
  ];

  const renderContent = () => {
    // Ingredients always render from product.ingredients (dedicated field)
    if (activeTab === "Ingredients") {
      return <IngredientsTab product={product} ingredients={product?.ingredients || []} />;
    }

    // New unified renderer — used when product.tabs is populated
    if (hasTabs && activeTab !== "Product Info") {
      const tabData = getTabData(activeTab);
      if (tabData) {
        return (
          <UnifiedTabContent
            tabData={tabData}
            productName={product?.name || "PunchRaksha"}
            importantNotes={product?.importantNotes}
          />
        );
      }
    }

    // Legacy fallback rendering (old field structure)
    switch (activeTab) {
      case "Key Features":
        return (
          <div className="animate-fadeIn">
            <h2 className="font-outfit txt-h2  md:txt-h2 !font-semibold text-[#111] mb-[15px] md:mb-[30px]">
              Key Features of {product?.name || "PunchRaksha"}
            </h2>
            <div className="space-y-[10px] md:space-y-[15px]">
              {benefits.map((b: string) => (
                <div key={b} className="flex gap-[10px] md:gap-[15px] items-start md:items-start">
                  <SafeImage src="/images/product/right-arrow-green.svg" alt="right-arrow-green" width={19} height={19} className="mt-[2px] md:mt-[0.313rem]" />
                  <p className="font-outfit txt-p-lg font-normal">{b}</p>
                </div>
              ))}
            </div>
            {/* Recommended Dosage Note */}
            {product?.recommendedBenefitsNote && (
              <div className="mt-[20px] md:mt-[30px] border-t border-t-[#121212] border-opacity-50">
                <p className="text-[#121212] txt-p-lg pt-[20px] md:pt-[30px]">
                  {product.recommendedBenefitsNote.startsWith("*Recommended:") ? (
                    <>
                      <b className="font-semibold">*Recommended:</b>
                      {product.recommendedBenefitsNote.substring(13)}
                    </>
                  ) : (
                    "Experience softer stools and improved bowel movement with PunchRaksha plant-based strong laxative today."
                  )}
                </p>
              </div>
            )}
          </div>
        );
      case "Who Should Use":
        return (<div className="animate-fadeIn">
          <h2 className="font-outfit txt-h2  md:txt-h2 !font-semibold text-[#111] mb-[15px] md:mb-[30px]">
            Who Should Use {product?.name || "PunchRaksha"}?
          </h2>
          <div className="space-y-[10px] md:space-y-[15px]">
            {whoShouldUse.map((b: string) => (
              <div key={b} className="flex gap-[10px] md:gap-[15px] items-start md:items-start">
                <SafeImage src="/images/product/right-arrow-green.svg" alt="right-arrow-green" width={19} height={19} className="mt-[2px] md:mt-[9px]" />
                <p className="text-[#121212] txt-p-lg">{b}</p>
              </div>
            ))}
          </div>
          {/* Recommended Dosage Note */}
          {product?.recommendedWhoShouldUseNote && (
            <div className="mt-[20px] md:mt-[30px] border-t border-t-[#121212] border-opacity-50">
              <p className="text-[#121212] txt-p-lg pt-[20px] md:pt-[30px]">
                {product.recommendedWhoShouldUseNote.startsWith("*Recommended:") ? (
                  <>
                    <b className="font-semibold">*Recommended:</b>
                    {product.recommendedWhoShouldUseNote.substring(13)}
                  </>
                ) : (
                  "Experience soft stools and improved bowel movement with PunchRaksha plant-based strong laxative today."
                )}
              </p>
            </div>
          )}
        </div>)
      case "Ingredients":
        return (
          <IngredientsTab product={product} ingredients={ingredients} />
        );
      case "Dosage":
        return (
          <div className="animate-fadeIn">
            <h2 className="font-outfit txt-h2  md:txt-h2 !font-semibold text-[#111] mb-[15px] md:mb-[30px]">
              Recommended Dosage of {product?.name || "PunchRaksha"}
            </h2>
            <div className="space-y-5 border-b border-[#eaf5ef]">
              {dosage.map((item: any, idx: number) => {
                const parts = item.text.split(": ");
                const label = item.label;
                const content = parts.length > 1 ? parts[1] : item.text;
                return (
                  <div key={idx} className="flex gap-[0.938rem] md:gap-[1.25rem] items-start">
                    <div className="shrink-0 pt-[2px] md:pt-[3px]">
                      <DosageIcon type={item.icon} />
                    </div>
                    <p className="text-[#121212] txt-p-lg">
                      {label && <b className="font-semibold">{label} </b>}{content}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Recommended Dosage Note */}
            {product?.recommendedDosageNote && (
              <div className="mt-[20px] md:mt-[30px] border-t border-t-[#121212] border-opacity-50">
                <p className="text-[#121212] txt-p-lg pt-[20px] md:pt-[30px]">
                  {product.recommendedDosageNote.startsWith("*Recommended:") ? (
                    <>
                      <b className="font-semibold">*Recommended:</b>
                      {product.recommendedDosageNote.substring(13)}
                    </>
                  ) : (
                    product.recommendedDosageNote
                  )}
                </p>
              </div>
            )}

          </div>
        );
      case "Guidelines":
        return (
          <div className="animate-fadeIn">
            <h2 className="font-outfit txt-h2 !font-semibold text-[#111] mb-[15px] md:mb-[30px]">
              Guidelines for Using {product?.name || "PunchRaksha"}
            </h2>
            <div className="space-y-5">
              {guidelines.map((item: any, idx: number) => {
                const parts = item.text.split(": ");
                const label = item.label;
                const content = parts.length > 1 ? parts[1] : item.text;
                return (
                  <div key={idx} className="flex gap-[0.938rem] md:gap-[1.25rem] items-start">
                    <div className="mt-[4px] md:mt-[5px]">
                      <GuidelineIcon type={item.icon} />
                    </div>
                    <p className="text-[#121212] txt-p-lg">
                      {label && <b className="font-semibold">{label}: </b>}{content}
                    </p>
                  </div>
                );
              })}
              <div className="mt-[20px] md:!mt-[30px] pt-[20px] md:pt-[30px] border-t border-t-[#121212] border-opacity-50">
                <h3 className="font-semibold txt-h3-sm mb-[20px]">*Important Information:</h3>
                <div className="space-y-[10px] md:space-y-[15px]">
                  {(product?.importantNotes?.length ? product.importantNotes : [
                    "Do not exceed recommended dosage.",
                    "Not for children below 12, pregnant/lactating women."
                  ]).map((note: string) => (
                    <div key={note} className="flex gap-[10px] md:gap-[15px] items-start md:items-start">
                      <div className="mt-[4px] md:mt-[7px] shrink-0">
                        <SafeImage
                          src="/images/product/right-arrow-green.svg"
                          alt="right-arrow-green"
                          width={19}
                          height={19}
                          className="w-[16px] h-[16px] md:w-[19px] md:h-[19px]"
                        />
                      </div>
                      <p className="text-[#121212] txt-p-lg">{note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case "Product Info":
        return (
          <div className="animate-fadeIn">
            <h2 className="font-outfit txt-h2 !font-semibold text-[#111] mb-[15px] md:mb-[30px]">
              {(productDetails as any).tabTitle || `About ${product?.name || "PunchRaksha"}`}
            </h2>

            <div className="space-y-[15px] md:space-y-[20px] text-[#121212]">

              <p className="txt-p-lg"><b className="font-semibold">Brand:</b> {productDetails.brand || "PunchRaksha"}</p>

              <p className="txt-p-lg"><b className="font-semibold">Product:</b> {(productDetails as any).productLabel || product?.name || "Piles Relief Tablet"}</p>

              {productDetails.fullDescription && (
                <p className="txt-p-lg"><b className="font-semibold">Description: </b>
                  {productDetails.fullDescription}
                </p>
              )}

              <p className="txt-p-lg"><b className="font-semibold">Shelf Life:</b> {productDetails.shelfLife}</p>

              <p className="txt-p-lg"><b className="font-semibold">Dosage Form:</b> {productDetails.dosageForm}</p>

              <p className="txt-p-lg"><b className="font-semibold">Net Quantity:</b> {productDetails.netQuantity}</p>

              {(productDetails as any).taste && (
                <p className="txt-p-lg"><b className="font-semibold">Taste:</b> {(productDetails as any).taste}</p>
              )}

              {(productDetails as any).bestTimeToConsume && (
                <p className="txt-p-lg"><b className="font-semibold">Best Time to Consume:</b> {(productDetails as any).bestTimeToConsume}</p>
              )}

              {(productDetails as any).expectedReliefTime && (
                <p className="txt-p-lg"><b className="font-semibold">Expected Relief Time:</b> {(productDetails as any).expectedReliefTime}</p>
              )}

              {(productDetails as any).includedProducts && (
                <p className="txt-p-lg"><b className="font-semibold">Included Products:</b> {(productDetails as any).includedProducts}</p>
              )}

            </div>
          </div>
        );
      case "How to Use":
        return (
          <div className="animate-fadeIn">
            <h2 className="font-outfit txt-h2  md:txt-h2 !font-semibold text-[#111] mb-[15px] md:mb-[30px]">
              How to Use {product?.name || "PunchRaksha"}
            </h2>
            <div className="space-y-5 border-b border-[#eaf5ef]">
              {howToUse.map((item: any, idx: number) => {
                const parts = item?.text?.split(": ") || [];
                const label = item?.label || "";
                const content = parts.length > 1 ? parts[1] : item.text;
                return (
                  <div key={idx} className="flex gap-[0.938rem] md:gap-[1.25rem] items-start  md:items-start">
                    <div className="mt-[5px] md:mt-[5px]">
                      <HowToUseIcon type={item.icon} />
                    </div>
                    <p className="font-outfit txt-p-lg font-normal">
                      {label && <b className="font-semibold">{label} </b>}{content}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Recommended Dosage Note */}
            {product?.recommendedHowtoUse && (
              <div className="mt-[20px] md:mt-[30px] border-t border-t-[#121212] border-opacity-50">
                <p className="text-[#121212] txt-p-lg pt-[20px] md:pt-[30px]">
                  {product.recommendedHowtoUse.startsWith("*Recommended:") ? (
                    <>
                      <b className="font-semibold">*Recommended:</b>
                      {product.recommendedHowtoUse.substring(13)}
                    </>
                  ) : (
                    product.recommendedHowtoUse
                  )}
                </p>
              </div>
            )}

          </div>
        );
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Tabs Header */}
      <div className="flex items-start gap-[45px] mb-[20px] md:mb-[30px] border-b border-b-[#121212] border-opacity-50">
        <div
          ref={tabsRef}
          className="no-scrollbar flex overflow-x-auto gap-2.5 pb-[20px] md:pb-[30px] flex-1"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-[15px] py-[0px] md:px-[15px] md:py-2.5
                font-medium btn-radius-5 md:font-medium tracking-[0.033em] transition-all h-[50px] md:h-[55px] flex-shrink-0 whitespace-nowrap border ${activeTab === tab
                  ? "bg-[#3D8F45] text-white border-[#439665]"
                  : "bg-[#eaf5ef] text-[#121212] border-[#121212] border-opacity-35 hover:bg-[#dff0e6]"
                } txt-p-lg md:txt-p-lg`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Navigation Arrows Stacked */}
        <div className="hidden md:flex flex-row gap-[15px] items-center mt-[8px]">
          <button
            onClick={() => scrollTabs("left")}
            className={`flex items-center justify-center shadow-md transition-all ${canScrollLeft ? "opacity-100" : "opacity-30 pointer-events-none"} bg-[#A4D25E]`}
            aria-label="Scroll left"
          >
            <SafeImage
              src="/images/product/right-arrow-p.svg"
              alt="left"
              width={45}
              height={45}
              className="rotate-180"
            />
          </button>
          <button
            onClick={() => scrollTabs("right")}
            className={`flex items-center justify-center shadow-md transition-all ${canScrollRight ? "opacity-100" : "opacity-30 pointer-events-none"} bg-[#A4D25E]`}
            aria-label="Scroll right"
          >
            <SafeImage
              src="/images/product/left-arrow-p.svg"
              alt="right"
              width={45}
              height={45}
              className="rotate-180"
            />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {renderContent()}
      </div>
    </div>
  );
}

