import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 3600;

export function generateMetadata(): Metadata {
  return {
    title: "About Us | PunchRaksha",
    description:
      "Learn more about Sanjay Shah, Health Coach & Digestive Health Educator, and the mission behind PunchRaksha's holistic wellness approach.",
    alternates: { canonical: "/about" },
  };
}

export default function AboutPage() {
  const customBulletClass =
    "list-image-[url('/images/icons/bullet-point-triangel.svg')] pl-[20px] space-y-2 txt-p-lg mb-4 [&>li]:pl-[15px]";

  return (
    <div className="w-full bg-white">
      <div className="mx-auto max-w-[1920px] px-4 lg:px-[50px] py-[40px] md:py-[60px]">
        {/* Top Section: Sanjay Shah Profile */}
        <div className="w-full">
          <div className="flex-1 space-y-10 font-outfit text-[#121212]">
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
              <div className="flex-1">
                <div className="space-y-[20px]">
                  <h1 className="font-outfit txt-h1 font-semibold text-[#121212] mb-[20px] lg:mb-[45px]">
                    Meet Sanjay Shah - Health Coach &
                    <br className="hidden lg:block" /> Digestive Health Educator
                  </h1>
                  <p className="txt-p-lg">
                    Sanjay Shah is a health coach dedicated to helping
                    individuals improve their digestive health through practical
                    nutrition, lifestyle changes, and sustainable wellness
                    habits. His approach focuses on simplifying complex health
                    concepts into easy-to-follow steps that fit real Indian
                    lifestyles.
                  </p>
                  <p className="txt-p-lg">
                    With a strong belief that long-term wellness is built
                    through daily habits rather than extreme interventions,
                    Sanjay works to make health education accessible,
                    understandable, and actionable for everyone.
                  </p>
                </div>

                <div className="space-y-[15px]">
                  <h2 className="txt-div-35 font-semibold">Role</h2>
                  <p className="txt-h3-lg font-medium">
                    Health Coach | Digestive Health Educator | Lifestyle
                    Wellness Guide
                  </p>
                  <p className="txt-p-lg">Sanjay specializes in:</p>
                  <ul className={customBulletClass}>
                    <li>Gut Health Optimization</li>
                    <li>Chronic Acidity Management</li>
                    <li>Holistic Nutrition Guidance</li>
                    <li>Ayurvedic Dietary Planning</li>
                    <li>Behavioral Habit Formation</li>
                  </ul>
                  <p className="txt-p-lg mt-4">
                    He works closely with individuals who struggle with
                    conditions like Acid Reflux, GERD, and IBS, providing
                    personalized strategies for lasting relief.
                  </p>
                </div>
              </div>
              <div className="w-full lg:w-[40%] shrink-0">
                <div className="relative w-full rounded-lg overflow-hidden flex items-end justify-center">
                  <Image
                    src="/images/about/sanjay-shah.svg"
                    width={800}
                    height={1000}
                    className="w-full object-contain"
                    alt="Sanjay Shah"
                    unoptimized
                  />
                </div>
              </div>
            </div>
            <div className="space-y-[15px]">
              <h2 className="txt-div-35 font-semibold">Experience</h2>
              <p className="txt-p-lg">
                Over the past 5 years, Sanjay has amassed a wealth of practical
                experience.
              </p>
              <p className="txt-p-lg">His professional journey encompasses:</p>
              <ul className={customBulletClass}>
                <li>Private health consultations</li>
                <li>Managing digestive disorder programs</li>
                <li>Designing customized Ayurvedic meal plans</li>
              </ul>
              <p className="txt-p-lg mt-4">
                His comprehensive approach combines modern nutritional science
                with ancient wisdom, helping clients achieve sustainable
                results.
              </p>
            </div>

            <div className="space-y-[15px]">
              <h2 className="txt-div-35 font-semibold">Areas of Expertise</h2>
              <p className="txt-p-lg">
                Sanjay&apos;s core areas of focus include:
              </p>
              <ul className={customBulletClass}>
                <li>Digestive Disorder Recovery</li>
                <li>Ayurvedic Nutrition and Lifestyle Therapy</li>
                <li>Acid Reflux and GERD Management</li>
                <li>Gut Microbiome Optimization</li>
                <li>Stress Management Techniques</li>
              </ul>
              <p className="txt-p mt-4">
                His deep understanding of these subjects allows him to address
                complex health challenges effectively.
              </p>
            </div>

            <div className="space-y-[15px]">
              <h2 className="txt-h2 font-bold">Mission</h2>
              <p className="txt-p-lg">
                Sanjay&apos;s mission is to empower individuals to take control
                of their health through natural, non-invasive methods.
              </p>
              <p className="txt-p-lg">He believes that:</p>

              <div className="flex items-center gap-[20px] bg-[#EEF9F5] border border-[#121212] px-[20px] py-[25px] my-[20px]">
                <Image
                  src="/images/about/qoutes.svg"
                  width={45}
                  height={35}
                  className="shrink-0 w-[35px] md:w-[50px] object-contain"
                  alt="Quote"
                  unoptimized
                />
                <p className="txt-p-lg font-medium text-[#121212] m-0">
                  True health starts in the gut. By understanding and honoring
                  your body&apos;s unique needs, you can unlock a life of
                  vitality and wellness.
                </p>
              </div>

              <p className="txt-p-lg">
                Through his platform, he aims to empower people to build
                long-lasting wellness habits and prevent lifestyle-related
                health problems.
              </p>
            </div>

            <div className="space-y-[15px]">
              <h2 className="txt-div-35 font-semibold">Real Story</h2>
              <p className="txt-p-lg">
                Sanjay&apos;s journey into the field of holistic health began
                with his own struggles with severe digestive issues. Frustrated
                by the lack of permanent solutions from conventional medicine,
                he turned to Ayurveda and holistic nutrition for answers.
              </p>
              <p className="txt-p-lg">
                This personal transformation inspired him to immerse himself in
                the study of natural healing. He is committed to sharing his
                knowledge and helping others avoid the years of suffering he
                experienced.
              </p>
            </div>
          </div>
        </div>

        {/* Certifications & Media Presence */}
        <div className="mt-16 pt-10 border-t border-gray-100 font-outfit text-[#121212] space-y-16">
          <div className="space-y-6">
            <h2 className="txt-div-35 font-semibold">Certifications</h2>
            <div className="w-full max-w-[800px]">
              <div className="relative w-full aspect-[1.4] bg-gray-50 border border-gray-200 shadow-sm p-2 rounded-md overflow-hidden">
                <Image
                  src="/images/about/certificate.svg"
                  alt="NFMA Certification"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>

          <div className="space-y-[15px] max-w-[1200px]">
            <h2 className="txt-div-35 font-semibold">
              Media & Educational Presence
            </h2>
            <p className="txt-p-lg">
              Sanjay actively shares health awareness content through:
            </p>
            <ul className={customBulletClass}>
              <li>Educational blog articles</li>
              <li>Social media wellness content</li>
              <li>Digestive health awareness initiatives</li>
              <li>Lifestyle transformation guidance</li>
            </ul>
            <p className="txt-p-lg mt-4">
              His content focuses on helping beginners understand health in a
              simple and relatable way.
            </p>
          </div>

          <div className="space-y-[15px] max-w-[1200px]">
            <h2 className="txt-div-35 font-semibold">
              Connect with Sanjay Shah
            </h2>
            <p className="txt-p-lg">
              Sanjay actively shares health awareness content through:
            </p>
            <ul className={customBulletClass}>
              <li>Instagram: https://www.instagram.com/healthymover/</li>
              <li>LinkedIn: https://www.linkedin.com/in/havedare/</li>
              <li>YouTube: https://www.youtube.com/@healthymover</li>
            </ul>
          </div>
        </div>

        {/* Brand Descriptions Section */}
        <div className="mt-16 font-outfit text-[#121212] space-y-16">
          {/* About PunchRaksha */}
          <div className="flex flex-col-reverse lg:flex-row gap-10 lg:gap-16 items-center border-t border-black xl:pt-[90px] lg:pt-[60px] md:pt-[45px] pt-[30px]">
            <div className="flex-1 space-y-[20px]">
              <h2 className="txt-div-35 font-semibold mb-4">
                About PunchRaksha
              </h2>
              <p className="txt-p-lg">
                PunchRaksha is a health education and wellness platform
                dedicated to improving digestive health through practical
                lifestyle guidance, nutrition awareness, and preventive wellness
                strategies. The platform focuses on helping individuals
                understand and manage common digestive concerns such as
                constipation, gut imbalance, and lifestyle-related health
                issues.
              </p>
              <p className="txt-p-lg">
                Founded with the vision of simplifying health knowledge,
                PunchRaksha aims to make wellness education accessible, clear,
                and applicable to real-life routines. The approach emphasizes
                sustainable habit-based health improvement rather than extreme
                or short-term interventions.
              </p>
              <p className="txt-p-lg">
                PunchRaksha integrates traditional wellness understanding with
                modern lifestyle awareness to support long-term digestive
                well-being. The platform provides structured educational
                content, natural health guidance, and awareness about preventive
                health practices.
              </p>
              <p className="txt-div-35 font-semibold mt-6">
                Core focus areas include:
              </p>
              <ul className={customBulletClass}>
                <li>Digestive Health Education</li>
                <li>Constipation awareness and prevention</li>
                <li>Natural nutrition guidance</li>
                <li>Lifestyle-based wellness improvement</li>
                <li>Preventive health awareness</li>
              </ul>
              <p className="txt-p-lg mt-4">
                Through its initiatives, PunchRaksha works to bridge the gap
                between complex health information and practical daily
                implementation, empowering individuals to take responsibility
                for their well-being.
              </p>
            </div>
            <div className="w-full lg:w-[40%] shrink-0">
              <div className="relative w-full aspect-[5/4] bg-[#EBF7F2] rounded-xl flex items-center justify-center p-10">
                <Image
                  src="/brand/punchraksha-logo.webp"
                  alt="PunchRaksha Logo"
                  width={400}
                  height={200}
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* About the PunchRaksha Website */}
          <div className="flex flex-col-reverse lg:flex-row gap-10 lg:gap-16 items-center border-t border-black xl:pt-[90px] lg:pt-[60px] md:pt-[45px] pt-[30px]">
            <div className="flex-1 space-y-[20px]">
              <h2 className="txt-div-35 font-semibold mb-4">
                About the PunchRaksha Website
              </h2>
              <p className="txt-p-lg">
                The PunchRaksha website is an educational health resource
                designed to provide simple, practical, and research-informed
                information on digestive health, nutrition, and lifestyle
                wellness. The platform serves as a knowledge hub where
                individuals can learn about constipation, gut health, natural
                wellness approaches, and preventive health strategies.
              </p>
              <p className="txt-p-lg">
                The website publishes structured health guides, wellness
                articles, and practical lifestyle recommendations aimed at
                helping beginners and health-conscious individuals improve their
                overall well-being.
              </p>
              <p className="txt-div-35 font-semibold xl:mt-[45px] lg:mt-[30px] mt-[20px]">
                Content on the website focuses on:
              </p>
              <ul className={customBulletClass}>
                <li>Understanding digestive health conditions</li>
                <li>Recognizing early health warning signs</li>
                <li>Learning natural wellness approaches</li>
                <li>Building sustainable daily health habits</li>
                <li>Preventing lifestyle-related digestive problems</li>
              </ul>
              <p className="txt-p-lg mt-4">
                Our website is designed to be your trusted companion in
                achieving optimal digestive health, providing everything you
                need in one convenient location.
              </p>
            </div>
            <div className="w-full lg:w-[40%] shrink-0">
              <div className="relative w-full aspect-[5/4] bg-[#EBF7F2] rounded-xl flex items-center justify-center p-10">
                <Image
                  src="/brand/punchraksha-logo.webp"
                  alt="PunchRaksha Logo"
                  width={400}
                  height={200}
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
