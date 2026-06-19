"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/cart/cartStore";
import { useAuthStore } from "@/lib/auth/authStore";
import { AuthModal } from "./cart-drawer/AuthModal";
import { useRouter } from "next/navigation";
import { ButtonSecondary } from "../ui/ButtonSecondary";

function IconChevronDown({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/images/homepage/desktop-menu-arrow.svg"
      alt="Menu"
      width={10}
      height={7}
      className={className}
    />
  );
}

function IconChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMenu({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/images/homepage/mobile-menu.svg"
      alt="Menu"
      width={18}
      height={16}
      className={className}
    />
  );
}

function IconClose({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const itemCount = useCartStore((s) => s.itemCount());

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const showAuthModal = useAuthStore((s) => s.showAuthModal);
  const openAuthModal = useAuthStore((s) => s.openAuthModal);
  const closeAuthModal = useAuthStore((s) => s.closeAuthModal);
  const authSuccessAction = useAuthStore((s) => s.authSuccessAction);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }

    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY) * -1);
    };
  }, [open]);

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className="font-outfit text-[20px] font-medium tracking-wide text-text-main hover:opacity-80"
    >
      {children}
    </Link>
  );

  return (
    <div className="w-full bg-white h-[60px] md:h-[95px] lg:h-30 relative z-50 nav-height">
      <div className="max-w-8xl mx-auto flex items-center justify-between px-5 lg:px-8 h-full relative border-b-[1px] border-[#121212] border-opacity-70">
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          className="text-text-main lg:hidden flex-shrink-0 hover:opacity-70"
          onClick={() => {
            setOpen(!open);
            setActiveSubMenu(null);
          }}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>

        <Link href="/" className="flex items-center absolute left-1/2 -translate-x-1/2 lg:relative lg:left-0 lg:translate-x-0 md:pb-[10px] pr-[20px] pb-[5px] md:pb-[0px]">
          <Image src="/brand/punchraksha-logo.webp" alt="punchraksha logo" width={109} height={60} className="w-[70px] md:w-[85px] h-auto lg:w-[109px] logo-img" priority />
        </Link>

        <ul className="hidden lg:flex flex-1 justify-center gap-14 lg:gap-20 font-medium text-black relative items-center">
          <li className="relative group">
            <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 py-4 relative after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">
              <span className="txt-header-desktop">Products</span>
              <IconChevronDown className="text-black transition-transform nav-arrow group-hover:rotate-180" />
            </div>

            {/* Dropdown Menu */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-[10px] w-[260px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 txt-sub-menu">
              <div className="bg-white shadow-[0px_0px_60px_5px_rgba(0,0,0,0.25)] border border-gray-100">
                <div className="flex flex-col px-[30px] py-[30px]">
                  <Link href="/product/constipation-relief-powder" className="hover:text-primary font-outfit font-medium  text-[#121212] transition-colors">
                    Constipation Relief Powder
                  </Link>
                  <hr className="w-max-[221px] border-t border-[#000000] my-5" />
                  <Link href="/all-products" className="hover:text-primary font-outfit font-medium  text-[#121212] transition-colors">
                    Hibiscus Powder
                  </Link>
                  <hr className="w-max-[221px] border-t border-[#000000] my-5" />
                  <Link href="/all-products" className="hover:text-primary font-outfit font-medium text-[#121212] transition-colors">
                    Irani Methi Seed
                  </Link>
                  <hr className="w-max-[221px] border-t border-[#000000] my-5" />
                  <Link
                    href="/all-products"
                    className="relative flex items-center  gap-1 text-[#045830] font-outfit font-medium after:absolute after:-bottom-2 after:left-0 after:h-[1.5px] after:w-0 hover:after:w-full after:bg-[#045830] after:transition-all after:duration-300 group/op"
                  >
                    <span className="leading-none">Other Products</span>
                    <IconChevronRight className="w-4 h-4 " />
                  </Link>
                </div>
              </div>
            </div>
          </li>
          <li className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 py-4 relative after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">
            <Link href="/testimonial" className="txt-header-desktop">Testimonials</Link>
          </li>
          <li className="flex items-center cursor-pointer hover:opacity-80 py-4 relative after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">
            <Link href="/contact" className="txt-header-desktop">FREE Consultation</Link>
          </li>
          <li className="flex items-center cursor-pointer hover:opacity-80 py-4 relative after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-0 hover:after:w-full after:bg-primary after:transition-all after:duration-300">
            <Link href="/blog" className="txt-header-desktop">Blog</Link>
          </li>
        </ul>

        <div className="flex items-center gap-4 lg:gap-6 relative">
          <div className="relative group">
            <button
              aria-label="Profile"
              className="text-primary hover:opacity-80 flex items-center lg:py-6"
              onClick={() => {
                if (!isAuthenticated) {
                  openAuthModal();
                } else if (window.innerWidth < 1024) {
                  router.push("/dashboard");
                }
              }}
            >
              <Image src="/images/homepage/user.svg" alt="User" width={30} height={30} className="object-contain w-[26px] h-[26px] lg:w-[30px] lg:h-[30px]" />
            </button>

            {/* Hover Dropdown Menu (Desktop Only) */}
            {isAuthenticated && (
              <div className="absolute top-full right-0 w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 hidden lg:block -mt-2">
                <div className="bg-white rounded-[10px] shadow-[0px_10px_40px_0px_rgba(0,0,0,0.1)] border border-black/5 p-5 flex flex-col gap-4 font-outfit">
                  <Link href="/dashboard" className="flex items-center gap-3 txt-p-lg hover:text-[#045830] transition-colors font-medium">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Profile
                  </Link>
                  <Link href="/dashboard/addresses" className="flex items-center gap-3 txt-p-lg hover:text-[#045830] transition-colors font-medium">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    My Address
                  </Link>
                  <Link href="/dashboard/orders" className="flex items-center gap-3 txt-p-lg hover:text-[#045830] transition-colors font-medium">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    My Orders
                  </Link>
                  <button 
                    onClick={() => { logout(); router.push('/'); }}
                    className="w-full h-[36px] mt-1 rounded-[5px] border border-[#045830] text-[#045830] font-bold text-[12px] uppercase hover:bg-[#045830] hover:text-white transition-colors"
                  >
                    LOGOUT
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            aria-label="Cart"
            className="flex relative text-primary hover:opacity-80 items-center justify-center p-1"
            onClick={openDrawer}
          >
            <Image src="/images/homepage/cart.svg" alt="Cart" width={30} height={30} className="object-contain w-[26px] h-[26px] lg:w-[30px] lg:h-[30px]" />
            {itemCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-[5px] text-[11px] font-semibold text-white">
                {itemCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {open ? (
        <div className="absolute top-full left-0 w-full h-[calc(100vh-92px)] z-[60] lg:hidden overflow-hidden bg-black/50" style={{ touchAction: "none" }} onClick={() => { setOpen(false); setActiveSubMenu(null); }}>
          <div
            className="absolute left-0 top-0 h-full w-[90%]  bg-[#EEF7F0] font-outfit shadow-sm border-r border-[#E0E0E0] overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {activeSubMenu === 'products' ? (
              <div className="flex flex-col">
                <button
                  onClick={() => setActiveSubMenu(null)}
                  className="flex items-center gap-[5px] leading-snug px-[15px] py-[20px] txt-header-mobile text-[#111] hover:opacity-80 w-full"
                  style={{ borderBottom: "0.5px solid #B0B0B0" }}
                >
                  <Image src="/images/homepage/return-arrow.svg" alt="Arrow" width={24} height={24} /> Return to main menu
                </button>
                <div className="flex flex-col gap-[30px] p-[15px] mt-[15px]">
                  <Link href="/product/constipation-relief-powder" onClick={() => { setOpen(false); setActiveSubMenu(null); }} className="txt-header-mobile text-[#111] hover:text-[#0A5B2E] transition-colors">
                    Constipation Relief Powder
                  </Link>
                  <Link href="/all-products" onClick={() => { setOpen(false); setActiveSubMenu(null); }} className="txt-header-mobile text-[#111] hover:text-[#0A5B2E] transition-colors">
                    Hibiscus Powder
                  </Link>
                  <Link href="/all-products" onClick={() => { setOpen(false); setActiveSubMenu(null); }} className="txt-header-mobile text-[#111] hover:text-[#0A5B2E] transition-colors">
                    Irani Methi Seed
                  </Link>
                  <Link href="/all-products" onClick={() => { setOpen(false); setActiveSubMenu(null); }} className="flex items-center txt-header-mobile text-[#045830] hover:text-[#0A5B2E] transition-colors">
                    Other Products <Image src="/images/homepage/mobile-menu-arrow.svg" alt="Arrow" className="nav-arrow" width={7} height={6} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col min-h-full">
                {isAuthenticated && (
                  <div className="bg-[#045830] text-white pt-[35px] pb-[40px] px-[25px] flex flex-col gap-[20px]">
                    <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-4 text-[16px] font-outfit font-medium transition-colors hover:opacity-80">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Profile
                    </Link>
                    <Link href="/dashboard/addresses" onClick={() => setOpen(false)} className="flex items-center gap-4 text-[16px] font-outfit font-medium transition-colors hover:opacity-80">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      My Address
                    </Link>
                    <Link href="/dashboard/orders" onClick={() => setOpen(false)} className="flex items-center gap-4 text-[16px] font-outfit font-medium transition-colors hover:opacity-80">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                      My Orders
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setOpen(false);
                        router.push("/");
                      }}
                      className="mt-[10px] w-max rounded-[8px] border-[1.5px] border-white text-white font-bold text-[14px] tracking-[1px] uppercase px-[25px] py-[8px] hover:bg-white hover:text-[#045830] transition-colors font-outfit"
                    >
                      LOGOUT
                    </button>
                  </div>
                )}
                
                <div className="flex flex-col gap-[30px] pt-[30px] pb-[15px] px-[25px]">
                  <span onClick={() => setActiveSubMenu('products')} className="flex items-left txt-header-mobile text-[#111] hover:text-[#0A5B2E] transition-colors cursor-pointer">
                    Products <Image src="/images/homepage/mobile-menu-arrow.svg" alt="Arrow" className="nav-arrow" width={7} height={6} />
                  </span>

                  <Link href="/testimonial" onClick={() => setOpen(false)} className="flex items-left txt-header-mobile text-[#111] hover:text-[#0A5B2E] transition-colors">
                    Testimonials <Image src="/images/homepage/mobile-menu-arrow.svg" alt="Arrow" className="nav-arrow" width={7} height={6} />
                  </Link>

                  <Link href="/contact" onClick={() => setOpen(false)} className="txt-header-mobile text-[#111] hover:text-[#0A5B2E] transition-colors gap-[30px]">
                    FREE Consultation
                  </Link>

                  <Link href="/blog" onClick={() => setOpen(false)} className="txt-header-mobile text-[#111] hover:text-[#0A5B2E] transition-colors gap-[30px]">
                    Blog
                  </Link>
                </div>

                <div className="px-[25px] pb-8 fixed w-[85%] bottom-0 bg-[#EEF7F0]">
                  <div className="w-full h-px bg-[#B0B0B0] mb-6" style={{ height: "0.5px" }} />
                  <div className="flex flex-col">
                    <span className="txt-header-mobile text-[#111] pb-[10px]">Order Tracking</span>
                    <input
                      type="text"
                      placeholder="enter order AWB number here"
                      className="txt-input-placeholder w-[85%] bg-[#D9D9D9] py-[5px] pl-[10px] text-[#111] rounded-none outline-none focus:ring-1 focus:ring-primary border-none mb-[16px]"
                    />
                    <ButtonSecondary className="w-max font-semibold border text-[#121212] border-black leading-snug tracking-[0.1em] rounded-[5px] px-[24px] py-[8px] hover:bg-gray-50 transition-colors btn-16">
                      TRACK NOW
                    </ButtonSecondary>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <AuthModal
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        isCheckout={!!authSuccessAction}
        onSuccess={(phone) => {
          login(phone);
          closeAuthModal();
          if (authSuccessAction) {
            authSuccessAction();
          } else {
            router.push("/dashboard");
          }
        }}
      />
    </div>
  );
}


