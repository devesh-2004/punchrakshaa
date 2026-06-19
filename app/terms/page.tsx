import type { Metadata } from "next";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    title: "Terms of Service | PunchRaksha",
    description: "Terms of Service for PunchRaksha website.",
    alternates: { canonical: "/terms" },
  };
}

export default function TermsOfServicePage() {
  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-[1920px] px-4 lg:px-[50px] py-[40px] md:py-[45px]">
        <h1 className="font-outfit txt-h1 font-bold text-[#121212] mb-[20px]">
          Terms of Service
        </h1>
        <p className="font-outfit txt-p text-[#121212] mb-[20px]">
          Effective Date: 15-04-2026
        </p>

        <div className="max-w-[1200px] space-y-10 font-outfit text-[#121212]">
          <div className="space-y-[20px]">
            <p className="txt-p">
              Welcome to PunchRaksha. By accessing or using our website,
              products, or services, you agree to comply with and be bound by
              the following Terms of Service.
            </p>
            <p className="txt-p">
              Please read these terms carefully before using our website.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              1. Acceptance of Terms
            </h2>
            <p className="txt-p">
              By visiting our website, purchasing our products, or using our
              consultation services, you agree to these Terms of Service, along
              with our Privacy Policy and Refund &amp; Return Policy.
            </p>
            <p className="txt-p">
              If you do not agree with these terms, you should not use our
              website or services.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              2. Nature of Our Products
            </h2>
            <p className="txt-p">
              The products available on this website are Ayurvedic wellness
              products categorized as nutraceuticals under FSSAI regulations.
            </p>
            <p className="txt-p">
              These products are intended to support general wellness and
              lifestyle management.
            </p>
            <p className="txt-p">
              They are not intended to diagnose, treat, cure, or prevent any
              disease, unless specifically stated under applicable regulatory
              approval.
            </p>
            <p className="txt-p">
              Customers are encouraged to consult a qualified healthcare
              professional for serious medical conditions.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              3. Consultation Support
            </h2>
            <p className="txt-p">
              In certain cases, customers may contact us seeking guidance
              regarding their health concerns.
            </p>
            <p className="txt-p">
              Information provided by customers may be shared with a qualified
              Ayurvedic doctor associated with our platform for evaluation.
            </p>
            <p className="txt-p">
              The consulting doctor may review the information provided by the
              customer and provide guidance based on the details shared.
            </p>
            <p className="txt-p">
              Any medical opinion or recommendation is solely the responsibility
              of the consulting doctor, who evaluates the information provided
              by the customer.
            </p>
            <p className="txt-p">
              The accuracy of such evaluation depends on the completeness and
              correctness of the information shared by the customer.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              4. User Responsibility
            </h2>
            <p className="txt-p">
              Customers are responsible for providing accurate, complete, and
              truthful information when communicating with us or when seeking
              consultation or guidance.
            </p>
            <p className="txt-p">This includes, but is not limited to:</p>
            <ul className="list-disc pl-[20px] space-y-2.5 txt-p mb-4 ml-[6px]">
              <li>Personal details</li>
              <li>Health conditions or symptoms</li>
              <li>Medical history</li>
              <li>Current medications or treatments</li>
              <li>
                Any other information that may be relevant for evaluating the
                customer&apos;s condition
              </li>
            </ul>
            <p className="txt-p">
              Customers must ensure that no important or necessary information
              related to their health condition is withheld, misrepresented, or
              partially disclosed.
            </p>
            <p className="txt-p">
              The accuracy of any guidance or product recommendation depends
              entirely on the information provided by the customer.
            </p>
            <p className="txt-p">
              We shall not be held responsible for any consequences arising
              from:
            </p>
            <ul className="list-disc pl-[20px] space-y-2.5 txt-p mb-4 ml-[6px]">
              <li>Incorrect information</li>
              <li>Incomplete or partial information</li>
              <li>
                Information that was not disclosed but was necessary for proper
                evaluation
              </li>
              <li>Improper or incorrect use of the product</li>
            </ul>
            <p className="txt-p">
              Customers are also responsible for following the recommended usage
              instructions and seeking professional medical advice when
              required.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              5. SEO and Keyword Usage
            </h2>
            <p className="txt-p">
              Our website may use certain keywords or search phrases such as
              piles medicine, constipation relief medicine, or similar
              wellness-related terms for the purpose of search engine
              optimization (SEO) and to help users find relevant information and
              products more easily.
            </p>
            <p className="txt-p">
              These keywords are used to improve visibility in search engines
              and help users locate wellness-related content that may be
              relevant to their concerns.
            </p>
            <p className="txt-p">
              The use of such keywords is solely for search optimization and
              informational discovery purposes, and should not be interpreted as
              a medical claim or representation that the products are intended
              to diagnose, treat, cure, or prevent any disease.
            </p>
            <p className="txt-p">
              All products listed on this website are FSSAI-compliant
              nutraceutical products and are categorized under health
              supplements or wellness support products, not pharmaceutical
              medicines.
            </p>
            <p className="txt-p">
              The use of SEO keywords does not change the regulatory
              classification, intended use, or legal status of the products.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              6. Orders and Product Availability
            </h2>
            <p className="txt-p">
              All orders placed through our website are subject to product
              availability and acceptance.
            </p>
            <p className="txt-p">We reserve the right to:</p>
            <ul className="list-disc pl-[20px] space-y-2.5 txt-p mb-4 ml-[6px] [&>li]:pl-[15px]">
              <li>Cancel or refuse any order</li>
              <li>Limit quantities purchased</li>
              <li>Modify product availability without prior notice</li>
            </ul>
            <p className="txt-p">
              In case of cancellation, customers will be notified and refunds
              will be processed according to our refund policy.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              7. Pricing and Payment
            </h2>
            <p className="txt-p">
              All prices listed on the website are subject to change without
              prior notice.
            </p>
            <p className="txt-p">
              Payments may be processed through secure third-party payment
              gateways.
            </p>
            <p className="txt-p">
              We are not responsible for payment failures or technical issues
              caused by third-party payment providers.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              8. Intellectual Property
            </h2>
            <p className="txt-p">
              All content on this website, including text, images, product
              descriptions, graphics, logos, brand elements, and website design,
              is the property of Nithastu Manufactures, including the brand
              PunchRaksha, and is protected by applicable intellectual property
              laws.
            </p>
            <p className="txt-p">
              Unauthorized copying, reproduction, modification, or distribution
              of any content from this website without prior written permission
              is strictly prohibited.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              9. Limitation of Liability
            </h2>
            <p className="txt-p">
              By using our website, services, or products, you agree that
              Nithastu Manufactures, including its brand PunchRaksha, shall not
              be held liable for any direct, indirect, incidental, or
              consequential damages resulting from:
            </p>
            <ul className="list-disc pl-[20px] space-y-2.5 txt-p mb-4 ml-[6px] [&>li]:pl-[15px]">
              <li>Use or misuse of products</li>
              <li>Reliance on information provided on the website</li>
              <li>Health outcomes related to product usage</li>
              <li>
                Incomplete, incorrect, or undisclosed information provided by
                customers
              </li>
            </ul>
            <p className="txt-p">
              Users are encouraged to make informed decisions and consult
              qualified healthcare professionals when necessary.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">10. Policy Updates</h2>
            <p className="txt-p">
              We may update or modify these Terms of Service from time to time.
            </p>
            <p className="txt-p">
              Updated versions will be posted on this page with the revised
              effective date.
            </p>
            <p className="txt-p">
              It is the responsibility of users to review the Terms of Service,
              Privacy Policy, and Refund Policy periodically.
            </p>
            <p className="txt-p">
              We may not provide individual notifications regarding policy
              updates.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">11. Governing Law</h2>
            <p className="txt-p">
              These Terms of Service shall be governed by and interpreted in
              accordance with the laws of India.
            </p>
            <p className="txt-p">
              Any disputes arising from the use of this website shall fall under
              the jurisdiction of the courts located in Ahmedabad, Gujarat.
            </p>
          </div>

          <div className="space-y-[20px]">
            <h2 className="txt-h2 font-bold mb-[20px]">
              12. Contact Information
            </h2>
            <p className="txt-p">
              If you have any questions regarding these Terms of Service, you
              may contact us:
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
