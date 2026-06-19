"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonSecondary } from "../ui/ButtonSecondary";

function SocialIcon({
  label,
  children,
  href
}: {
  label: string;
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      target="_blank"
      className="icon-glare transition-transform duration-300 hover:-translate-y-1"
    >
      {children}
    </Link>
  );
}

const socialLinks = {
  facebook: "https://www.facebook.com/punchraksha/",
  instagram: "https://www.instagram.com/punchraksha/",
  whatsapp: "https://wa.me/917405498441",
}

export function Footer() {
  const pathname = usePathname();
  const isProductPage = pathname?.startsWith("/product");

  return (
    <footer className={`w-full bg-[#045930] px-[15px] pt-[30px] md:p-[60px] text-white ${isProductPage ? "pb-[100px] md:pb-[150px]" : "pb-8"}`}>
      <div className="grid grid-cols-1 gap-0 md:grid-cols-12">
        <div className="md:pr-[90px] lg:col-span-3">
          <Link href="/" className="mb-[20px] block">
            <Image src="/brand/punchraksha-white-logo.svg" alt="punchraksha white logo" className="!w-[120px] md:w-[145px] mt-[-10px]" width={145} height={80} />
          </Link>
          <div className="mb-[10px] font-medium text-white font-outfit txt-p-lg">
            Empowering your journey to <br /> holistic wellness
          </div>
          <div className="mb-[20px] text-white/80 font-outfit txt-p">
            PunchRaksha brings premium Ayurvedic solutions crafted with measurable standards, visible
            difference, and a root-cause approach—so you can live healthier, naturally.
          </div>

          <div className="flex items-center gap-4 pb-[30px] border-b border-white/90 md:border-none">

            <SocialIcon label="Facebook" href={socialLinks.facebook}>
              <Image src="/images/homepage/facebook.svg" alt="Facebook" width={50} height={50} />
            </SocialIcon>


            <SocialIcon label="Instagram" href={socialLinks.instagram}>
              <Image src="/images/homepage/instagram.svg" alt="Instagram" width={50} height={50} />
            </SocialIcon>


            <SocialIcon label="WhatsApp" href={socialLinks.whatsapp}>
              <Image src="/images/homepage/whatsapp.svg" alt="Whatsapp" width={50} height={50} />
            </SocialIcon>

          </div>
        </div>

        <div className=" md:col-span-3 border-b border-white/90 md:border-none pb-[30px] md:pb-[0px]">
          <div className="mb-[20px] md:mb-[30px] font-medium text-white flex mt-[30px]  md:mt-[0px] items-center font-outfit txt-p-lg">
            SHOP
            <Image src="/images/homepage/down-arrow.svg" alt="down-arrow" width={15} height={16} className="ml-2 relative top-[6px]" />
          </div>
          <ul className="flex flex-col space-y-[15px] md:space-y-[20px] text-white/90 font-outfit txt-p-lg">
            <li>
              <Link href="/product/constipation-relief-powder" className="footer-item-hover">
                Constipation Relief Powder
              </Link>
            </li>
            <li>
              <Link href="/all-products" className="footer-item-hover">
                Gond Katira
              </Link>
            </li>
            <li>
              <Link href="/all-products" className="footer-item-hover">
                Paneer Phool
              </Link>
            </li>
            <li>
              <Link href="/all-products" className="footer-item-hover">
                Bhringraj Powder
              </Link>
            </li>
            <li>
              <Link href="/all-products" className="footer-item-hover">
                Senna Leaves Powder
              </Link>
            </li>
            <li>
              <Link href="/all-products" className="footer-item-hover">
                Karela Powder
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:mr-[110px] md:col-span-3 border-b border-white/90 md:border-b-0 pb-[30px] md:pb-[0px] md:border-r md:border-white/90 mt-[30px] md:mt-[0px]">
          <div className="mb-[20px] md:mb-[30px] font-medium text-white flex items-center font-outfit txt-p-lg">
            COMPANY
            <Image src="/images/homepage/down-arrow.svg" alt="down-arrow" width={15} height={16} className="ml-2 relative top-[6px]" />
          </div>
          <ul className="flex flex-col space-y-[15px] md:space-y-[20px] text-white/90 font-outfit txt-p-lg">
            <li>
              <Link href="/about" className="footer-item-hover">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/testimonial" className="footer-item-hover">
                Testimonial
              </Link>
            </li>
            <li>
              <Link href="/blog" className="footer-item-hover">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/contact" className="footer-item-hover">
                Contact Us
              </Link>
            </li>
            <li>
              <Link href="/terms" className="footer-item-hover">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link href="/privacy-policy" className="footer-item-hover">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className="footer-item-hover">
                Refund policy
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-3 md:pl-[30px] mt-[30px] md:mt-[0px]">
          <div className="hidden md:block">
            <div className="md:mb-[15px] font-medium text-white font-outfit txt-p-lg">ORDER TRACKING</div>
            <div className="mb-8 flex flex-col items-start">
              <input
                className="w-full bg-[#d9d9d9] md:px-[15px] md:py-[10px] text-gray-800 placeholder-gray-500 focus:outline-none font-outfit txt-div-16 font-normal md:max-w-[436px]"
                placeholder="enter order AWB number here"
              />
              <ButtonSecondary className="border-[2px] border-transparent hover:!bg-transparent hover:!text-white hover:border-white">
                TRACK NOW
              </ButtonSecondary>
            </div>
            <div className="border-white/90 md:h-[0px] md:max-w-[382px] md:border-[1px]"></div>
          </div>
          <div className="mb-[0px] md:mb-[0px] md:mt-[30px]">
            <div className="flex flex-col">
              <div className="font-medium mb-[16px] md:mb-[21px] text-white flex items-center font-outfit txt-p-lg">
                Question? - Email us
                <Image src="/images/homepage/down-arrow.svg" alt="down-arrow" width={15} height={16} className="ml-2 relative top-[6px]" />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-white">
                  <Image
                    src="/images/homepage/email-icon.svg"
                    alt="email-icon"
                    width={18}
                    height={18}
                    className="w-[13px] h-[13px] md:w-[18px] md:h-[18px]"
                  />
                </div>
                <a className="text-white transition hover:text-gray-200 font-outfit txt-p-lg" href="mailto:nithastu.care@gmail.com">
                  nithastu.care@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer >
  );
}

