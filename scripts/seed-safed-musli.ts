/**
 * Seed the "Organic Safed Musli Powder" product + its 45 customer reviews.
 *
 * Reuses the existing data layer:
 *   - lib/repositories/product.repository.create()  (same path /api/admin/products uses)
 *   - lib/db/postgres query()                       (parameterized review inserts)
 *   - lib/utils/recalculateRating()                 (syncs overall_rating / total_reviews)
 *
 * Source data extracted from public/Safed Musli Powder.pdf.
 * Idempotent: deletes any existing product with the same slug first (reviews cascade).
 *
 * Run:  npx tsx scripts/seed-safed-musli.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// Convert a Google-Drive /d/<id>/ id into a direct-view URL (same as ProductForm).
const drive = (id: string) => `https://drive.google.com/uc?export=view&id=${id}`;

const IMG = {
  og: drive("1vZWGZPcrq3uoCEWPicp6_makrZFlcwnk"),
  cover: drive("16v3lBnStSkCKtrKJyZyu93AWync72FwQ"), // pure-safed-musli-powder
  pack1: drive("1XU39zF6jw28CHgQZdiKYQWqi6H_Pm-Ae"),
  roots: drive("1gsHnrvx6d52iQSnn7rMOZdciIHpsYepI"),
  benefits: drive("1gOhJWeJPtiEYs0-iqWkYW9BCsc0tbzcT"),
  whyChoose: drive("17KefyMgIiOq7Xz0yfesEx8S14pgjPw0h"),
  howConsume: drive("16CPWalKIRqx0WAMLBcB41aoPDa10INne"),
  withMilk: drive("1SmHXu8bvrXxnATdILXG-o2e8X74oYJRj"),
  pack2: drive("1Z55DZZwySVASj1XL1JPcYD3E2aaeP9bu"),
  pack3: drive("1AoDMMhQ1xYT85m6eMz7O1mSGnzOjSOom"),
  doctor: drive("18CXnp-xaYM3JFTDfHT5vDIS6AMxvePNg"),
};

const SLUG = "organic-safed-musli-powder";

// ── Content tabs (GenericTabEditor TabData shape) ──────────────────────────
const tabs = [
  {
    name: "Key Features",
    title: "Key Features of Our Safed Musli Powder",
    note: "Experience the benefits of pure safed musli powder crafted with care and authenticity, and make it a part of your daily routine to support natural strength, balanced energy levels, and long-term wellness without relying on artificial or chemically processed supplements",
    items: [
      "100% pure and natural safed musli powder with no added fillers or synthetic ingredients, ensuring clean composition, authentic quality, and a product you can trust for daily use",
      "Sourced directly from trusted farms where musli is grown under controlled conditions, ensuring better traceability, consistent quality, and confidence in every batch you consume regularly",
      "Clean and careful processing methods are used to maintain the natural integrity of safed musli powder, preserving its original properties without exposure to harmful chemicals or unnecessary alterations",
      "Rich in naturally occurring bioactive compounds, this safed musli powder supports overall body performance while maintaining a balanced and natural approach to wellness without relying on artificial enhancements",
      "Carefully selected musli roots are dried under controlled conditions to retain essential nutrients, ensuring the final product maintains its potency, effectiveness, and suitability for long-term daily consumption",
      "Smooth and finely milled safed musli powder offers a consistent texture that blends easily with milk or beverages, making it convenient to include in your daily routine without affecting taste or experience",
      "Each batch of safed musli powder undergoes strict quality checks to maintain uniformity, ensuring that you receive the same level of purity, performance, and consistency every time you choose our product",
      "Packed using hygienic methods to protect freshness and prevent contamination, helping preserve the natural aroma, potency, and long-lasting quality of safed musli powder throughout its shelf life",
      "Free from artificial colors, preservatives, and additives, making it a clean and natural choice for those who prefer simple, effective, and trustworthy herbal products for their everyday health routine",
      "Suitable for regular use, this safed musli powder is designed to integrate seamlessly into your lifestyle, offering a natural approach to supporting strength, endurance, and overall well-being without complications",
    ].map((text) => ({ text, image: "", label: "", altText: "" })),
  },
  {
    name: "Benefits",
    title: "Benefits of Safed Musli Powder",
    note: "Start your journey with safed musli powder today and give your body the natural support it needs to build strength, improve endurance, and maintain steady energy levels, helping you stay active, balanced, and consistent in your daily routine without dependence on artificial solutions",
    items: [
      "Safed musli powder helps support natural energy levels throughout the day, making it easier to stay active and productive without feeling tired or drained during regular daily activities",
      "Regular use of safed musli powder contributes to improved physical endurance, helping the body handle daily stress, workload, and physical efforts more efficiently over time",
      "Safed musli powder supports overall vitality by nourishing the body naturally, helping maintain internal balance and promoting a steady feeling of strength and well-being",
      "Consuming safed musli powder may help improve stamina gradually, making it beneficial for individuals looking to enhance their physical performance without relying on artificial supplements",
      "Safed musli powder is known to support muscle recovery and reduce weakness, helping the body regain strength after physical exertion or long working hours",
      "With its natural composition, safed musli powder helps maintain a balanced lifestyle by supporting consistent energy levels without sudden spikes or crashes",
      "Safed musli powder plays a role in supporting overall body function, helping maintain strength, endurance, and resilience as part of a daily wellness routine",
      "It helps reduce feelings of fatigue and supports sustained activity levels, making it useful for people who often experience low energy or physical tiredness",
      "Safed musli powder supports general wellness by working with the body naturally, helping maintain long-term strength without disrupting normal body processes",
      "Regular inclusion of safed musli powder in your routine can help build a consistent foundation for better energy, endurance, and overall physical stability",
    ].map((text) => ({ text, image: "", label: "", altText: "" })),
  },
  {
    name: "How to Take",
    title: "How to Take Safed Musli Powder",
    note: "Start your routine with safed musli powder today and support natural strength, stamina, and balanced energy levels, helping you stay active, consistent, and aligned with your long-term wellness goals naturally",
    items: [
      { label: "Timing", text: "Take safed musli powder once daily, either in the morning on an empty stomach or before bedtime for better absorption and consistent results", image: "", altText: "" },
      { label: "Dosage", text: "1 teaspoon (approx. 3–5 grams) of safed musli powder per day", image: "", altText: "" },
      { label: "Method", text: "Mix with 1 glass of warm milk and add a small amount of ghee and honey, then stir well until smooth for better taste and effectiveness", image: "", altText: "" },
      { label: "Important Tips", text: "Start with a smaller quantity, use regularly for best results, and avoid exceeding the recommended daily intake", image: "", altText: "" },
    ],
  },
  {
    name: "Who Should Use",
    title: "Who Should Use Safed Musli Powder",
    note: "Add safed musli powder to your daily routine and support natural strength, stamina, and balanced energy levels, helping you stay active, consistent, and aligned with long-term wellness goals without artificial support systems",
    items: [
      { label: "Adults", text: "Looking to maintain consistent energy, natural strength, and overall wellness through a simple daily routine that supports long-term health without relying on artificial supplements" },
      { label: "Working Professionals", text: "Managing long working hours, mental pressure, and physical fatigue, and needing a natural way to maintain steady energy, focus, and endurance throughout the day" },
      { label: "Fitness Enthusiasts", text: "Engaged in regular workouts and physical activity, and looking for safed musli powder to support stamina, recovery, and performance without adding synthetic or chemical-based supplements" },
      { label: "People with Weakness", text: "Experiencing general body weakness, low strength, or reduced physical capacity, and seeking a natural herbal solution that helps improve daily functioning gradually and safely" },
      { label: "Men", text: "Looking to support overall vitality, internal balance, and consistent performance through traditional herbs like safed musli powder that align with long-term wellness goals" },
      { label: "Busy Individuals", text: "Handling hectic schedules and daily responsibilities, and needing reliable natural support from safed musli powder to maintain energy and prevent burnout over time" },
      { label: "People with Fatigue", text: "Frequently feeling tired or lacking motivation, and searching for a natural way to support sustained energy levels and improve daily activity without sudden energy crashes" },
      { label: "Recovery Phase Individuals", text: "Recovering from illness, physical exhaustion, or weakness, and aiming to rebuild strength, stamina, and overall body function using safe and natural herbal support" },
      { label: "Health-Conscious Individuals", text: "Focused on clean living and natural wellness, and choosing safed musli powder as a simple addition to their routine for supporting strength and balanced energy" },
      { label: "General Users", text: "Anyone who wants to maintain daily vitality, support endurance, and improve overall well-being naturally through consistent use of safed musli powder in their routine" },
    ].map((x) => ({ ...x, image: "", altText: "" })),
  },
  {
    name: "Guidelines",
    title: "Guidelines for Using Safed Musli Powder",
    note: "Follow these simple guidelines while using safed musli powder to ensure proper storage, safe consumption, and consistent daily intake, helping you achieve better results, maintain product quality, and support long-term wellness naturally without complications",
    items: [
      "Store safed musli powder in a cool and dry place away from direct sunlight to maintain its natural quality, prevent degradation, and ensure long-lasting freshness throughout its usage period",
      "Transfer the pouch of safed musli powder into an airtight container after opening to protect it from air exposure, humidity, and environmental factors that may affect its purity",
      "Always zip the pouch properly after each use to maintain freshness and prevent contamination, ensuring that safed musli powder remains clean, safe, and effective for daily consumption",
      "Keep the container tightly sealed so safed musli powder retains its natural aroma, texture, and potency, allowing you to experience consistent quality with every use",
      "Use a dry spoon while handling safed musli powder to maintain hygiene standards and avoid introducing moisture that could affect the product's texture and shelf life",
      "Avoid any contact with water or moisture during storage or usage, as this helps preserve the natural consistency and effectiveness of safed musli powder over time",
      "Follow the recommended daily intake guidelines to ensure safe and effective use, helping your body adapt naturally without overconsumption or unnecessary strain",
      "Consult a healthcare professional before use if you are pregnant, nursing, or under medication, to ensure safe integration into your daily routine",
      "Keep the product out of reach of children to avoid accidental consumption and ensure safe handling at all times within your household",
      "Maintain regular usage of safed musli powder as part of your routine to support long-term results and consistent benefits without interruptions",
    ].map((text) => ({ text, image: "", label: "", altText: "" })),
  },
];

const faqs = [
  { question: "What is safed musli powder and how does it work?", answer: "Safed musli powder is a natural Ayurvedic herbal powder made from the roots of the safed musli plant. It is traditionally used to support strength, stamina, and overall vitality. The presence of natural bioactive compounds helps the body function more efficiently. It works gradually by nourishing the body from within. Regular use supports long-term wellness without relying on artificial supplements." },
  { question: "How should I consume safed musli powder daily?", answer: "Safed musli powder is usually taken once daily in a measured quantity. It can be mixed with warm milk for better absorption and effectiveness. Many people also add a small amount of ghee and honey for improved taste. It is best consumed either in the morning on an empty stomach or before bedtime. Consistency in usage is important for better results over time." },
  { question: "What is the recommended dosage of safed musli powder?", answer: "The general recommended dosage of safed musli powder is around 3 to 5 grams per day. This is approximately equal to one teaspoon. It is always better to start with a smaller quantity and gradually increase if needed. Avoid exceeding the recommended intake to ensure safe usage. Following proper dosage helps the body adapt naturally and effectively." },
  { question: "Who can use safed musli powder?", answer: "Safed musli powder can be used by adults looking to support strength, stamina, and energy levels. It is suitable for people experiencing weakness or fatigue in their daily routine. Fitness enthusiasts and working professionals can also benefit from its natural support. It fits well into a healthy lifestyle focused on natural wellness. However, individual needs may vary depending on health conditions." },
  { question: "Are there any side effects of safed musli powder?", answer: "Safed musli powder is generally considered safe when taken in recommended amounts. Since it is a natural herbal product, it works gently on the body. Overconsumption may cause mild discomfort in some individuals. It is important to follow the advised dosage and usage guidelines. If you have any medical condition, it is better to consult a healthcare professional before use." },
  { question: "Can safed musli powder be taken daily?", answer: "Yes, safed musli powder can be taken daily as part of a regular wellness routine. Consistent use helps support long-term strength and energy levels. It works gradually, so results may improve over time with regular intake. Make sure to follow proper dosage and timing for best results. Maintaining consistency is key to experiencing its full benefits." },
  { question: "How long does it take to see results from safed musli powder?", answer: "The results of safed musli powder may vary from person to person. Some individuals may notice improvements in energy and stamina within a few weeks. For others, it may take longer depending on lifestyle and consistency. It is not an instant solution but works gradually with regular use. Long-term usage supports better and more sustainable results." },
  { question: "Can I take safed musli powder with other supplements?", answer: "Safed musli powder can usually be taken along with other natural supplements. However, combining multiple products should be done carefully. It is important to ensure there is no overlap in ingredients or dosage. If you are taking medicines or other supplements, consult a healthcare professional. This helps avoid any unwanted interactions and ensures safe usage." },
  { question: "How should safed musli powder be stored?", answer: "Safed musli powder should be stored in a cool and dry place away from direct sunlight. After opening the pack, it is best to transfer it to an airtight container. This helps protect it from moisture and contamination. Always use a dry spoon while handling the powder. Proper storage helps maintain freshness and effectiveness for a longer time." },
  { question: "Is safed musli powder suitable for long-term use?", answer: "Yes, safed musli powder is suitable for long-term use when taken in recommended amounts. It is designed to support gradual and sustainable wellness. Regular intake can help maintain strength, stamina, and overall vitality. Since it is natural, it fits well into a daily routine. Consistency and proper usage are important for long-term benefits." },
];

const product = {
  name: "Organic Safed Musli Powder",
  secondaryName: "Premium Swet Musli Powder",
  slug: SLUG,
  shortDescription: "Premium safed musli made from carefully selected roots to help boost endurance, performance, and overall wellness.",
  description: "Premium safed musli made from carefully selected roots to help boost endurance, performance, and overall wellness.",
  category: "Ayurvedic",
  price: 980,
  discountedPrice: 675,
  discountPercent: 31,
  upiDiscountPercent: 10,
  upiMaxDiscount: 60,
  cardDiscountPercent: 5,
  cardMaxDiscount: 25,
  inStock: true,
  isBestSelling: true,
  isUpsellProduct: false,
  codAvailable: true,
  images: [
    { url: IMG.cover, altText: "pure organic safed musli powder", filename: "pure-safed-musli-powder" },
    { url: IMG.pack1, altText: "safed musli powder pack of 1 pouch", filename: "safed-musli-powder-pack-of-1" },
    { url: IMG.roots, altText: "fresh safed musli roots sourced from farmers", filename: "farm-sourced-safed-musli-roots" },
    { url: IMG.benefits, altText: "benefits of safed musli powder", filename: "benefits-of-safed-musli-powder" },
    { url: IMG.whyChoose, altText: "why our safed musli powder is best quality", filename: "why-choose-our-safed-musli-powder" },
    { url: IMG.howConsume, altText: "safed musli powder dosage and usage method", filename: "how-to-consume-safed-musli-powder" },
    { url: IMG.withMilk, altText: "safed musli powder mixed with warm milk honey ghee", filename: "safed-musli-powder-with-milk-ghee-honey" },
    { url: IMG.pack2, altText: "safed musli powder pack of 2 pouches", filename: "safed-musli-powder-pack-of-2" },
    { url: IMG.pack3, altText: "safed musli powder pack of 3 pouches", filename: "safed-musli-powder-pack-of-3" },
  ],
  packOptions: [
    { label: "Pack of 1", badge: "Best Seller", contents: "100 GRAM", price: 675, mrp: 980, discountPercent: 31, image: IMG.pack1 },
    { label: "Pack of 2", badge: "Most Popular", contents: "200 GRAM", price: 1299, mrp: 1960, discountPercent: 33, image: IMG.pack2 },
    { label: "Pack of 3", badge: "Best Recommended", contents: "300 GRAM", price: 1927, mrp: 2940, discountPercent: 35, image: IMG.pack3 },
  ],
  tabs,
  faqs,
  ingredients: [
    {
      name: "Safed Musli (Chlorophytum borivilianum)",
      description: "Traditionally processed safed musli powder, rich in naturally occurring bioactive compounds like saponins and alkaloids. Smooth, finely milled and made from hand-picked roots to preserve its natural purity.",
      image: "",
      altText: "fresh safed musli roots sourced from farmers",
    },
  ],
  productDetails: {
    brand: "PunchRaksha",
    shelfLife: "18 Months",
    dosageForm: "Herbal Powder",
    netQuantity: "100g (Pack of 1) | 200g (Pack of 2) | 300g (Pack of 3)",
    tabTitle: "Product Info",
    productLabel: "Safed Musli Powder (Ayurvedic Herbal Supplement)",
    fullDescription: "A natural, plant-based safed musli powder made from carefully selected roots, designed to support daily strength, stamina, and overall vitality. Prepared using traditional methods, it helps maintain energy levels and supports a balanced, healthy lifestyle naturally.",
    taste: "Mild herbal",
    bestTimeToConsume: "Morning on an empty stomach or before bedtime as per routine",
    expectedReliefTime: "",
    includedProducts: "",
  },
  heroUsps: ["Farm-Fresh", "Supports Vitality", "Enhances Strength", "Boosts Stamina"],
  tags: [
    { title: "Farm-Fresh", color: "#e4f5e8" },
    { title: "Supports Vitality", color: "#e4f5e8" },
    { title: "Enhances Strength", color: "#e4f5e8" },
    { title: "Boosts Stamina", color: "#e4f5e8" },
  ],
  importantNotes: ["Inclusive of all taxes | Proudly Made in India"],
  promoStripEnabled: true,
  promoStripText: "FREE Shilajit Worth ₹599 on Orders Above ₹1399",
  featuredImage: IMG.cover,
  featuredImageAlt: "pure organic safed musli powder",
  featuredLabel: "",
  featuredSubLabel: "",
  // Consultation block (Dr. Sahil Chauhan)
  consultationHeading: "Dr. Sahil Chauhan – Ayurvedic Doctor (BAMS)",
  consultationSubheading: "Get personalized guidance for using safed musli powder the right way",
  consultationDescription: "Our experienced team is here to understand your health goals and guide you on the correct use of safed musli powder. Whether you have questions about dosage, timing, lifestyle, or daily routine, you will receive simple and practical advice tailored to your needs. This helps ensure safe usage, better results, and long-term wellness support with confidence.",
  consultationCtaText: "TAKE CONSULTATION NOW",
  consultationCtaLink: "/contact",
  consultationImage: IMG.doctor,
  consultationImageAlt: "dr Shail Chauhan BAMS Ayurvedic doctor",
  // SEO
  metaTitle: "Organic Safed Musli Powder | Natural Strength & Vitality Booster",
  metaDescription: "Get premium quality Safed Musli powder, carefully sourced from farmers. Supports strength, endurance, and daily energy with easy consumption.",
  ogTitle: "Organic Safed Musli Powder | Natural Strength & Vitality Booster",
  ogDescription: "Get premium quality Safed Musli powder, carefully sourced from farmers. Supports strength, endurance, and daily energy with easy consumption.",
  ogImageUrl: IMG.og,
  ogImageAlt: "premium organic safed musli powder",
  twitterTitle: "Organic Safed Musli Powder | Natural Strength & Vitality Booster",
  twitterDescription: "Get premium quality Safed Musli powder, carefully sourced from farmers. Supports strength, endurance, and daily energy with easy consumption.",
};

// ── 45 reviews (rating, name, location, optional title, body, date) ────────
type R = { rating: number; name: string; location: string; title?: string; body: string; date: string };
const reviews: R[] = [
  { rating: 4, name: "Amit Sharma", location: "Delhi", body: "15 din use ke baad likh raha hu, thik hai kaam karta hai, stamina me halka improvement feel ho raha", date: "18 Jan 2026" },
  { rating: 5, name: "Kunal Mehta", location: "Mumbai, Maharashtra", body: "haan to ye product acha hai... use kar raha hu daily, seriously expect nahi kiya tha itna acha hoga", date: "20 Jan 2026" },
  { rating: 3, name: "Ravi Kumar", location: "Patna, Bihar", body: "taste acha nahi hai but result mil raha, matlab theek hi hai", date: "22 Jan 2026" },
  { rating: 4, name: "Sandeep Yadav", location: "Lucknow, Uttar Pradesh", title: "Decent Product", body: "abhi sure nahi hu but thoda better lag raha, continue karunga", date: "25 Jan 2026" },
  { rating: 5, name: "Harsh Patel", location: "Ahmedabad, Gujarat", body: "acha hai acha hai, papa bhi use kar rahe, unko bhi thakan kam lag rahi", date: "27 Jan 2026" },
  { rating: 4, name: "Imran Khan", location: "Bhopal, Madhya Pradesh", body: "ok product use kr raha hu, 2 hafte me farak dikha thoda", date: "30 Jan 2026" },
  { rating: 5, name: "Vikram Singh", location: "Jaipur, Rajasthan", title: "Worth Trying", body: "pehle wala itna kaam nahi kiya, ye better lag raha honestly", date: "2 Feb 2026" },
  { rating: 3, name: "Deepak Das", location: "Kolkata, West Bengal", body: "waise thik hi hai, abhi full sure nahi hu but energy me halka change hai", date: "5 Feb 2026" },
  { rating: 5, name: "Nitin Verma", location: "Kanpur, Uttar Pradesh", body: "badiya hai... office me thakan kam ho rahi, use continue karunga", date: "7 Feb 2026" },
  { rating: 4, name: "Suresh Iyer", location: "Chennai, Tamil Nadu", title: "Good Experience So Far", body: "15 din use ke baad bol raha hu, acha hai, stamina improve lag raha", date: "10 Feb 2026" },
  { rating: 5, name: "Arjun Nair", location: "Kochi, Kerala", body: "sach me acha product hai, gym performance thodi improve hui", date: "12 Feb 2026" },
  { rating: 3, name: "Manoj Tiwari", location: "Varanasi, Uttar Pradesh", body: "matlab theek hi hai, result aa raha slow slow", date: "14 Feb 2026" },
  { rating: 5, name: "Rahul Jadhav", location: "Pune, Maharashtra", body: "jhakkas hai... seriously energy better feel ho rahi", date: "16 Feb 2026" },
  { rating: 4, name: "Ankit Gupta", location: "Noida, Uttar Pradesh", title: "Nice Product", body: "acha hai but taste thoda strong hai, still use kar raha hu", date: "18 Feb 2026" },
  { rating: 5, name: "Prakash Gowda", location: "Bangalore, Karnataka", body: "wow nice", date: "20 Feb 2026" },
  { rating: 4, name: "Ramesh Pillai", location: "Trivandrum, Kerala", body: "ye product mujhe help kiya, thoda stamina increase lag raha", date: "22 Feb 2026" },
  { rating: 5, name: "Sunil Chauhan", location: "Dehradun, Uttarakhand", body: "gym ke liye liya tha, acha result mil raha abhi", date: "24 Feb 2026" },
  { rating: 3, name: "Vivek Singh", location: "Patiala, Punjab", body: "abhi sure nahi hu but thoda better lag raha, dekhte hai", date: "26 Feb 2026" },
  { rating: 5, name: "Ketan Shah", location: "Surat, Gujarat", body: "acha hai... use kar raha hu daily, consistency se hi result aata hai", date: "28 Feb 2026" },
  { rating: 4, name: "Rajiv Menon", location: "Coimbatore, Tamil Nadu", title: "Satisfied", body: "office me thakan kam ho rahi, overall acha experience hai", date: "2 Mar 2026" },
  { rating: 5, name: "Ashish Mishra", location: "Allahabad, Uttar Pradesh", body: "mast hai bhai, energy boost lag raha", date: "4 Mar 2026" },
  { rating: 3, name: "Naresh Yadav", location: "Gurgaon, Haryana", body: "thik hai kaam karta hai, kuch special nahi but useful", date: "6 Mar 2026" },
  { rating: 5, name: "Tarun Bansal", location: "Ludhiana, Punjab", body: "seriously acha laga, expect nahi kiya tha itna", date: "8 Mar 2026" },
  { rating: 4, name: "Pankaj Kulkarni", location: "Nagpur, Maharashtra", title: "Good for Routine", body: "daily use kar raha hu, stamina me halka improvement hai", date: "10 Mar 2026" },
  { rating: 5, name: "Rohit Das", location: "Bhubaneswar, Odisha", body: "acha hai acha hai... continue karunga", date: "12 Mar 2026" },
  { rating: 3, name: "Sanjay Singh", location: "Ranchi, Jharkhand", body: "taste thoda ajeeb hai but result mil raha", date: "14 Mar 2026" },
  { rating: 5, name: "Deepak Sharma", location: "Chandigarh", body: "gym ke liye liya tha, stamina improve lag raha", date: "16 Mar 2026" },
  { rating: 4, name: "Manish Agarwal", location: "Kolkata, West Bengal", title: "Nice Result", body: "2 hafte me farak dikha, acha product hai", date: "18 Mar 2026" },
  { rating: 5, name: "Naveen Reddy", location: "Hyderabad, Telangana", body: "badiya hai, energy stable lag rahi", date: "20 Mar 2026" },
  { rating: 3, name: "Rajesh Kumar", location: "Patna, Bihar", body: "matlab theek hi hai, use kar raha hu", date: "22 Mar 2026" },
  { rating: 5, name: "Anurag Srivastava", location: "Lucknow, Uttar Pradesh", body: "haan to ye product acha hai, thoda stamina improve lag raha", date: "24 Mar 2026" },
  { rating: 4, name: "Dinesh Solanki", location: "Indore, Madhya Pradesh", title: "Worth Buying", body: "acha hai, papa bhi use kar rahe, unko bhi benefit hai", date: "26 Mar 2026" },
  { rating: 5, name: "Sameer Khan", location: "Mumbai, Maharashtra", body: "sach me acha product hai, energy better feel ho rahi", date: "28 Mar 2026" },
  { rating: 3, name: "Kishore Patil", location: "Kolhapur, Maharashtra", body: "abhi sure nahi hu but use continue kar raha", date: "30 Mar 2026" },
  { rating: 5, name: "Harpreet Singh", location: "Amritsar, Punjab", body: "jhakkas hai... mast product", date: "1 Apr 2026" },
  { rating: 4, name: "Ajay Dubey", location: "Bhopal, Madhya Pradesh", title: "Good Purchase", body: "office me thakan kam ho rahi, acha laga", date: "3 Apr 2026" },
  { rating: 5, name: "Rakesh Jain", location: "Jaipur, Rajasthan", body: "acha hai acha hai, recommend karunga", date: "5 Apr 2026" },
  { rating: 3, name: "Sahil Verma", location: "Delhi", body: "ok product use kr raha hu, dekhte hai", date: "7 Apr 2026" },
  { rating: 5, name: "Varun Nair", location: "Kochi, Kerala", body: "wow nice", date: "9 Apr 2026" },
  { rating: 4, name: "Mahesh Choudhary", location: "Jodhpur, Rajasthan", title: "Satisfied with Results", body: "15 din baad likh raha hu, thoda improvement feel hua", date: "11 Apr 2026" },
  { rating: 5, name: "Gaurav Pandey", location: "Varanasi, Uttar Pradesh", body: "gym ke liye liya tha, result mil raha", date: "13 Apr 2026" },
  { rating: 3, name: "Nitin Chauhan", location: "Meerut, Uttar Pradesh", body: "matlab theek hi hai, use kar raha hu", date: "15 Apr 2026" },
  { rating: 5, name: "Suresh Yadav", location: "Gorakhpur, Uttar Pradesh", body: "seriously acha product hai, energy better", date: "17 Apr 2026" },
  { rating: 4, name: "Kamal Joshi", location: "Udaipur, Rajasthan", title: "Good Quality", body: "acha hai, taste thoda adjust karna padta hai", date: "19 Apr 2026" },
  { rating: 5, name: "Rohit Gupta", location: "Delhi", body: "badiya hai... daily use me easy hai", date: "21 Apr 2026" },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set (.env / .env.local)");
    process.exit(1);
  }
  // Dynamic imports AFTER env is loaded (postgres.ts captures DATABASE_URL at module load).
  const productsRepo = await import("@/lib/repositories/product.repository");
  const { query } = await import("@/lib/db/postgres");

  // Idempotent: remove any prior copy (reviews cascade via FK ON DELETE CASCADE).
  const existing = await productsRepo.findBySlug(SLUG);
  if (existing) {
    await productsRepo.deleteBySlug(SLUG);
    console.log(`↺ Removed existing product '${SLUG}' (and its reviews).`);
  }

  const created = await productsRepo.create(product);
  console.log(`✅ Product created: ${created.name}  (id ${created._id})`);

  // Insert reviews with their original dates (the admin API forces now(), so we
  // insert directly into the same reviews table to preserve PDF dates).
  let inserted = 0;
  for (const r of reviews) {
    const createdAt = new Date(`${r.date} 12:00:00`);
    await query(
      `INSERT INTO reviews (product_id, guest_name, guest_phone, rating, title, body, is_verified, status, added_by_admin, created_at)
       VALUES ($1, $2, '', $3, $4, $5, true, 'approved', true, $6)`,
      [created._id, `${r.name} (${r.location})`, r.rating, r.title ?? "", r.body, createdAt],
    );
    inserted++;
  }
  console.log(`✅ Inserted ${inserted} approved reviews.`);

  // products.overall_rating / total_reviews are maintained automatically by the
  // reviews aggregate trigger as the rows above are inserted.
  const updated = await productsRepo.findBySlug(SLUG);
  console.log(`✅ Rating aggregated by trigger: ${updated?.overallRating} ★ across ${updated?.totalReviews} reviews`);
  console.log(`\n🔗 View at: /product/${SLUG}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
