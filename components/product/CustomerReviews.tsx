"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { ButtonBase } from "../ui/ButtonBase";
import { StarRating } from "../ui/StarRating";
import { useProductStore } from "@/lib/store/productStore";

// --- Types ---
interface Review {
  name: string;
  rating: number;
  title?: string;
  body: string;
  date: string;
  verified?: boolean;
}

// --- Default mock reviews ---
const DEFAULT_REVIEWS: Review[] = [
  { name: "Narinder Singh", rating: 4, body: "Thank you 👍 relief from pain and bleeding", date: "01/12/2025", verified: true },
  { name: "Jwala Kumar", rating: 4, title: "Excellent product 😄", body: "It is an excellent product. I got relief in just 4–5 days.", date: "05/12/2025", verified: true },
  { name: "Anand Verma", rating: 4, body: "Immediate relief from spray.", date: "05/12/2025", verified: true },
  { name: "Nandini Bajpai", rating: 4, body: "Immediate relief from spray.", date: "05/12/2025", verified: true },
  { name: "Rajesh Sharma", rating: 5, title: "Amazing product!", body: "Highly recommend this to anyone suffering from piles.", date: "15/11/2024", verified: true },
  { name: "Priya Mehta", rating: 5, body: "Very good quality tablets. Noticed improvement within a week.", date: "10/11/2024", verified: true },
  { name: "Suresh Patel", rating: 4, body: "Good product. Would recommend.", date: "05/11/2024", verified: true },
  { name: "Kavitha Nair", rating: 5, title: "Life changing!", body: "Did not believe it would work so fast but it did. Very happy.", date: "01/11/2024", verified: true },
];

const PAGE_SIZE = 4;

export function CustomerReviews({
  reviews: propReviews,
  overallRating = 0,
  totalReviews = 0,
  ratingBreakdown,
  productId,
}: {
  reviews?: Review[];
  overallRating?: number;
  totalReviews?: number;
  ratingBreakdown?: { 5: number; 4: number; 3: number; 2: number; 1: number };
  productId?: string;
}) {
  type SortKey = "recent" | "highest" | "lowest";
  const hasReviews = totalReviews > 0;
  const reviews = propReviews?.length ? propReviews : (hasReviews ? DEFAULT_REVIEWS : []);
  const [localReviews, setLocalReviews] = useState(reviews);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [sortOpen, setSortOpen] = useState(false);

  const sortedReviews = [...localReviews].sort((a, b) => {
    if (sortKey === "highest") return b.rating - a.rating;
    if (sortKey === "lowest") return a.rating - b.rating;
    return 0; // "recent" — already sorted by server
  });
  const pageReviews = sortedReviews.slice(0, visibleCount);

  const sortLabel: Record<SortKey, string> = {
    recent: "Most Recent",
    highest: "Highest Rated",
    lowest: "Lowest Rated",
  };

  // Modal State
  const isModalOpen = useProductStore((s) => s.isReviewModalOpen);
  const setIsModalOpen = useProductStore((s) => s.setIsReviewModalOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    guestName: "",
    guestPhone: "",
    title: "",
    reviewBody: "",
    rating: 0,
  });
  const [hoverRating, setHoverRating] = useState(0);

  const [errors, setErrors] = useState({ guestName: "", guestPhone: "", reviewBody: "", rating: "" });
  const [touched, setTouched] = useState({ guestName: false, guestPhone: false, reviewBody: false });

  const validateField = (name: string, value: string) => {
    if (name === "title") return true; // title is optional
    let error = "";
    if (!value.trim()) {
      error = "This field is required";
    } else if (name === "guestPhone") {
      if (!/^[0-9]{10}$/.test(value)) {
        error = "Please enter a valid 10-digit mobile number";
      }
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "guestPhone") {
      const numeric = value.replace(/\D/g, "").slice(0, 10);
      setReviewForm((prev) => ({ ...prev, [name]: numeric }));
      if (touched[name as keyof typeof touched]) validateField(name, numeric);
    } else {
      setReviewForm((prev) => ({ ...prev, [name]: value }));
      if (touched[name as keyof typeof touched]) validateField(name, value);
    }
  };

  const handleReadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, localReviews.length));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      alert("Product ID is missing.");
      return;
    }
    const isNameValid = validateField("guestName", reviewForm.guestName);
    const isPhoneValid = validateField("guestPhone", reviewForm.guestPhone);
    const isBodyValid = validateField("reviewBody", reviewForm.reviewBody);
    const isRatingValid = reviewForm.rating >= 1;

    setTouched({ guestName: true, guestPhone: true, reviewBody: true });
    if (!isRatingValid) {
      setErrors((prev) => ({ ...prev, rating: "Please select a rating" }));
    }

    if (!isNameValid || !isPhoneValid || !isBodyValid || !isRatingValid) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reviewForm, productId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Thank you! Your review has been submitted and is awaiting approval.");
        setIsModalOpen(false);
        setReviewForm({ guestName: "", guestPhone: "", title: "", reviewBody: "", rating: 0 });
        setHoverRating(0);
        setErrors({ guestName: "", guestPhone: "", reviewBody: "", rating: "" });
        setTouched({ guestName: false, guestPhone: false, reviewBody: false });
      } else {
        toast.error(data.error || data.message || "Failed to submit review.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while submitting the review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="customer-reviews" className="w-full bg-white p-90-60-45">
      {/* Narrow centered container matching the reference */}
      <div className="px-[15px] w-full md:w-[80%] mx-auto">

        {/* ── Heading ── */}
        <h2 className="text-center font-outfit txt-h2-lg font-semibold text-[#121212] mb-[30px] md:mb-[45px]">
          Customer Reviews
        </h2>

        {/* ── Empty State ── */}
        {!hasReviews && (
          <div className="flex flex-col items-center gap-[20px] py-[30px] md:py-[45px] border-t border-[#121212]/15">
            <p className="txt-p-lg text-[#767676] text-center">No reviews yet. Be the first to share your experience!</p>
            <ButtonBase onClick={() => setIsModalOpen(true)} className="!flex-none txt-p-lg font-semibold !px-[30px] py-[14px]">
              Write a Review
            </ButtonBase>
          </div>
        )}

        {/* ── Rating Summary ── */}
        {hasReviews && <div className="flex flex-col px-[15px] md:px-[175px] md:flex-row items-center md:justify-between gap-[20px] md:gap-[14px] pb-[30px] md:pb-[45px] border-b border-[#121212]/15">
          {/* Left: score + breakdown */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-[20px] w-full md:w-auto">
            {/* Big score */}
            <div className="flex flex-col items-center gap-[6px] shrink-0">
              <span className="text-[52px] font-bold leading-none text-[#121212]">{overallRating.toFixed(1)}</span>
              <StarRating value={overallRating} fillColor="#4EBD63" emptyStyle="outline" />
              <p className="font-outfit txt-p-lg text-[#767676] whitespace-nowrap">
                {totalReviews} review{totalReviews !== 1 ? "s" : ""}
              </p>
            </div>
            {/* Breakdown bars */}
            {ratingBreakdown && totalReviews > 0 && (
              <div className="flex flex-col gap-[6px] w-full sm:w-[220px]">
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = ratingBreakdown[star];
                  const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-[8px]">
                      <span className="text-xs text-[#767676] w-[10px] shrink-0">{star}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="#4EBD63" className="shrink-0"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                      <div className="flex-1 h-[6px] bg-[#e8e8e8] rounded-full overflow-hidden">
                        <div className="h-full bg-[#4EBD63] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-[#767676] w-[28px] text-right shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Write a Review button */}
          <ButtonBase onClick={() => setIsModalOpen(true)} className="flex-none md:w-auto txt-p-lg font-semibold !px-[30px] py-[14px]">
            Write a Review
          </ButtonBase>
        </div>}

        {hasReviews && <>
          {/* ── Sort Row ── */}
          <div className="relative flex items-center gap-2 py-[20px] md:py-[16px] border-b border-[#121212]/15">
            <button
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-[5px] txt-p-lg text-[#121212] hover:text-[#045830] transition"
            >
              {sortLabel[sortKey]}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className={`transition-transform ${sortOpen ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {sortOpen && (
              <div className="absolute top-full left-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                {(["recent", "highest", "lowest"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setSortKey(key); setSortOpen(false); setVisibleCount(PAGE_SIZE); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition hover:bg-[#eef6f2] ${sortKey === key ? "text-[#045830] font-semibold bg-[#eef6f2]" : "text-[#121212]"}`}
                  >
                    {sortLabel[key]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Review List ── */}
          <div className="flex flex-col">
            {pageReviews.map((r, i) => (
              <div key={i} className="py-[30px] md:py-[45px] border-b border-[#121212]/50">
                <div className="flex items-center justify-between mb-[15px] md:mb-[20px]">
                  <StarRating value={r.rating} fillColor="#4EBD63" emptyStyle="outline" />
                  <span className="txt-p-lg text-[#767676]">{r.date}</span>
                </div>
                <div className="flex items-center gap-[10px] mb-[20px] md:mb-[30px]">
                  <h3 className="txt-h3-sm !font-medium text-[#045830]">{r.name}</h3>
                  {r.verified && (
                    <span className="txt-p font-semibold bg-[#045830] text-white px-3 py-[2px] btn-radius-10">
                      Verified
                    </span>
                  )}
                </div>
                {r.title && <p className="txt-p-lg font-medium text-[#121212] mb-[10px]">{r.title}</p>}
                <p className="txt-p-lg text-[#121212]">{r.body}</p>
              </div>
            ))}
          </div>
        </>}

        {/* ── Read More ── */}
        {visibleCount < localReviews.length && (
          <div className="flex justify-center pt-[30px] md:pt-[60px]">
            <ButtonBase onClick={handleReadMore} className=" flex-none md:w-auto txt-p-lg font-semibold !px-[30px] py-[14px]">
              Read More
            </ButtonBase>
          </div>
        )}

      </div>
      {/* ── Write Review Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] w-full max-w-[480px] p-[24px] shadow-lg">
            <div className="flex items-center justify-between mb-[20px]">
              <h4 className="font-outfit txt-h3-lg font-semibold text-[#121212]">Write Review</h4>
              <button onClick={() => setIsModalOpen(false)} className="w-[32px] h-[32px] flex items-center justify-center rounded-full border border-[#E5E5E5] text-[#767676] hover:bg-gray-100 transition-colors">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="flex flex-col gap-[16px]">
              <div className="flex flex-col gap-[6px]">
                <label className="txt-p-lg font-medium">Name</label>
                <input name="guestName" type="text" placeholder="Your Name" value={reviewForm.guestName} onChange={handleChange} onBlur={handleBlur} className={`border ${errors.guestName && touched.guestName ? 'border-red-500' : 'border-[#E5E5E5]'} rounded-[10px] px-4 py-3 outline-none font-outfit text-[#121212] placeholder-[#A3A3A3] focus:border-[#C4C4C4] transition-colors`} />
                {errors.guestName && touched.guestName && <span className="text-red-500 font-outfit text-sm">{errors.guestName}</span>}
              </div>

              <div className="flex flex-col gap-[6px]">
                <label className="txt-p-lg font-medium">Mobile Number</label>
                <div className={`flex items-center border ${errors.guestPhone && touched.guestPhone ? 'border-red-500' : 'border-[#E5E5E5]'} rounded-[10px] overflow-hidden focus-within:border-[#C4C4C4] transition-colors`}>
                  <span className="bg-[#F9FAFB] border-r border-[#E5E5E5] px-4 py-3 font-outfit font-medium text-[#121212]">+91</span>
                  <input name="guestPhone" type="tel" placeholder="Your Mobile Number" value={reviewForm.guestPhone} onChange={handleChange} onBlur={handleBlur} className="flex-1 px-4 py-3 outline-none font-outfit text-[#121212] placeholder-[#A3A3A3] w-full" />
                </div>
                {errors.guestPhone && touched.guestPhone && <span className="text-red-500 font-outfit text-sm">{errors.guestPhone}</span>}
              </div>

              {/* Star Rating Selector */}
              <div className="flex flex-col gap-[6px]">
                <label className="txt-p-lg font-medium">
                  Rating <span className="text-red-500">*</span>
                </label>
                <div
                  role="radiogroup"
                  aria-label="Select a star rating"
                  aria-required="true"
                  className="flex items-center gap-[6px]"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || reviewForm.rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={reviewForm.rating === star}
                        aria-label={`${star} out of 5 stars`}
                        onClick={() => {
                          setReviewForm((p) => ({ ...p, rating: star }));
                          setErrors((p) => ({ ...p, rating: "" }));
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                            e.preventDefault();
                            const next = Math.min(5, reviewForm.rating + 1);
                            setReviewForm((p) => ({ ...p, rating: next }));
                            setErrors((p) => ({ ...p, rating: "" }));
                          }
                          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                            e.preventDefault();
                            const prev = Math.max(1, reviewForm.rating - 1);
                            setReviewForm((p) => ({ ...p, rating: prev }));
                          }
                        }}
                        className="p-0.5 transition-transform duration-100 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4EBD63] focus-visible:ring-offset-1 rounded-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23 22" fill="none" className="w-7 h-7 md:w-8 md:h-8" aria-hidden="true">
                          <path
                            d="M11.4127 19L4.35926 21.7082L5 14.5L0 8.2918L7 6.5L11.4127 0L15.5 6.5L22.8253 8.2918L18.4661 14.6894V21.7082L11.4127 19Z"
                            fill={active ? "#4EBD63" : "transparent"}
                            stroke="#4EBD63"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    );
                  })}
                  {reviewForm.rating > 0 && (
                    <span className="ml-1 txt-p text-[#767676] self-center">
                      {reviewForm.rating}/5
                    </span>
                  )}
                </div>
                {errors.rating && (
                  <span className="text-red-500 font-outfit text-sm">{errors.rating}</span>
                )}
              </div>

              <div className="flex flex-col gap-[6px]">
                <label className="txt-p-lg font-medium">Review Title <span className="font-normal text-[#A3A3A3]">(optional)</span></label>
                <input name="title" type="text" placeholder="Add a title for your review..." value={reviewForm.title} onChange={handleChange} className="border border-[#E5E5E5] rounded-[10px] px-4 py-3 outline-none font-outfit text-[#121212] placeholder-[#A3A3A3] focus:border-[#C4C4C4] transition-colors" />
              </div>

              <div className="flex flex-col gap-[6px]">
                <label className="txt-p-lg font-medium">Review Description</label>
                <textarea name="reviewBody" rows={3} placeholder="Type detailed review here..." value={reviewForm.reviewBody} onChange={handleChange} onBlur={handleBlur} className={`border ${errors.reviewBody && touched.reviewBody ? 'border-red-500' : 'border-[#E5E5E5]'} rounded-[10px] px-4 py-3 outline-none font-outfit resize-none text-[#121212] placeholder-[#A3A3A3] focus:border-[#C4C4C4] transition-colors`} />
                {errors.reviewBody && touched.reviewBody && <span className="text-red-500 font-outfit text-sm">{errors.reviewBody}</span>}
              </div>

              <div className="flex items-center gap-[12px] mt-[10px]">
                <ButtonBase type="button" onClick={() => setIsModalOpen(false)} className="flex-1 !bg-black text-white hover:!bg-black/80 transition-colors uppercase font-bold !py-[14px] !px-0 !rounded-[15px]">
                  Cancel
                </ButtonBase>
                <ButtonBase disabled={isSubmitting} type="submit" className={`flex-1 transition-colors uppercase font-bold !py-[14px] !px-0 !rounded-[15px] ${isSubmitting ? '!bg-[#D9DEE3] !text-[#767676] cursor-not-allowed btn-glare-none' : '!bg-[#045830] text-white hover:!bg-[#034524]'}`}>
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>Saving...</span>
                    </div>
                  ) : "Save"}
                </ButtonBase>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}
