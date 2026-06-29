"use client";

import { useState, FormEvent, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { ProductDoc } from "@/lib/repositories/product.repository";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableImage } from "./SortableImage";
import { GenericTabEditor, type TabData } from "./GenericTabEditor";

type PackOption = {
  label: string; badge: string; contents: string;
  price: number; mrp: number; discountPercent: number; image?: string;
  sku?: string; stock?: number; lowStockThreshold?: number;
};

/**
 * Resize an image client-side (preserving the previous "auto-optimized"
 * behavior) and upload the result to Cloudflare R2 via the admin upload route.
 * Returns the public R2 URL — no base64 is ever stored.
 */
async function uploadResizedImageToR2(file: File, maxWidth: number): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
  const blob: Blob = await new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))),
        "image/jpeg",
        0.85,
      );
    };
    img.src = dataUrl;
  });
  const form = new FormData();
  form.append("file", blob, `${file.name.replace(/\.[^.]+$/, "") || "image"}.jpg`);
  form.append("prefix", "products");
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok || !data?.url) throw new Error(data?.error || "Upload failed");
  return data.url as string;
}

type Props = { initialData?: Partial<ProductDoc>; isEdit?: boolean };

const FORM_TABS = [
  "Basics", "Content Tabs", "Ingredients", "Product Info", "FAQs", "Pack Options", "Settings",
] as const;
type FormTab = typeof FORM_TABS[number];

// Migrate old product fields into unified tabs array
function initContentTabs(data: Partial<ProductDoc>): TabData[] {
  const d = data as any;
  if (d.tabs?.length) return d.tabs;
  // Only auto-populate if old-style fields have actual content (existing product migration)
  const hasOldData = d.benefits?.length || d.whoShouldUse?.length ||
    d.dosageInstructions?.length || d.ingredients?.length ||
    d.guidelines?.length || d.howToUse?.length;
  if (!hasOldData) return [];
  return [
    {
      name: "Key Features",
      title: "",
      items: (d.benefits || []).map((t: string) => ({ text: t, image: "", label: "" })),
      note: d.recommendedBenefitsNote || "",
    },
    {
      name: "Who Should Use",
      title: "",
      items: (d.whoShouldUse || []).map((t: string) => ({ text: t, image: "", label: "" })),
      note: d.recommendedWhoShouldUseNote || "",
    },
    {
      name: "Dosage",
      title: "",
      items: (d.dosageInstructions || []).map((x: any) => ({ text: x.text, image: "", label: x.label || "" })),
      note: d.recommendedDosageNote || "",
    },
    {
      name: "Ingredients",
      title: "",
      items: (d.ingredients || []).map((x: any) => ({ text: x.description, image: x.image || "", label: x.name })),
      note: "",
    },
    {
      name: "Guidelines",
      title: "",
      items: (d.guidelines || []).map((x: any) => ({ text: x.text, image: "", label: x.label || "" })),
      note: "",
    },
    {
      name: "How to Use",
      title: "",
      items: (d.howToUse || []).map((x: any) => ({ text: x.text, image: "", label: x.label || "" })),
      note: d.recommendedHowtoUse || "",
    },
  ];
}

export function ProductForm({ initialData = {}, isEdit = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formTab, setFormTab] = useState<FormTab>("Basics");

  // Basic
  const [name, setName] = useState(initialData.name || "");
  const [secondaryName, setSecondaryName] = useState(initialData.secondaryName || "");
  const [label, setLabel] = useState(initialData.label || "");
  const [subLabel, setSubLabel] = useState(initialData.subLabel || "");
  const [slug, setSlug] = useState(initialData.slug || "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [shortDesc, setShortDesc] = useState(initialData.shortDescription || "");
  const [desc, setDesc] = useState(initialData.description || "");
  const [price, setPrice] = useState(initialData.price?.toString() || "");
  const [discPrice, setDiscPrice] = useState(initialData.discountedPrice?.toString() || "");
  const [discPercent, setDiscPercent] = useState(initialData.discountPercent?.toString() || "");
  const [upiDiscPct, setUpiDiscPct] = useState(initialData.upiDiscountPercent?.toString() || "10");
  const [upiMaxDisc, setUpiMaxDisc] = useState(initialData.upiMaxDiscount?.toString() || "60");
  const [cardDiscPct, setCardDiscPct] = useState(initialData.cardDiscountPercent?.toString() || "5");
  const [cardMaxDisc, setCardMaxDisc] = useState(initialData.cardMaxDiscount?.toString() || "25");
  const [category, setCategory] = useState((initialData as any).category || "");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [inStock, setInStock] = useState(initialData.inStock ?? true);
  const [isBestSelling, setIsBestSelling] = useState(initialData.isBestSelling ?? false);
  const [isUpsellProduct, setIsUpsellProduct] = useState((initialData as any).isUpsellProduct ?? false);
  const [codAvailable, setCodAvailable] = useState((initialData as any).codAvailable ?? true);

  // SEO
  const [metaTitle, setMetaTitle] = useState((initialData as any).metaTitle || "");
  const [metaDesc, setMetaDesc] = useState((initialData as any).metaDescription || "");
  const [ogTitle, setOgTitle] = useState((initialData as any).ogTitle || "");
  const [ogDesc, setOgDesc] = useState((initialData as any).ogDescription || "");
  const [ogImageUrl, setOgImageUrl] = useState((initialData as any).ogImageUrl || "");
  const [ogImageAlt, setOgImageAlt] = useState((initialData as any).ogImageAlt || "");
  const [twitterTitle, setTwitterTitle] = useState((initialData as any).twitterTitle || "");
  const [twitterDesc, setTwitterDesc] = useState((initialData as any).twitterDescription || "");
  const [customScript, setCustomScript] = useState((initialData as any).customScript || "");

  // Blog / Featured
  const [linkedBlogSlugs, setLinkedBlogSlugs] = useState<string[]>((initialData as any).linkedBlogSlugs || []);
  const [blogPickerValue, setBlogPickerValue] = useState("");
  const [blogs, setBlogs] = useState<{ slug: string; title: string }[]>([]);
  const [heroUsps, setHeroUsps] = useState<string[]>((initialData as any).heroUsps?.length ? (initialData as any).heroUsps : ["", "", "", ""]);
  const [promoStripEnabled, setPromoStripEnabled] = useState((initialData as any).promoStripEnabled ?? false);
  const [promoStripText, setPromoStripText] = useState((initialData as any).promoStripText || "");
  const [badgesHeading, setBadgesHeading] = useState((initialData as any).badgesHeading || "");
  const [consultationHeading, setConsultationHeading] = useState((initialData as any).consultationHeading || "");
  const [consultationSubheading, setConsultationSubheading] = useState((initialData as any).consultationSubheading || "");
  const [consultationDescription, setConsultationDescription] = useState((initialData as any).consultationDescription || "");
  const [consultationCtaText, setConsultationCtaText] = useState((initialData as any).consultationCtaText || "");
  const [consultationCtaLink, setConsultationCtaLink] = useState((initialData as any).consultationCtaLink || "");
  const [consultationImage, setConsultationImage] = useState((initialData as any).consultationImage || "");
  const [consultationImageAlt, setConsultationImageAlt] = useState((initialData as any).consultationImageAlt || "");
  const [featuredImage, setFeaturedImage] = useState((initialData as any).featuredImage || "");
  const [featuredImageAlt, setFeaturedImageAlt] = useState((initialData as any).featuredImageAlt || "");
  const [featuredLabel, setFeaturedLabel] = useState((initialData as any).featuredLabel || "");
  const [featuredSubLabel, setFeaturedSubLabel] = useState((initialData as any).featuredSubLabel || "");
  const initialFeaturedImage = (initialData as any).featuredImage || "";
  const initialImages: { url: string }[] = (initialData as any).images || [];
  const isCustom = initialFeaturedImage && !initialImages.some((img: { url: string }) => img.url === initialFeaturedImage);
  const [featuredImageMode, setFeaturedImageMode] = useState<"product" | "custom">(isCustom ? "custom" : "product");
  const [imageUrlInput, setImageUrlInput] = useState("");

  useEffect(() => {
    fetch("/api/admin/blogs").then(r => r.json()).then(d => {
      if (d.blogs) setBlogs(d.blogs.map((b: any) => ({ slug: b.slug, title: b.title })));
    }).catch(() => {});
    fetch("/api/admin/categories").then(r => r.json()).then(d => {
      if (d.categories) setCategoryOptions(d.categories.map((c: any) => c.name));
    }).catch(() => {});
  }, []);

  // Images
  const [images, setImages] = useState<{ url: string; altText: string; filename: string }[]>(
    (initialData.images as any)?.map((img: any) =>
      typeof img === "string" ? { url: img, altText: "", filename: "" } : img
    ) || []
  );

  // Pack options
  const [packOptions, setPackOptions] = useState<PackOption[]>((initialData.packOptions as any) || []);

  // Unified content tabs (Key Features, Who Should Use, Dosage, Ingredients, Guidelines, How to Use)
  const [contentTabs, setContentTabs] = useState<TabData[]>(() => initContentTabs(initialData));
  const [importantNotes, setImportantNotes] = useState((initialData as any).importantNotes?.join("\n") || "");

  const [expandedTabIdx, setExpandedTabIdx] = useState<number | null>(contentTabs.length > 0 ? 0 : null);

  const addContentTab = () => {
    const newIdx = contentTabs.length;
    setContentTabs(prev => [...prev, { name: "New Tab", title: "", items: [], note: "" }]);
    setExpandedTabIdx(newIdx);
  };
  const removeContentTab = (idx: number) => {
    setContentTabs(prev => prev.filter((_, i) => i !== idx));
    setExpandedTabIdx(prev => {
      if (prev === null || prev < idx) return prev;
      if (prev === idx) return null;
      return prev - 1;
    });
  };
  const moveContentTab = (idx: number, dir: "up" | "down") => {
    setContentTabs(prev => {
      const n = [...prev]; const t = dir === "up" ? idx - 1 : idx + 1;
      if (t < 0 || t >= n.length) return prev;
      [n[idx], n[t]] = [n[t], n[idx]]; return n;
    });
    setExpandedTabIdx(prev => {
      if (prev === idx) return dir === "up" ? idx - 1 : idx + 1;
      if (dir === "up" && prev === idx - 1) return idx;
      if (dir === "down" && prev === idx + 1) return idx;
      return prev;
    });
  };
  const updateContentTabAt = (idx: number, data: TabData) =>
    setContentTabs(prev => prev.map((t, i) => i === idx ? data : t));
  const renameContentTab = (idx: number, name: string) =>
    setContentTabs(prev => prev.map((t, i) => i === idx ? { ...t, name } : t));


  // Product Info tab
  const [dBrand, setDBrand] = useState(initialData.productDetails?.brand || "PunchRaksha");
  const [dLife, setDLife] = useState(initialData.productDetails?.shelfLife || "24 Months");
  const [dForm, setDForm] = useState(initialData.productDetails?.dosageForm || "Capsules");
  const [dQty, setDQty] = useState(initialData.productDetails?.netQuantity || "60 Capsules");
  const [dTabTitle, setDTabTitle] = useState((initialData.productDetails as any)?.tabTitle || "");
  const [dProductLabel, setDProductLabel] = useState((initialData.productDetails as any)?.productLabel || "");
  const [dFull, setDFull] = useState(initialData.productDetails?.fullDescription || "");
  const [dTaste, setDTaste] = useState((initialData.productDetails as any)?.taste || "");
  const [dBestTime, setDBestTime] = useState((initialData.productDetails as any)?.bestTimeToConsume || "");
  const [dReliefTime, setDReliefTime] = useState((initialData.productDetails as any)?.expectedReliefTime || "");
  const [dIncluded, setDIncluded] = useState((initialData.productDetails as any)?.includedProducts || "");

  // FAQs
  const [faqs, setFaqs] = useState<any[]>(initialData.faqs || []);
  const addFaq = () => setFaqs(p => [...p, { question: "", answer: "" }]);
  const updateFaq = (idx: number, field: string, val: string) =>
    setFaqs(p => p.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const removeFaq = (idx: number) => setFaqs(p => p.filter((_, i) => i !== idx));

  // Ingredients
  const [ingredients, setIngredients] = useState<{ name: string; description: string; image: string; altText: string }[]>(
    (initialData.ingredients as any) || []
  );
  const addIngredient = () => setIngredients(p => [...p, { name: "", description: "", image: "", altText: "" }]);
  const removeIngredient = (idx: number) => setIngredients(p => p.filter((_, i) => i !== idx));
  const updateIngredient = (idx: number, field: string, val: string) =>
    setIngredients(p => p.map((x, i) => i === idx ? { ...x, [field]: val } : x));
  const moveIngredient = (idx: number, dir: "up" | "down") => {
    setIngredients(p => {
      const n = [...p]; const t = dir === "up" ? idx - 1 : idx + 1;
      if (t < 0 || t >= n.length) return p;
      [n[idx], n[t]] = [n[t], n[idx]]; return n;
    });
  };
  const handleIngredientImageUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    e.target.value = ""; // allow re-selecting the same file
    try {
      const url = await uploadResizedImageToR2(file, 400);
      updateIngredient(idx, "image", url);
    } catch (err) {
      toast.error((err instanceof Error ? err.message : "Image upload failed"));
    }
  };
  const handleIngredientImageUrl = (idx: number, raw: string) => {
    const m = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
    updateIngredient(idx, "image", m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : raw);
  };

  // Testimonials
  const [testimonialsHeading, setTestimonialsHeading] = useState((initialData as any).testimonialsHeading || "");
  const [linkedTestimonialIds, setLinkedTestimonialIds] = useState<string[]>(initialData.linkedTestimonialIds || []);
  const [allTestimonials, setAllTestimonials] = useState<any[]>([]);
  const [relatedProductIds, setRelatedProductIds] = useState<string[]>((initialData as any).relatedProductIds?.map(String) || []);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/admin/testimonials").then(r => r.json()).then(d => {
      if (d.testimonials) setAllTestimonials(d.testimonials);
    }).catch(() => {});
    fetch("/api/admin/products").then(r => r.json()).then(d => {
      if (d.products) setAllProducts(d.products);
    }).catch(() => {});
  }, []);
  const toggleTestimonialId = (id: string) =>
    setLinkedTestimonialIds(prev =>
      prev.map(String).includes(String(id)) ? prev.filter(x => String(x) !== String(id)) : [...prev, id]
    );

  // Tags
  const [tags, setTags] = useState<{ title: string; color: string }[]>(initialData.tags || []);
  const addTag = () => setTags(p => [...p, { title: "", color: "#e4f5e8" }]);
  const updateTag = (idx: number, field: string, val: string) =>
    setTags(p => p.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const removeTag = (idx: number) => setTags(p => p.filter((_, i) => i !== idx));

  // Image upload — resize + upload to Cloudflare R2, store the URL (no base64).
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    e.target.value = ""; // allow re-selecting the same file
    try {
      const newImages = await Promise.all(
        files.map(async file => ({
          url: await uploadResizedImageToR2(file, 800),
          filename: file.name,
          altText: "",
        })),
      );
      setImages(prev => [...prev, ...newImages]);
    } catch (err) {
      toast.error((err instanceof Error ? err.message : "Image upload failed"));
    }
  };
  const addImageByUrl = () => {
    const raw = imageUrlInput.trim(); if (!raw) return;
    let url = raw;
    const m = raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) url = `https://drive.google.com/uc?export=view&id=${m[1]}`;
    setImages(prev => [...prev, { url, altText: "", filename: "" }]);
    setImageUrlInput("");
  };
  const removeImage = (idx: number) => setImages(p => p.filter((_, i) => i !== idx));
  const updateImageAlt = (idx: number, altText: string) =>
    setImages(p => p.map((img, i) => i === idx ? { ...img, altText } : img));
  const moveImageInList = (idx: number, dir: "up" | "down") => {
    setImages(p => {
      const n = [...p]; const t = dir === "up" ? idx - 1 : idx + 1;
      if (t < 0 || t >= n.length) return p;
      [n[idx], n[t]] = [n[t], n[idx]]; return n;
    });
  };

  // Pack options
  const addPackOption = () => setPackOptions(p => [...p, { label: "", badge: "", contents: "", price: 0, mrp: 0, discountPercent: 0, image: "", sku: "", stock: 0, lowStockThreshold: 0 }]);
  const updatePackOption = (idx: number, field: string, value: any) =>
    setPackOptions(p => p.map((x, i) => i === idx ? { ...x, [field]: value } : x));
  const removePackOption = (idx: number) => setPackOptions(p => p.filter((_, i) => i !== idx));
  const movePackOption = (idx: number, dir: "up" | "down") => {
    setPackOptions(p => {
      const n = [...p]; const t = dir === "up" ? idx - 1 : idx + 1;
      if (t < 0 || t >= n.length) return p;
      [n[idx], n[t]] = [n[t], n[idx]]; return n;
    });
  };

  // DnD for images
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImages(items => arrayMove(items, items.findIndex(x => x.url === active.id), items.findIndex(x => x.url === over.id)));
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (label.trim().length > 100) {
      toast.error("Product Label cannot exceed 100 characters");
      setLoading(false);
      return;
    }
    if (subLabel.trim().length > 150) {
      toast.error("Product Sub Label cannot exceed 150 characters");
      setLoading(false);
      return;
    }

    const payload = {
      name, secondaryName,
      label: label.trim() || null,
      subLabel: subLabel.trim() || null,
      slug, category,
      shortDescription: shortDesc, description: shortDesc,
      price: Number(price), discountedPrice: Number(discPrice), discountPercent: Number(discPercent),
      upiDiscountPercent: Number(upiDiscPct), upiMaxDiscount: Number(upiMaxDisc),
      cardDiscountPercent: Number(cardDiscPct), cardMaxDiscount: Number(cardMaxDisc),
      images,
      inStock, isBestSelling, isUpsellProduct, codAvailable,
      tabs: contentTabs,
      importantNotes: importantNotes.split("\n").map((s: string) => s.trim()).filter(Boolean),
      productDetails: { brand: dBrand, shelfLife: dLife, dosageForm: dForm, netQuantity: dQty, tabTitle: dTabTitle, productLabel: dProductLabel, fullDescription: dFull, taste: dTaste, bestTimeToConsume: dBestTime, expectedReliefTime: dReliefTime, includedProducts: dIncluded },
      faqs, ingredients, packOptions, linkedTestimonialIds, testimonialsHeading, relatedProductIds, tags,
      metaTitle, metaDescription: metaDesc, ogTitle, ogDescription: ogDesc, ogImageUrl, ogImageAlt,
      twitterTitle, twitterDescription: twitterDesc, customScript,
      linkedBlogSlugs, heroUsps: heroUsps.filter(Boolean), promoStripEnabled, promoStripText, featuredImage, featuredImageAlt, featuredLabel, featuredSubLabel,
      badgesHeading,
      consultationHeading, consultationSubheading, consultationDescription, consultationCtaText, consultationCtaLink,
      consultationImage, consultationImageAlt,
    };

    try {
      const url = isEdit ? `/api/admin/products/${slug}` : "/api/admin/products";
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save product");
      toast.success(isEdit ? "Product updated!" : "Product created!");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const tabIndex = FORM_TABS.indexOf(formTab);
  const goNext = () => { if (tabIndex < FORM_TABS.length - 1) setFormTab(FORM_TABS[tabIndex + 1]); };
  const goPrev = () => { if (tabIndex > 0) setFormTab(FORM_TABS[tabIndex - 1]); };

  const renderTabContent = () => {
    switch (formTab) {
      // ─── Basics ────────────────────────────────────────────────────────────
      case "Basics":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="field-label">Product Name</label>
                <input required value={name} onChange={e => { const v = e.target.value; setName(v); if (!isEdit && !slugEdited) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")); }} className="field-input" />
              </div>
              <div>
                <label className="field-label">Secondary Name <span className="text-gray-400 font-normal text-xs normal-case">(e.g. Herbal Piles Tablet)</span></label>
                <input value={secondaryName} onChange={e => setSecondaryName(e.target.value)} className="field-input" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="field-label">Product Label <span className="text-gray-400 font-normal text-xs normal-case">(max 100 chars, e.g. Supports Liver Health)</span></label>
                <input maxLength={100} value={label} onChange={e => setLabel(e.target.value)} className="field-input" />
              </div>
              <div>
                <label className="field-label">Product Sub Label <span className="text-gray-400 font-normal text-xs normal-case">(max 150 chars, e.g. 100% Ayurvedic Formula)</span></label>
                <input maxLength={150} value={subLabel} onChange={e => setSubLabel(e.target.value)} className="field-input" />
              </div>
            </div>
            <div>
              <label className="field-label">Product URL (Slug)</label>
              <input
                required
                value={slug}
                onChange={e => {
                  const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)+/g, "");
                  setSlug(sanitized);
                  setSlugEdited(true);
                }}
                readOnly={isEdit}
                className={`field-input ${isEdit ? "bg-gray-50 text-gray-400 italic" : ""}`}
              />
              {!isEdit && <p className="text-[10px] text-gray-400 mt-1">Only lowercase letters, numbers and hyphens. Auto-generated from name until you edit it.</p>}
              {isEdit && <p className="text-[10px] text-gray-400 mt-1">Slug cannot be changed once created.</p>}
            </div>
            <div>
              <label className="field-label">Category <span className="text-gray-400 font-normal text-xs normal-case">(pick an existing one or type a new name)</span></label>
              <input value={category} onChange={e => setCategory(e.target.value)} list="product-category-options" placeholder="e.g. Piles Medicine" className="field-input" />
              <datalist id="product-category-options">
                {categoryOptions.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea required value={shortDesc} onChange={e => setShortDesc(e.target.value)} className="field-input h-20" />
            </div>
            {/* Images */}
            <div className="border-t pt-6">
              <label className="field-label mb-3">Product Images <span className="text-gray-400 font-normal text-xs normal-case">(First = cover)</span></label>
              <div className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center bg-gray-50 mb-4">
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#045830] file:text-white hover:file:bg-[#034620]" />
                <p className="text-xs text-gray-400 mt-2">Recommended 1000×1000px. Auto-optimized.</p>
              </div>
              <div className="flex gap-2 mb-4">
                <input type="url" value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addImageByUrl())} placeholder="Or paste an image URL (Google Drive, etc.)" className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                <button type="button" onClick={addImageByUrl} className="px-4 py-2 bg-[#045830] text-white rounded-lg text-sm font-semibold hover:bg-[#034620]">Add</button>
              </div>
              {images.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={images.map(img => img.url)} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {images.map((img, idx) => (
                        <SortableImage key={img.url} id={img.url} img={img} idx={idx} total={images.length} onUpdateAlt={updateImageAlt} onMove={moveImageInList} onRemove={removeImage} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        );

      // ─── Dynamic Content Tabs ─────────────────────────────────────────────
      case "Content Tabs":
        return (
          <div className="space-y-3">
            <div className="bg-[#f0faf5] border border-[#c5e8d4] rounded-lg px-4 py-3 text-sm text-[#045830]">
              These tabs appear on the product page. Name them anything — <b>Key Features</b>, <b>Dosage</b>, <b>How to Use</b>, etc.
              <span className="block mt-1 text-[#4a9a6a] text-xs">Tip: Name a tab <b>Ingredients</b> or <b>Guidelines</b> to get their special layouts on the website.</span>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={addContentTab}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#045830] text-white rounded-lg text-sm font-semibold hover:bg-[#034620] transition"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Tab
              </button>
            </div>

            {contentTabs.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed rounded-xl bg-gray-50/50">
                <p className="text-sm text-gray-400 italic">No tabs yet. Click &quot;Add Tab&quot; to create your first one.</p>
              </div>
            )}

            {contentTabs.map((tab, idx) => (
              <div key={idx} className="border rounded-xl overflow-hidden">
                {/* Accordion header */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${expandedTabIdx === idx ? "bg-[#045830]" : "bg-white hover:bg-gray-50"}`}
                  onClick={() => setExpandedTabIdx(expandedTabIdx === idx ? null : idx)}
                >
                  <svg
                    className={`shrink-0 transition-transform ${expandedTabIdx === idx ? "rotate-180 text-white" : "text-gray-400"}`}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                  <span className={`flex-1 text-sm font-semibold truncate ${expandedTabIdx === idx ? "text-white" : "text-gray-800"}`}>
                    {tab.name || <span className="italic font-normal">Unnamed Tab</span>}
                  </span>
                  <span className={`text-[11px] shrink-0 ${expandedTabIdx === idx ? "text-white/70" : "text-gray-400"}`}>
                    {tab.items.length} item{tab.items.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-0.5 ml-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {idx > 0 && (
                      <button type="button" onClick={() => moveContentTab(idx, "up")}
                        className={`text-[11px] px-1.5 py-0.5 rounded transition ${expandedTabIdx === idx ? "text-white/80 hover:bg-white/20" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}>↑</button>
                    )}
                    {idx < contentTabs.length - 1 && (
                      <button type="button" onClick={() => moveContentTab(idx, "down")}
                        className={`text-[11px] px-1.5 py-0.5 rounded transition ${expandedTabIdx === idx ? "text-white/80 hover:bg-white/20" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}>↓</button>
                    )}
                    <button type="button" onClick={() => removeContentTab(idx)}
                      className={`text-[11px] px-1.5 py-0.5 rounded ml-0.5 transition ${expandedTabIdx === idx ? "text-white/80 hover:bg-red-500/30" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}>✕</button>
                  </div>
                </div>

                {/* Accordion body */}
                {expandedTabIdx === idx && (
                  <div className="border-t p-5 space-y-5">
                    <div>
                      <label className="field-label">Tab Name <span className="text-gray-400 font-normal text-xs normal-case">(shown as a button on the product page)</span></label>
                      <input
                        value={tab.name}
                        onChange={e => renameContentTab(idx, e.target.value)}
                        placeholder="e.g. Key Features, Dosage, Ingredients..."
                        className="field-input text-sm"
                      />
                    </div>
                    <GenericTabEditor
                      data={tab}
                      onChange={d => updateContentTabAt(idx, d)}
                      importantNotes={tab.name === "Guidelines" ? importantNotes : undefined}
                      onImportantNotesChange={tab.name === "Guidelines" ? setImportantNotes : undefined}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      // ─── Product Info ──────────────────────────────────────────────────────
      case "Product Info":
        return (
          <div className="space-y-5">
            <div className="bg-[#f0faf5] border border-[#c5e8d4] rounded-lg px-4 py-3 text-sm text-[#045830]">
              Appears in the <b>Product Info</b> tab showing brand, shelf life, dosage form, etc.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="field-label">Tab Heading <span className="text-gray-400 font-normal text-xs normal-case">(shown as &ldquo;About …&rdquo; — leave blank to use product name)</span></label><input value={dTabTitle} onChange={e => setDTabTitle(e.target.value)} placeholder="e.g. About Ayurvedic Piles Medicine" className="field-input text-sm" /></div>
              <div className="md:col-span-2"><label className="field-label">Product Label <span className="text-gray-400 font-normal text-xs normal-case">(shown as &ldquo;Product: …&rdquo; — leave blank to use product name)</span></label><input value={dProductLabel} onChange={e => setDProductLabel(e.target.value)} placeholder="e.g. Ayurvedic Piles Medicine" className="field-input text-sm" /></div>
              <div><label className="field-label">Brand</label><input value={dBrand} onChange={e => setDBrand(e.target.value)} className="field-input text-sm" /></div>
              <div><label className="field-label">Shelf Life</label><input value={dLife} onChange={e => setDLife(e.target.value)} className="field-input text-sm" /></div>
              <div><label className="field-label">Dosage Form</label><input value={dForm} onChange={e => setDForm(e.target.value)} className="field-input text-sm" /></div>
              <div><label className="field-label">Net Quantity</label><input value={dQty} onChange={e => setDQty(e.target.value)} className="field-input text-sm" /></div>
              <div><label className="field-label">Taste</label><input value={dTaste} onChange={e => setDTaste(e.target.value)} placeholder="e.g. Slightly bitter" className="field-input text-sm" /></div>
              <div><label className="field-label">Best Time to Consume</label><input value={dBestTime} onChange={e => setDBestTime(e.target.value)} placeholder="e.g. Before bedtime" className="field-input text-sm" /></div>
              <div><label className="field-label">Expected Relief Time</label><input value={dReliefTime} onChange={e => setDReliefTime(e.target.value)} placeholder="e.g. 4–8 weeks" className="field-input text-sm" /></div>
              <div><label className="field-label">Included Products (Kit)</label><input value={dIncluded} onChange={e => setDIncluded(e.target.value)} placeholder="e.g. Tablet, Oil, Churna" className="field-input text-sm" /></div>
              <div className="md:col-span-2">
                <label className="field-label">Full Description <span className="text-gray-400 font-normal text-xs normal-case">(HTML supported)</span></label>
                <textarea value={dFull} onChange={e => setDFull(e.target.value)} className="field-input text-sm h-20" />
              </div>
            </div>
          </div>
        );

      // ─── FAQs ─────────────────────────────────────────────────────────────
      case "FAQs":
        return (
          <div className="space-y-5">
            <div className="bg-[#f0faf5] border border-[#c5e8d4] rounded-lg px-4 py-3 text-sm text-[#045830]">
              Shown in the FAQ accordion below the tabs. If empty, default FAQs are shown. <b>Answers support HTML.</b>
            </div>
            <div className="flex items-center justify-between">
              <label className="field-label mb-0">FAQs</label>
              <button type="button" onClick={addFaq} className="flex items-center gap-1.5 px-4 py-2 bg-[#045830] text-white rounded-lg text-sm font-semibold hover:bg-[#034620]"><PlusIcon /> Add FAQ</button>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-4 border rounded-xl bg-gray-50/50 relative group">
                  <div className="space-y-3">
                    <div>
                      <label className="field-label">Question</label>
                      <input value={faq.question} onChange={e => updateFaq(idx, "question", e.target.value)} placeholder="e.g. How long until I see results?" className="field-input text-sm" />
                    </div>
                    <div>
                      <label className="field-label">Answer <span className="text-gray-400 font-normal text-xs normal-case">(HTML supported)</span></label>
                      <textarea value={faq.answer} onChange={e => updateFaq(idx, "answer", e.target.value)} placeholder="Answer..." className="field-input text-sm h-20" />
                    </div>
                  </div>
                  <button type="button" onClick={() => removeFaq(idx)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500"><TrashIcon size={16} /></button>
                </div>
              ))}
              {faqs.length === 0 && <EmptyState text="No FAQs yet. Click Add FAQ to start." />}
            </div>
          </div>
        );

      // ─── Ingredients ──────────────────────────────────────────────────────────
      case "Ingredients":
        return (
          <div className="space-y-5">
            <div className="bg-[#f0faf5] border border-[#c5e8d4] rounded-lg px-4 py-3 text-sm text-[#045830]">
              Shown on the product page as the <b>Ingredients</b> section — round circle images with name and description.
            </div>
            <div className="flex items-center justify-between">
              <label className="field-label mb-0">Ingredients</label>
              <button type="button" onClick={addIngredient} className="flex items-center gap-1.5 px-4 py-2 bg-[#045830] text-white rounded-lg text-sm font-semibold hover:bg-[#034620]"><PlusIcon /> Add Ingredient</button>
            </div>
            <div className="space-y-4">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="p-4 border rounded-xl bg-gray-50/50 group">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <span className="text-xs font-bold text-[#045830] uppercase tracking-wider bg-[#e4f5e8] px-2 py-1 rounded">#{idx + 1}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {idx > 0 && <button type="button" onClick={() => moveIngredient(idx, "up")} className="text-[10px] text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100">↑</button>}
                      {idx < ingredients.length - 1 && <button type="button" onClick={() => moveIngredient(idx, "down")} className="text-[10px] text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100">↓</button>}
                      <button type="button" onClick={() => removeIngredient(idx)} className="text-gray-300 hover:text-red-500 ml-1"><TrashIcon size={14} /></button>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="shrink-0 flex flex-col items-center gap-1.5">
                      <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-dashed border-gray-300 bg-white cursor-pointer hover:border-[#045830] transition-colors">
                        {ing.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ing.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-0.5">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                            <span className="text-[9px] font-medium">Photo</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => handleIngredientImageUpload(idx, e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      </div>
                      {ing.image && <button type="button" onClick={() => updateIngredient(idx, "image", "")} className="text-[10px] text-red-400 hover:text-red-600">Remove</button>}
                      <input
                        type="text"
                        placeholder="or paste URL"
                        onBlur={(e) => { if (e.target.value.trim()) { handleIngredientImageUrl(idx, e.target.value.trim()); e.target.value = ""; } }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { handleIngredientImageUrl(idx, v); (e.target as HTMLInputElement).value = ""; } } }}
                        className="w-[72px] text-[8px] border rounded px-1 py-0.5 text-gray-500 placeholder-gray-300 outline-none focus:border-[#045830]"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="field-label">Name</label>
                        <input value={ing.name} onChange={e => updateIngredient(idx, "name", e.target.value)} placeholder="e.g. Senna" className="field-input text-sm" />
                      </div>
                      <div>
                        <label className="field-label">Description</label>
                        <textarea value={ing.description} onChange={e => updateIngredient(idx, "description", e.target.value)} placeholder="e.g. Strong laxative support for natural constipation relief" className="field-input text-sm h-16 resize-none" />
                      </div>
                      {ing.image && (
                        <div>
                          <label className="field-label">Image Alt Text <span className="text-gray-400 font-normal text-xs normal-case">(SEO)</span></label>
                          <input value={ing.altText || ""} onChange={e => updateIngredient(idx, "altText", e.target.value)} placeholder="e.g. Senna herb for constipation relief" className="field-input text-sm" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {ingredients.length === 0 && <EmptyState text="No ingredients yet. Click Add Ingredient to start." />}
            </div>
          </div>
        );

      // ─── Pack Options ──────────────────────────────────────────────────────
      case "Pack Options":
        return (
          <div className="space-y-5">
            <div className="bg-[#f0faf5] border border-[#c5e8d4] rounded-lg px-4 py-3 text-sm text-[#045830]">
              Pack options appear in the buy bar and hero section. Each pack has its own price, badge, and image.
            </div>
            <div className="flex items-center justify-between">
              <label className="field-label mb-0">Pack Options</label>
              <button type="button" onClick={addPackOption} className="flex items-center gap-1.5 px-4 py-2 bg-[#045830] text-white rounded-lg text-sm font-semibold hover:bg-[#034620]"><PlusIcon /> Add Pack</button>
            </div>
            <div className="space-y-4">
              {packOptions.map((pack: any, idx) => (
                <div key={idx} className="p-5 border rounded-xl bg-gray-50/50 group">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <span className="text-xs font-bold text-[#045830] uppercase tracking-wider bg-[#e4f5e8] px-2 py-1 rounded">Option {idx + 1}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {idx > 0 && <button type="button" onClick={() => movePackOption(idx, "up")} className="text-[10px] text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100">↑ Up</button>}
                      {idx < packOptions.length - 1 && <button type="button" onClick={() => movePackOption(idx, "down")} className="text-[10px] text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100">↓ Down</button>}
                      <button type="button" onClick={() => removePackOption(idx)} className="text-gray-400 hover:text-red-500 ml-1"><TrashIcon size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="field-label">Pack Label</label>
                      <input required value={pack.label} onChange={e => updatePackOption(idx, "label", e.target.value)} placeholder="PACK OF 3" className="field-input text-sm" />
                    </div>
                    <div>
                      <label className="field-label">Badge</label>
                      <input required value={pack.badge} onChange={e => updatePackOption(idx, "badge", e.target.value)} placeholder="Best Seller" className="field-input text-sm" />
                    </div>
                    <div>
                      <label className="field-label">Contents <span className="text-gray-400 font-normal text-xs normal-case">(e.g. 100 GRAM)</span></label>
                      <input value={pack.contents || ""} onChange={e => updatePackOption(idx, "contents", e.target.value)} placeholder="100 GRAM" className="field-input text-sm" />
                    </div>
                    <div>
                      <label className="field-label">Price (₹)</label>
                      <input required type="number" value={pack.price} onChange={e => updatePackOption(idx, "price", Number(e.target.value))} className="field-input text-sm" />
                    </div>
                    <div>
                      <label className="field-label">MRP (₹)</label>
                      <input required type="number" value={pack.mrp} onChange={e => updatePackOption(idx, "mrp", Number(e.target.value))} className="field-input text-sm" />
                    </div>
                    <div>
                      <label className="field-label">Discount % <span className="text-gray-400 font-normal text-xs normal-case">(e.g. 44)</span></label>
                      <input required type="number" min="0" max="100" value={pack.discountPercent || 0} onChange={e => updatePackOption(idx, "discountPercent", Number(e.target.value))} placeholder="44" className="field-input text-sm" />
                    </div>
                    <div>
                      <label className="field-label">SKU <span className="text-gray-400 font-normal text-xs normal-case">(unique code)</span></label>
                      <input value={pack.sku || ""} onChange={e => updatePackOption(idx, "sku", e.target.value)} placeholder="e.g. PR-PILES-3PK" className="field-input text-sm" />
                    </div>
                    <div>
                      <label className="field-label">Stock Qty</label>
                      <input type="number" min="0" value={pack.stock ?? 0} onChange={e => updatePackOption(idx, "stock", Number(e.target.value))} className="field-input text-sm" />
                    </div>
                    <div>
                      <label className="field-label">Low Stock Alert <span className="text-gray-400 font-normal text-xs normal-case">(threshold)</span></label>
                      <input type="number" min="0" value={pack.lowStockThreshold ?? 0} onChange={e => updatePackOption(idx, "lowStockThreshold", Number(e.target.value))} className="field-input text-sm" />
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <label className="field-label">Pack Image <span className="text-gray-400 font-normal text-xs normal-case">(pick from uploaded product images)</span></label>
                      <select value={pack.image || ""} onChange={e => updatePackOption(idx, "image", e.target.value)} className="field-input text-sm bg-white">
                        <option value="">Default Cover</option>
                        {images.map((img, i) => <option key={i} value={img.url}>Image {i + 1}{img.altText ? ` — ${img.altText}` : ""}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              {packOptions.length === 0 && <EmptyState text="No pack options yet. Click Add Pack to start." />}
            </div>
          </div>
        );

      // ─── Settings ─────────────────────────────────────────────────────────
      case "Settings":
        return (
          <div className="space-y-8">
            {/* Hero USPs */}
            <section>
              <div className="mb-4">
                <h4 className="font-bold text-gray-800">Hero USP Bullets</h4>
                <p className="text-xs text-gray-500 mt-0.5">4 bullet points shown in the green box on the product page. Leave blank to use Key Features data instead.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-2">
                    <img src="/images/product/ingredient-arrow.svg" alt="" className="w-[18px] h-[11px] shrink-0 opacity-50" />
                    <input
                      value={heroUsps[i] || ""}
                      onChange={e => setHeroUsps(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                      placeholder={`USP point ${i + 1}`}
                      className="field-input text-sm"
                    />
                  </div>
                ))}
              </div>
              {heroUsps.some(Boolean) && (
                <div className="mt-4 bg-[#eef6f2] rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                  {heroUsps.filter(Boolean).map((t, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <img src="/images/product/ingredient-arrow.svg" alt="" className="w-[18px] h-[11px] shrink-0 mt-1" />
                      <p className="text-sm text-[#121212]">{t}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Tags */}
            <section className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div><h4 className="font-bold text-gray-800">Product Tags</h4><p className="text-xs text-gray-500 mt-0.5">Colored badges shown in the hero section</p></div>
                <button type="button" onClick={addTag} className="flex items-center gap-1.5 px-4 py-2 bg-[#045830] text-white rounded-lg text-sm font-semibold hover:bg-[#034620]"><PlusIcon /> Add Tag</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tags.map((tag, idx) => (
                  <div key={idx} className="p-4 border rounded-xl bg-gray-50/50 relative flex items-end gap-4 overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: tag.color || "#e4f5e8" }} />
                    <div className="flex-1 space-y-3">
                      <div><label className="field-label">Tag Title</label><input value={tag.title} onChange={e => updateTag(idx, "title", e.target.value)} placeholder="e.g. Reduces Inflammation" className="field-input text-sm" /></div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1"><label className="field-label">Color</label><input value={tag.color} onChange={e => updateTag(idx, "color", e.target.value)} placeholder="#e4f5e8" className="field-input text-sm" /></div>
                        <div className="shrink-0"><label className="field-label">Preview</label><div className="h-8 px-3 flex items-center justify-center rounded text-[10px] font-bold uppercase tracking-wider text-gray-700 border border-black/5" style={{ backgroundColor: tag.color || "#e4f5e8" }}>{tag.title || "PREVIEW"}</div></div>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeTag(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                  </div>
                ))}
              </div>
              {tags.length === 0 && <EmptyState text="No tags yet." />}
            </section>

            {/* Testimonials */}
            <section className="border-t pt-6">
              <h4 className="font-bold text-gray-800 mb-1">Linked Testimonials</h4>
              <p className="text-xs text-gray-500 mb-4">Select which testimonials to show on this product page</p>
              <div className="mb-4">
                <label className="field-label">Section Heading <span className="text-gray-400 font-normal text-xs normal-case">(optional — leave blank for default)</span></label>
                <input value={testimonialsHeading} onChange={e => setTestimonialsHeading(e.target.value)} placeholder="e.g. See What Our Customers Say About Our Piles Medicine" className="field-input text-sm" />
              </div>
              {allTestimonials.length === 0
                ? <EmptyState text="No testimonials found. Add some in the Testimonials section first." />
                : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {allTestimonials.map(t => {
                      const selected = linkedTestimonialIds.map(String).includes(String(t._id));
                      const thumb = t.image || (t.videoId ? `https://img.youtube.com/vi/${t.videoId}/mqdefault.jpg` : "");
                      return (
                        <button key={t._id} type="button" onClick={() => toggleTestimonialId(t._id)} className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-[9/16] ${selected ? "border-primary ring-2 ring-primary/30" : "border-gray-200 opacity-60 hover:opacity-90"}`}>
                          {thumb && <img src={thumb} alt={t.customerName || ""} className="w-full h-full object-cover" />}
                          {selected && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div></div>}
                          {t.customerName && <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-white text-[10px] truncate">{t.customerName}</div>}
                        </button>
                      );
                    })}
                  </div>
                )
              }
              {linkedTestimonialIds.length > 0 && <p className="text-xs text-primary mt-3 font-medium">{linkedTestimonialIds.length} selected</p>}
            </section>

            {/* Related Products */}
            <section className="border-t pt-6">
              <h4 className="font-bold text-gray-800 mb-1">Related Products</h4>
              <p className="text-xs text-gray-500 mb-4">These appear as &ldquo;Similar Products&rdquo; on this product page. If none are selected, best-selling products are shown instead.</p>
              {allProducts.filter(p => String(p._id) !== String((initialData as any)._id)).length === 0
                ? <EmptyState text="No other products found." />
                : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {allProducts.filter(p => String(p._id) !== String((initialData as any)._id)).map(p => {
                      const selected = relatedProductIds.includes(String(p._id));
                      const thumb = p.featuredImage || p.images?.[0]?.url || "/images/placeholders/product-placeholder.svg";
                      return (
                        <button key={p._id} type="button"
                          onClick={() => setRelatedProductIds(prev => selected ? prev.filter(id => id !== String(p._id)) : [...prev, String(p._id)])}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all ${selected ? "border-primary ring-2 ring-primary/30" : "border-gray-200 opacity-60 hover:opacity-90"}`}
                        >
                          <div className="aspect-square">
                            <img src={thumb} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          {selected && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div></div>}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-white text-[10px] truncate text-left">{p.name}</div>
                        </button>
                      );
                    })}
                  </div>
                )
              }
              {relatedProductIds.length > 0 && <p className="text-xs text-primary mt-3 font-medium">{relatedProductIds.length} product{relatedProductIds.length !== 1 ? "s" : ""} selected</p>}
            </section>

            {/* Linked Blogs */}
            <section className="border-t pt-6">
              <h4 className="font-bold text-gray-800 mb-1">Linked Blogs</h4>
              <p className="text-xs text-gray-500 mb-4">Blog articles to display on this product page</p>
              <div className="space-y-2">
                <select value={blogPickerValue} onChange={e => setBlogPickerValue(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="">Select a blog...</option>
                  {blogs.filter(b => !linkedBlogSlugs.includes(b.slug)).map(b => <option key={b.slug} value={b.slug}>{b.title}</option>)}
                </select>
                <button type="button" onClick={() => { if (blogPickerValue) { setLinkedBlogSlugs(p => [...p, blogPickerValue]); setBlogPickerValue(""); } }} disabled={!blogPickerValue} className="w-full py-2 bg-[#045830] text-white rounded-lg text-sm font-semibold hover:bg-[#034620] disabled:opacity-40">+ Add Blog</button>
              </div>
              {linkedBlogSlugs.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {linkedBlogSlugs.map(s => (
                    <li key={s} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border rounded-lg text-sm">
                      <span className="truncate">{blogs.find(b => b.slug === s)?.title || s}</span>
                      <button type="button" onClick={() => setLinkedBlogSlugs(p => p.filter(x => x !== s))} className="shrink-0 text-gray-300 hover:text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* SEO */}
            <section className="border-t pt-6 space-y-4">
              <h4 className="font-bold text-gray-800">SEO & Meta</h4>
              <div><label className="field-label">Meta Title</label><input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Page title for search engines" className="field-input text-sm" /></div>
              <div><label className="field-label">Meta Description</label><textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} placeholder="160-char snippet" className="field-input text-sm h-16 resize-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="field-label">OG Title</label><input value={ogTitle} onChange={e => setOgTitle(e.target.value)} className="field-input text-sm" /></div>
                <div><label className="field-label">OG Description</label><input value={ogDesc} onChange={e => setOgDesc(e.target.value)} className="field-input text-sm" /></div>
                <div><label className="field-label">Twitter Title</label><input value={twitterTitle} onChange={e => setTwitterTitle(e.target.value)} className="field-input text-sm" /></div>
                <div><label className="field-label">Twitter Description</label><input value={twitterDesc} onChange={e => setTwitterDesc(e.target.value)} className="field-input text-sm" /></div>
                <div className="col-span-2">
                  <label className="field-label">OG Image <span className="text-gray-400 font-normal text-xs normal-case">(social sharing image)</span></label>
                  <div className="flex gap-2 mb-2">
                    <input type="file" accept="image/*" onChange={e => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.readAsDataURL(file);
                      reader.onload = ev => {
                        const img = new window.Image();
                        img.src = ev.target?.result as string;
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const MAX = 1200; let w = img.width, h = img.height;
                          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                          canvas.width = w; canvas.height = h;
                          canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
                          setOgImageUrl(canvas.toDataURL("image/jpeg", 0.85));
                        };
                      };
                    }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#045830] file:text-white hover:file:bg-[#034620]" />
                  </div>
                  <input value={ogImageUrl} onChange={e => setOgImageUrl(e.target.value)} placeholder="Or paste a URL (Google Drive, CDN, etc.)" className="field-input text-sm" />
                  {ogImageUrl && <img src={ogImageUrl} alt={ogImageAlt || ""} className="mt-2 h-20 object-cover rounded-lg border" />}
                </div>
                <div>
                  <label className="field-label">OG Image Alt Text <span className="text-gray-400 font-normal text-xs normal-case">(defaults to product name if left blank)</span></label>
                  <input value={ogImageAlt} onChange={e => setOgImageAlt(e.target.value)} placeholder="e.g. PunchRaksha Ayurvedic Piles Relief Tablet box" className="field-input text-sm" />
                </div>
              </div>
              <div><label className="field-label">Custom Script / Schema</label><textarea value={customScript} onChange={e => setCustomScript(e.target.value)} placeholder={'<script type="application/ld+json">...</script>'} className="field-input text-xs font-mono h-24 resize-y" /></div>
            </section>

            {/* Payment Discounts */}
            <section className="border-t pt-6 space-y-4">
              <h4 className="font-bold text-gray-800">Payment Method Discounts</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="field-label">UPI Discount (%)</label><input required type="number" value={upiDiscPct} onChange={e => setUpiDiscPct(e.target.value)} className="field-input text-sm" /></div>
                <div><label className="field-label">UPI Max Cap (₹)</label><input required type="number" value={upiMaxDisc} onChange={e => setUpiMaxDisc(e.target.value)} className="field-input text-sm" /></div>
                <div><label className="field-label">Card Discount (%)</label><input required type="number" value={cardDiscPct} onChange={e => setCardDiscPct(e.target.value)} className="field-input text-sm" /></div>
                <div><label className="field-label">Card Max Cap (₹)</label><input required type="number" value={cardMaxDisc} onChange={e => setCardMaxDisc(e.target.value)} className="field-input text-sm" /></div>
              </div>
            </section>
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
      <div className="xl:col-span-2 space-y-4">
        {/* Tab navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
          <div className="flex overflow-x-auto gap-1.5 no-scrollbar">
            {FORM_TABS.map(tab => (
              <button key={tab} type="button" onClick={() => setFormTab(tab)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all ${formTab === tab ? "bg-[#045830] text-white" : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h3 className="text-xl font-bold text-gray-900">{formTab}</h3>
            <span className="text-xs text-gray-400 font-medium">{tabIndex + 1} / {FORM_TABS.length}</span>
          </div>
          {renderTabContent()}
        </div>

        {/* Prev / Next */}
        <div className="flex gap-3">
          <button type="button" onClick={goPrev} disabled={tabIndex === 0} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-30 text-sm transition">
            ← {tabIndex > 0 ? FORM_TABS[tabIndex - 1] : ""}
          </button>
          <button type="button" onClick={goNext} disabled={tabIndex === FORM_TABS.length - 1} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 disabled:opacity-30 text-sm transition">
            {tabIndex < FORM_TABS.length - 1 ? FORM_TABS[tabIndex + 1] : ""} →
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="xl:sticky xl:top-6 space-y-5">
        {/* Save */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-primary/20 space-y-3">
          <button type="submit" disabled={loading} className="w-full py-3 bg-[#045830] text-white rounded-xl font-bold hover:bg-[#034620] shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner /> : <><SaveIcon /> {isEdit ? "Update Product" : "Create Product"}</>}
          </button>
          <button type="button" onClick={() => router.back()} className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 text-sm transition">Discard Changes</button>
        </div>

        {/* Availability */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Availability</h3>
          <label className="flex items-center justify-between gap-2 cursor-pointer p-3 rounded-xl border bg-gray-50/50 hover:bg-gray-100/50 transition">
            <div><p className="text-sm font-bold text-gray-900">In Stock</p><p className="text-[11px] text-gray-500">Show as available</p></div>
            <input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} className="w-5 h-5 accent-[#045830]" />
          </label>
          <label className="flex items-center justify-between gap-2 cursor-pointer p-3 rounded-xl border bg-gray-50/50 hover:bg-gray-100/50 transition">
            <div><p className="text-sm font-bold text-gray-900">Best Seller</p><p className="text-[11px] text-gray-500">Badge & homepage feature</p></div>
            <input type="checkbox" checked={isBestSelling} onChange={e => setIsBestSelling(e.target.checked)} className="w-5 h-5 accent-[#045830]" />
          </label>
          <label className="flex items-center justify-between gap-2 cursor-pointer p-3 rounded-xl border bg-gray-50/50 hover:bg-gray-100/50 transition">
            <div><p className="text-sm font-bold text-gray-900">Last Minute Checkout</p><p className="text-[11px] text-gray-500">Show in cart upsell section</p></div>
            <input type="checkbox" checked={isUpsellProduct} onChange={e => setIsUpsellProduct(e.target.checked)} className="w-5 h-5 accent-[#045830]" />
          </label>
          {isBestSelling && (
            <div className="px-3 pb-3 space-y-3 border-t border-[#045830]/20 pt-3">
              <p className="text-[10px] font-bold text-[#045830] uppercase">Best Seller Card</p>
              <div>
                <label className="field-label">Card Image</label>
                <div className="flex gap-1 mb-2">
                  <button type="button" onClick={() => setFeaturedImageMode("product")} className={`flex-1 py-1 text-[10px] font-semibold rounded-md border transition ${featuredImageMode === "product" ? "bg-[#045830] text-white border-[#045830]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>From Products</button>
                  <button type="button" onClick={() => setFeaturedImageMode("custom")} className={`flex-1 py-1 text-[10px] font-semibold rounded-md border transition ${featuredImageMode === "custom" ? "bg-[#045830] text-white border-[#045830]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>Upload Custom</button>
                </div>
                {featuredImageMode === "product" ? (
                  <select value={featuredImage} onChange={e => setFeaturedImage(e.target.value)} className="w-full border rounded-lg px-3 py-1.5 text-xs bg-white">
                    <option value="">Use first product image</option>
                    {images.map((img, i) => <option key={i} value={img.url}>Image {i + 1}{img.altText ? ` — ${img.altText}` : ""}</option>)}
                  </select>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-[#045830]/40 rounded-lg p-3 cursor-pointer hover:bg-[#045830]/5 transition">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#045830]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span className="text-[10px] text-gray-500">Click to upload image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const reader = new FileReader();
                      reader.readAsDataURL(file);
                      reader.onload = ev => {
                        const img = new window.Image();
                        img.src = ev.target?.result as string;
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const MAX = 800; let w = img.width, h = img.height;
                          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                          canvas.width = w; canvas.height = h;
                          canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
                          setFeaturedImage(canvas.toDataURL("image/jpeg", 0.75));
                        };
                      };
                    }} />
                  </label>
                )}
                {featuredImage && <img src={featuredImage} alt="" className="mt-2 h-16 w-full object-cover rounded-lg border" />}
                {featuredImage && featuredImageMode === "custom" && (
                  <button type="button" onClick={() => setFeaturedImage("")} className="mt-1 text-[10px] text-red-400 hover:text-red-600 transition">Remove image</button>
                )}
                {featuredImage && (
                  <div className="mt-2">
                    <label className="field-label">Card Image Alt Text <span className="text-gray-400 font-normal text-xs normal-case">(SEO)</span></label>
                    <input value={featuredImageAlt} onChange={e => setFeaturedImageAlt(e.target.value)} placeholder="e.g. PunchRaksha Piles Relief Kit" className="field-input text-xs" />
                  </div>
                )}
              </div>
            </div>
          )}
          <label className="flex items-center justify-between gap-2 cursor-pointer p-3 rounded-xl border bg-gray-50/50 hover:bg-gray-100/50 transition">
            <div><p className="text-sm font-bold text-gray-900">COD Available</p><p className="text-[11px] text-gray-500">Allow Cash on Delivery</p></div>
            <input type="checkbox" checked={codAvailable} onChange={e => setCodAvailable(e.target.checked)} className="w-5 h-5 accent-[#045830]" />
          </label>
        </div>

        {/* Promo Strip */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Promo Strip</h3>
          <label className="flex items-center justify-between gap-2 cursor-pointer p-3 rounded-xl border bg-gray-50/50 hover:bg-gray-100/50 transition">
            <div><p className="text-sm font-bold text-gray-900">Show Promo Strip</p><p className="text-[11px] text-gray-500">Displays offer banner on product page</p></div>
            <input type="checkbox" checked={promoStripEnabled} onChange={e => setPromoStripEnabled(e.target.checked)} className="w-5 h-5 accent-[#045830]" />
          </label>
          {promoStripEnabled && (
            <div className="px-1 space-y-2">
              <label className="field-label">Offer Text</label>
              <input
                value={promoStripText}
                onChange={e => setPromoStripText(e.target.value)}
                placeholder="e.g. FREE SHILAJIT WORTH ₹599 ON ORDERS ABOVE ₹1399"
                className="field-input text-xs"
              />
              {promoStripText && (
                <div className="flex items-center gap-2 bg-[#045830] text-white text-[10px] font-medium px-3 py-2 rounded-lg uppercase">
                  <span>🏷</span><span>{promoStripText}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ayurvedic Badges */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ayurvedic Badges Section</h3>
            <p className="text-[11px] text-gray-400 mt-1">Override the badges heading for this product. Leave blank to use the global default from Site Settings.</p>
          </div>
          <div>
            <label className="field-label">Heading <span className="text-gray-400 font-normal text-xs normal-case">(use \n for a line break — text auto-wraps at ~520px width)</span></label>
            <textarea value={badgesHeading} onChange={e => setBadgesHeading(e.target.value)} placeholder="e.g. Powerful Ayurvedic Care for&#10;Complete Piles Support" className="field-input text-sm h-16 resize-none" />
          </div>
        </div>

        {/* Consultation Section */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Consultation Section</h3>
            <p className="text-[11px] text-gray-400 mt-1">Override the global consultation text for this product. Leave blank to use the global defaults from Settings.</p>
          </div>
          <div>
            <label className="field-label">Heading</label>
            <input value={consultationHeading} onChange={e => setConsultationHeading(e.target.value)} placeholder="e.g. Have Questions About Our Product?" className="field-input text-sm" />
          </div>
          <div>
            <label className="field-label">Sub-heading</label>
            <input value={consultationSubheading} onChange={e => setConsultationSubheading(e.target.value)} placeholder="e.g. You can directly talk to our expert…" className="field-input text-sm" />
          </div>
          <div>
            <label className="field-label">Description</label>
            <textarea value={consultationDescription} onChange={e => setConsultationDescription(e.target.value)} placeholder="e.g. Our experienced team is here…" className="field-input text-sm h-24 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Button Text</label>
              <input value={consultationCtaText} onChange={e => setConsultationCtaText(e.target.value)} placeholder="e.g. TAKE CONSULTATION NOW" className="field-input text-sm" />
            </div>
            <div>
              <label className="field-label">Button Link</label>
              <input value={consultationCtaLink} onChange={e => setConsultationCtaLink(e.target.value)} placeholder="e.g. /contact" className="field-input text-sm" />
            </div>
          </div>
          <div>
            <label className="field-label">Doctor / Expert Image <span className="text-gray-400 font-normal text-xs normal-case">(leave blank to use the default doctor photo)</span></label>
            <div className="flex gap-3 items-start">
              {/* Thumbnail */}
              <div className="shrink-0">
                <div className="relative w-[72px] h-[72px] rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50">
                  {consultationImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={consultationImage} alt={consultationImageAlt || "doctor"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-0.5">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      <span className="text-[9px] font-medium">No photo</span>
                    </div>
                  )}
                </div>
                {consultationImage && (
                  <button type="button" onClick={() => setConsultationImage("")} className="mt-1 text-[10px] text-red-400 hover:text-red-600 transition w-full text-center">Remove</button>
                )}
              </div>

              {/* Controls */}
              <div className="flex-1 space-y-2">
                <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-[#045830]/40 rounded-lg p-3 cursor-pointer hover:bg-[#045830]/5 transition">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#045830]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span className="text-[11px] text-gray-500">Click to upload photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = ev => {
                      const img = new window.Image();
                      img.src = ev.target?.result as string;
                      img.onload = () => {
                        const canvas = document.createElement("canvas");
                        const MAX = 800; let w = img.width, h = img.height;
                        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
                        canvas.width = w; canvas.height = h;
                        const ctx = canvas.getContext("2d");
                        if (ctx) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); }
                        setConsultationImage(canvas.toDataURL("image/jpeg", 0.8));
                      };
                    };
                  }} />
                </label>
                <input
                  type="text"
                  placeholder="or paste image URL / Google Drive link"
                  onBlur={e => { const v = e.target.value.trim(); if (!v) return; const m = v.match(/\/d\/([a-zA-Z0-9_-]+)/); setConsultationImage(m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : v); e.target.value = ""; }}
                  onKeyDown={e => { if (e.key !== "Enter") return; e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (!v) return; const m = v.match(/\/d\/([a-zA-Z0-9_-]+)/); setConsultationImage(m ? `https://drive.google.com/uc?export=view&id=${m[1]}` : v); (e.target as HTMLInputElement).value = ""; }}
                  className="field-input text-sm"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="field-label">Doctor Image Alt Text <span className="text-gray-400 font-normal text-xs normal-case">(SEO — describes the image)</span></label>
            <input value={consultationImageAlt} onChange={e => setConsultationImageAlt(e.target.value)} placeholder="e.g. Dr. Sharma – Ayurvedic Piles Specialist" className="field-input text-sm" />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pricing</h3>
          <div>
            <label className="field-label">MRP (Original Price)</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span><input required type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border rounded-lg pl-8 pr-4 py-2 text-sm font-semibold" /></div>
          </div>
          <div>
            <label className="field-label">Discounted Price</label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span><input required type="number" value={discPrice} onChange={e => setDiscPrice(e.target.value)} className="w-full border rounded-lg pl-8 pr-4 py-2 text-sm font-semibold text-primary" /></div>
          </div>
          <div>
            <label className="field-label">Discount %</label>
            <input required type="number" value={discPercent} onChange={e => setDiscPercent(e.target.value)} className="field-input text-sm" />
          </div>
        </div>
      </div>
    </form>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8 border-2 border-dashed rounded-xl bg-gray-50/50">
      <p className="text-sm text-gray-400 italic">{text}</p>
    </div>
  );
}

export function PlusIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
export function SaveIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
}
export function TrashIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
}
export function ChevronUpIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>;
}
export function ChevronDownIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}
function LoadingSpinner() {
  return <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>;
}
