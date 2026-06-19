# PunchRaksha – Complete Herbal E‑Commerce Platform Documentation

---

## 1. Introduction

**PunchRaksha** is a full‑stack, modern web platform that lets customers discover, explore, and purchase Ayurvedic‑based herbal products online.  It also provides a secure **Admin Panel** that lets business owners and staff manage the entire catalogue, orders, blogs, and users.

- **Purpose** – Bring traditional herbal health solutions to a digital marketplace while giving the business full control over inventory, content, and customer interactions.
- **Target Users** –
  - **Customers** – Anyone looking to browse and buy herbal products.
  - **Administrators** – Store owners, marketing teams, and support staff who manage the catalogue, process orders, publish blogs, and configure the site.

---

## 2. Key Features (Customer‑Facing)

### 2.1 User Registration & Login
- Simple sign‑up with email + password or social login (if enabled).
- Forgot‑password flow using a secure email link.
- Persistent session with **remember‑me** option.

### 2.2 Browse Products
- **Categories** – Products are grouped (e.g., Digestion, Skin Care, Immunity).
- **Filters** – Price range, health benefit, pack size, popularity.
- **Search** – Keyword search with instant suggestions.
- Grid/list view with product thumbnails, price, and quick‑add button.

### 2.3 Product Details Page
- High‑resolution images with zoom.
- Full description, ingredients, usage instructions, and health benefits.
- Pricing, discounts, stock availability, and pack options.
- Customer reviews and rating.
- **Add to Cart** and **Add to Wishlist** buttons.

### 2.4 Cart & Wishlist
- Real‑time cart summary in the header.
- Adjust quantity, remove items, or move to wishlist.
- Wishlist saves items for later, accessible from the user profile.

### 2.5 Checkout Process
1. **Shipping Address** – Enter or select saved address.
2. **Payment Method** – Choose **UPI**, **Card**, or **Cash on Delivery**.
3. **Order Review** – See subtotal, discounts, taxes, and grand total.
4. **Place Order** – Order is saved, inventory is reduced, and a confirmation email is sent.

### 2.6 Payment Integration
- Integrated with **Razorpay** for UPI and card payments.
- Secure token generation on the server, payment verification via HMAC signature.
- Payments are captured automatically for prepaid orders.

### 2.7 Order Tracking
- Customers view a list of their orders with status badges: *Pending*, *Processing*, *Shipped*, *Delivered*, *Cancelled*.
- Click an order to see details, shipping tracking number (if applicable), and payment information.

### 2.8 Blog Reading Section
- Blog list page shows titles, excerpts, and featured images.
- Individual blog pages provide health articles, product tips, and news.
- Search and tag filters help readers find relevant content.

---

## 3. Key Features (Admin Panel)

The admin panel lives under `/admin` and is protected by role‑based authentication.

### 3.1 Dashboard Overview
- **Summary Cards** – Total Sales, Total Orders, Total Products, Published Blogs.
- **Recent Orders** – Quick glimpse of latest orders with status and amount.
- **Quick Links** – Buttons to add a product, write a blog, or view users.

### 3.2 Product Management
| Action | What it does | Typical Use Case |
|--------|--------------|-----------------|
| **Add Product** | Fill a form with name, description, categories, pricing, stock, images, and optional pack options. | Launch a new herbal formulation. |
| **Update Product** | Edit any field, replace images, adjust inventory levels. | Update price after a promotion or correct a typo. |
| **Delete Product** | Permanently removes the product from the catalogue. | Discontinue an out‑of‑stock item. |
| **Category Management** | Create, rename, or reorder product categories. | Organise new product lines under a fresh category. |
| **Image Gallery** | Drag‑and‑drop image ordering, set a primary image. | Refresh product visuals for marketing. |

### 3.3 Order Management
- **View Orders** – List with filters by status, date, or customer.
- **Order Detail** – Shows items, shipping address, payment method, and transaction ID.
- **Status Update** – Change status from *Pending* → *Paid* → *Shipped* → *Delivered* or *Cancelled*.
- **Automatic Emails** – System sends status‑change notifications to the customer.

### 3.4 Blog Management
- **Create Blog** – Title, featured image, rich text editor, tags.
- **Edit Blog** – Update content or change publishing status.
- **Delete Blog** – Remove obsolete articles.
- **Publish/Unpublish Toggle** – Control visibility on the public site.

### 3.5 User Management (if enabled)
- List registered customers with basic profile information.
- Ability to **disable** or **delete** a user account.
- View purchase history per user for support purposes.

### 3.6 Content Management (CMS)
- **Banners & Hero Sections** – Upload carousel images, set call‑to‑action links.
- **Homepage Blocks** – Enable/disable sections such as “Best Selling” or “Special Offers”.
- **Static Pages** – Edit privacy policy, terms, and other legal pages via a markdown editor.

---

## 4. Workflow Explanation

### 4.1 Customer Journey
1. **Visit** – Landing page (`/`).
2. **Explore** – Browse categories, use filters, or search.
3. **Select** – Open a product page, read details, add to cart.
4. **Checkout** – Provide shipping address, choose payment method, review order.
5. **Pay** – Complete payment (Razorpay) or place a COD order.
6. **Confirm** – Receive order confirmation email and view order in “My Orders”.
7. **Track** – Monitor order status until delivery.

### 4.2 Admin Workflow
1. **Login** – Admin enters credentials on `/admin-login`.
2. **Dashboard** – Gets a snapshot of sales and recent activity.
3. **Add Products** – Use “Add Product” form, upload images, set stock.
4. **Receive Orders** – New orders appear in the Orders list.
5. **Process** – Verify payment, update inventory, change status to *Shipped*.
6. **Communicate** – System sends status emails; admin can add tracking numbers.
7. **Publish Content** – Write blog posts or update homepage banners to drive traffic.

---

## 5. Admin Panel Access

- URL: `https://<your‑domain>/admin-login`
- **Credentials** – Provided by the business owner (email & password).  The default admin credentials (for a fresh install) are:
  - **Email**: `nanobananasanjayshah@gmail.com`
  - **Password**: `Juice123!!`
- **Security** –
  - Passwords are hashed and stored securely.
  - Session expires after a period of inactivity.
  - Role‑based access: only users with the **admin** role can reach the panel.

---

## 6. Technical Overview (High‑Level)

| Layer | Technology |
|-------|------------|
| **Frontend** | React with **Next.js** (SSR/SSG), TailwindCSS for styling, TypeScript for type safety.
| **Backend/API** | Next.js API routes (Node.js), authentication via JWT, Razorpay SDK for payments.
| **Database** | MongoDB Atlas (cloud‑hosted) – collections for Users, Products, Orders, Blogs.
| **Hosting** | Frontend deployed on **Vercel** (or AWS Amplify), API functions run on the same platform, database accessed via secure connection string.
| **CI/CD** | GitHub Actions trigger builds on push to the main branch.
| **Environment** | `.env.local` holds secrets such as `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and MongoDB connection URI.

---

## 7. Benefits of the System
- **Easy Product Management** – Add or update items without touching code.
- **Scalable Architecture** – Serverless API scales automatically with traffic.
- **Content Marketing** – Blog module helps improve SEO and educate customers.
- **Real‑Time Order Tracking** – Both customers and staff see live order status.
- **Secure Payments** – Razorpay handles PCI‑DSS compliance.
- **Multi‑Device Friendly** – Responsive design works on desktop, tablet, and mobile.

---

## 8. Future Enhancements (Optional)
- **Discount & Coupon Engine** – Create percentage or fixed‑amount coupons.
- **Advanced Analytics Dashboard** – Graphs for sales trends, top‑selling items, and user acquisition.
- **Multi‑Vendor Marketplace** – Allow third‑party sellers to list products under a unified storefront.
- **Mobile App** – Native iOS/Android app for push notifications and offline browsing.
- **Loyalty Program** – Points system rewarding repeat purchases.

---

## 9. Support & Maintenance
- **Version Updates** – New releases are deployed via automated CI; administrators receive a changelog email.
- **Bug Reporting** – Use the built‑in “Support” ticket form or contact the development team at `support@punchraksha.com`.
- **Backup Strategy** – Daily MongoDB snapshots are stored; rollback is possible via admin tools.
- **Service Level** – 99.9 % uptime SLA on the hosting platform; critical issues are addressed within 4 hours.

---

*Prepared for business stakeholders to understand, operate, and grow the PunchRaksha Herbal E‑Commerce platform.*
