import type { Metadata } from "next";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    title: "Refund and Return Policy | PunchRaksha",
    description: "Refund and return policy for PunchRaksha website.",
    alternates: { canonical: "/refund-policy" },
  };
}

export default function RefundPolicyPage() {
  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-[1920px] px-4 lg:px-[50px] py-[40px] md:py-[45px]">
        <h1 className="font-outfit txt-h1 font-bold text-[#121212] mb-[20px]">
          Refund and Return Policy
        </h1>
        <p className="font-outfit txt-p text-[#121212] mb-[20px]">
          Effective Date: 15-04-2026
        </p>

        <div className="max-w-[1200px] space-y-10 font-outfit text-[#121212]">
          <div className="space-y-[20px]">
            <p className="txt-p">
              Thank you for purchasing from PunchRaksha. We strive to provide
              high-quality Ayurvedic wellness products and a reliable shopping
              experience. Please read this Refund and Return Policy carefully
              before placing an order.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              1. Return Request Time Limit
            </h2>
            <p className="txt-p">
              If you receive a damaged, defective, or incorrect product, you
              must raise a return request within 24 hours of delivery.
            </p>
            <p className="txt-p">
              Requests made after 24 hours of delivery will not be accepted.
            </p>
            <p className="txt-p">
              To initiate a request, customers must contact our support team
              and provide clear photos or videos of the product and packaging.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              2. Condition for Return
            </h2>
            <p className="txt-p">To be eligible for a return:</p>
            <ul className="list-disc pl-[20px] space-y-2.5 txt-p mb-4 ml-[6px]">
              <li>The product must be unused and unopened.</li>
              <li>The product must be in its original packaging.</li>
              <li>
                All labels, seals, and packaging materials must remain intact.
              </li>
            </ul>
            <p className="txt-p">
              Due to the hygienic nature of Ayurvedic health products, opened
              or used products cannot be returned.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              3. Reverse Shipping Charges
            </h2>
            <p className="txt-p">
              Customers must initially bear the reverse shipping charges when
              returning a product.
            </p>
            <p className="txt-p">
              This process helps ensure that return requests are genuine and
              prevents misuse of the return system.
            </p>
            <p className="txt-p">
              After the returned product reaches our facility and passes the
              inspection process, we will refund:
            </p>
            <ul className="list-disc pl-[20px] space-y-2.5 txt-p mb-4 ml-[6px]">
              <li>The product amount, and</li>
              <li>The reverse shipping charges paid by the customer</li>
            </ul>
            <p className="txt-p">
              Reverse shipping charges will be reimbursed only if the return
              request is verified as valid after inspection.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              4. Product Inspection After Return
            </h2>
            <p className="txt-p">
              Once the returned product reaches our facility, we will conduct a
              verification process, including recording an unboxing video to
              inspect the returned package.
            </p>
            <p className="txt-p">
              If any of the following situations are identified:
            </p>
            <ul className="list-disc pl-[20px] space-y-2.5 txt-p mb-4 ml-[6px]">
              <li>Product tampering</li>
              <li>Missing items</li>
              <li>Used or opened product</li>
              <li>Damaged packaging caused after delivery</li>
              <li>Any unethical or fraudulent return attempt</li>
            </ul>
            <p className="txt-p">
              Then no refund or reimbursement will be provided.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              5. Damaged or Incorrect Product
            </h2>
            <p className="txt-p">
              If the return request is verified and approved after inspection,
              we may provide either:
            </p>
            <ul className="list-disc pl-[20px] space-y-2.5 txt-p mb-4 ml-[6px]">
              <li>A replacement product, or</li>
              <li>A refund, depending on the situation.</li>
            </ul>
            <p className="txt-p">
              The final decision will be made after inspection of the returned
              product.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">6. Refund Processing</h2>
            <p className="txt-p">If a refund is approved:</p>
            <ul className="list-disc pl-[20px] space-y-2.5 txt-p mb-4 ml-[6px]">
              <li>
                Refunds will be processed to the original payment method used
                during purchase.
              </li>
              <li>
                Processing may take 5–10 business days, depending on the
                payment provider.
              </li>
            </ul>
            <p className="txt-p">
              For Cash on Delivery (COD) orders, refunds may be processed via
              bank transfer or another mutually agreed payment method.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              7. Non-Refundable Situations
            </h2>
            <p className="txt-p">
              Refunds or returns will not be provided in the following cases:
            </p>
            <ul className="list-disc pl-[20px] space-y-2.5 txt-p mb-4 ml-[6px]">
              <li>Return request raised after 24 hours of delivery.</li>
              <li>Opened or used products.</li>
              <li>Products returned without original packaging.</li>
              <li>Product damage caused after delivery.</li>
              <li>Incorrect address provided by the customer.</li>
              <li>Failed delivery due to customer unavailability.</li>
            </ul>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              8. Product Results Disclaimer
            </h2>
            <p className="txt-p">
              Our products are Ayurvedic wellness products. Results may vary
              depending on individual health conditions, lifestyle, and
              adherence to usage guidelines.
            </p>
            <p className="txt-p">
              Refunds will not be issued based on personal expectations
              regarding product results.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              9. Contact for Return Requests
            </h2>
            <p className="txt-p">
              For return or refund assistance, please contact:
            </p>
            <div className="txt-p space-y-[10px]">
              <p>
                Email: &nbsp;
                <a
                  href="mailto:Nithastu.care@gmail.com"
                  className="hover:underline"
                >
                  Nithastu.care@gmail.com
                </a>
              </p>
              <p>Phone: +91 7405498441</p>
              <p>
                Address: E-67 - Parishraram Nagar Division-1, Krishnanagar,
                Ahmedabad-382345
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
