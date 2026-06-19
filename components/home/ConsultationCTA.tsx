import Image from "next/image";
import { ButtonBase } from "../ui/ButtonBase";
/* eslint-disable @next/next/no-img-element */

interface ConsultationCTAProps {
  className?: string;
  heading?: string;
  subheading?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  consultationImage?: string;
  consultationImageAlt?: string;
}

export function ConsultationCTA({
  className,
  heading = "Dr. Sahil Chauhan - Ayurvedic Doctor (BAMS Doctor)",
  subheading = "You can directly talk to our expert for personalized guidance.",
  description = "Our experienced team is here to understand your concerns and provide the right guidance. Whether you have questions about usage, duration, diet, or daily habits, you will receive clear and practical support tailored to your needs. This helps ensure you get the best possible results from our products safely and effectively, with complete confidence and long-term health support.",
  ctaText = "TAKE CONSULTATION NOW",
  ctaLink = "/contact",
  consultationImage = "/images/homepage/Homepage-content/dr-shail-chauhan-ayurvedic-doctor.webp",
  consultationImageAlt = "dr Shail Chauhan BAMS Ayurvedic doctor",
}: ConsultationCTAProps) {
  return (
    <section className={`w-full ${className}`}>
      <div className="px-4 md:px-[50px]">
        <div className="overflow-hidden rounded-[15px] bg-white md:grid md:grid-cols-[1.02fr_1fr] md:bg-[url('/images/homepage/consultation-bg.svg')]">
          <div className="relative h-[274px] w-full xs:h-[300px] sm:h-[400px] md:min-h-[440px] lg:h-full bg-[#E5E5E5]">
            <img src={consultationImage} alt={consultationImageAlt} className="w-full h-full object-cover object-bottom md:object-top absolute inset-0" />
          </div>

          <div className="relative bg-[url('/images/homepage/consultation-bg-mobile.png')] md:bg-none bg-cover bg-[50%_right] bg-no-repeat text-white flex flex-col justify-center p-[30px] md:p-[60px]">
            <div className="absolute inset-0 backdrop-blur-lg z-[1]" style={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }} />
            <div className="relative z-[2]">
              <h2 className="font-semibold font-outfit txt-h2-lg">
                <span className="hidden md:block">{heading}</span>
                <span className="block md:hidden">{heading}</span>
              </h2>

              <div className="mt-6 pl-[30px] mb-[20px] md:pl-[45px] md:mb-[30px] md:mt-8">
                <Image src="/images/homepage/down-arrow-CTA.svg" alt="arrow-down" width={28} height={42} />
              </div>

              <h3 className="font-semibold mb-4 font-outfit txt-h3-lg">
                {subheading}
              </h3>

              <div className="text-white max-w-[65ch] font-outfit txt-p-lg">
                <p className="text-p-lg font-weight-300">{description}</p>
              </div>

              <div className="mt-8 flex md:mt-10">
                <ButtonBase href={ctaLink} className="flex-none bg-white !text-[#014223] px-[20px] py-[15px] md:px-[30px] md:py-[20px] border-[2px] border-transparent hover:!bg-transparent hover:!text-white hover:border-white font-semibold sm:tracking-wider md:tracking-widest w-full md:w-auto text-center justify-center whitespace-nowrap font-outfit txt-div-22">
                  {ctaText}
                </ButtonBase>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
