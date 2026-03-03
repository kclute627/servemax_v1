import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Check, ArrowRight, Play, Menu, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { entities } from "@/firebase/database";
import { Container } from "@/components/ui/container";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import clsx from "clsx";
import { motion } from "framer-motion";

import screenshotDashboard from "@/images/screenshots/reporting.png";
import screenshotContacts from "@/images/screenshots/contacts.png";
import screenshotInventory from "@/images/screenshots/inventory.png";

import avatarImage1 from "@/images/avatars/avatar-1.png";
import avatarImage2 from "@/images/avatars/avatar-2.png";
import avatarImage3 from "@/images/avatars/avatar-3.png";
import avatarImage4 from "@/images/avatars/avatar-4.png";
import avatarImage5 from "@/images/avatars/avatar-5.png";

import logoTuple from "@/images/logos/tuple.svg";
import logoStatamic from "@/images/logos/statamic.svg";
import logoTransistor from "@/images/logos/transistor.svg";
import logoLaravel from "@/images/logos/laravel.svg";
import logoStatickit from "@/images/logos/statickit.svg";
import logoFullWhite from "@/images/logo-full-white.png";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const features = [
  {
    title: "Track your performance",
    description:
      "Real-time dashboards that show job status, server efficiency, and business metrics at a glance.",
    image: screenshotDashboard,
  },
  {
    title: "Collaborate with your Vendors",
    description:
      "Assign jobs, share updates, and manage your network of process servers seamlessly.",
    image: screenshotContacts,
  },
  {
    title: "Organize Your Serves",
    description:
      "Keep every job, attempt, and document organized with smart filters and search.",
    image: screenshotInventory,
  },
];

const testimonials = [
  {
    company: "Swift Legal Services",
    content:
      "Diligence cut our admin time in half. What took hours now takes minutes.",
    author: {
      name: "Michael Torres",
      role: "Process Server, TX",
      image: avatarImage1,
    },
  },
  {
    company: "Metro Process",
    content:
      "The affidavit generation alone saves me 5+ hours every week. Game changer.",
    author: {
      name: "Sarah Mitchell",
      role: "Owner, Swift Legal",
      image: avatarImage4,
    },
  },
  {
    company: "National Serve Co.",
    content:
      "Finally\u2014software built by people who understand process serving.",
    author: {
      name: "David Chen",
      role: "Process Server, CA",
      image: avatarImage5,
    },
  },
  {
    company: "Pacific Legal Support",
    content:
      "Our team went from spreadsheets to Diligence overnight. Haven\u2019t looked back.",
    author: {
      name: "Jessica Park",
      role: "Operations Manager",
      image: avatarImage2,
    },
  },
  {
    company: "Keystone Serving",
    content:
      "Invoicing used to take me all weekend. Now it takes 10 minutes on Monday morning.",
    author: {
      name: "Robert James",
      role: "Independent Server, NY",
      image: avatarImage3,
    },
  },
  {
    company: "Atlas Process Group",
    content:
      "The client portal alone justified the switch. Our attorneys love the real-time updates.",
    author: {
      name: "Amanda Wilson",
      role: "Director of Operations",
      image: avatarImage1,
    },
  },
];

const faqs = [
  {
    q: "How long does it take to get started?",
    a:
      "Most users are up and running in 15 minutes. Sign up, add a client, and create your first job. It\u2019s that simple.",
  },
  {
    q: "Can I customize affidavit templates?",
    a:
      "Yes. Create templates for any state or court. Dynamic fields auto-populate from your job data so every document is accurate.",
  },
  {
    q: "Is my data secure?",
    a:
      "Absolutely. We use industry-standard encryption, secure cloud infrastructure, and your data is never shared with third parties.",
  },
  {
    q: "Can I add my team?",
    a:
      "Yes. Invite employees and contractors with custom permissions. Track everyone\u2019s work from a single dashboard.",
  },
  {
    q: "Can I cancel anytime?",
    a:
      "Yes. No cancellation fees. Your data stays accessible for 30 days after cancellation.",
  },
];

const fallbackPlans = [
  {
    name: "Basic",
    description: "Perfect for independent process servers getting started.",
    monthly_price: 25,
    features: [
      "Up to 50 jobs per month",
      "Affidavit generation",
      "Client management",
      "Email support",
      "Basic reporting",
    ],
  },
  {
    name: "Professional",
    description: "For growing teams that need more power and flexibility.",
    monthly_price: 25,
    features: [
      "Unlimited jobs",
      "Advanced affidavit templates",
      "Team management",
      "Priority support",
      "Advanced analytics",
      "Client portal access",
    ],
  },
];

const trustedLogos = [
  { src: logoTuple, alt: "Tuple" },
  { src: logoStatamic, alt: "Statamic" },
  { src: logoTransistor, alt: "Transistor" },
  { src: logoLaravel, alt: "Laravel" },
  { src: logoStatickit, alt: "StaticKit" },
];

const navLinks = [
  { label: "Blog", href: "#" },
  { label: "Changelog", href: "#" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#" },
  { label: "Careers", href: "#" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [pricingPlans, setPricingPlans] = useState([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    loadPricingPlans();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadPricingPlans = async () => {
    try {
      setIsLoadingPricing(true);
      const allPlans = await entities.PricingPlan.list();
      const standardPlans = allPlans
        .filter((plan) => plan.is_visible_on_home)
        .sort((a, b) => a.monthly_price - b.monthly_price);
      setPricingPlans(standardPlans);
    } catch (error) {
      console.error("Error loading pricing plans:", error);
      setPricingPlans(fallbackPlans);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  const handleLogin = () => navigate(createPageUrl("Login"));
  const handleSignUp = () => navigate(createPageUrl("SignUp"));

  return (
    <div className="bg-white text-gray-900 antialiased">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
      `}</style>

      {/* ── Navbar (floating pill → sticky bar on scroll) ── */}
      <nav
        className={clsx(
          "fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-500 ease-in-out",
          scrolled ? "pt-0 px-0" : "pt-4 px-4"
        )}
      >
        <div
          className={clsx(
            "w-full backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 transition-all duration-500 ease-in-out",
            scrolled
              ? "max-w-none bg-[#0D2E26]/95 rounded-none border-x-0 border-t-0"
              : "max-w-5xl bg-[#0D2E26]/90 rounded-full"
          )}
        >
          <div
            className={clsx(
              "h-14 flex items-center justify-between transition-all duration-500",
              scrolled ? "max-w-7xl mx-auto px-6 lg:px-8" : "px-8"
            )}
          >
            <img src={logoFullWhite} alt="Diligence" className="h-10" />

            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleLogin}
                className="text-sm text-gray-300 hover:text-white font-medium px-4 py-1.5 transition-colors"
              >
                Log in
              </button>
              <button
                onClick={handleSignUp}
                className="text-sm text-white font-medium px-5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors"
              >
                Sign up
              </button>
            </div>

            <button
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="absolute top-20 left-4 right-4 max-w-5xl mx-auto bg-[#0D2E26] rounded-2xl border border-white/10 shadow-xl px-6 py-4 space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-sm text-gray-300 hover:text-white py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogin();
                }}
                className="flex-1 text-sm text-white font-medium py-2.5 rounded-full border border-white/25 hover:bg-white/10 transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignUp();
                }}
                className="flex-1 text-sm text-white font-medium py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 transition-colors"
              >
                Sign up
              </button>
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* ── Hero ── */}
        <section className="relative pt-36 pb-20 lg:pt-18 lg:pb-28 bg-[#0A1F1A] overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            {/* softer core glow */}
            <div className="absolute top-[-22%] left-1/2 -translate-x-1/2 w-[120%] h-[620px] bg-gradient-to-b from-teal-200/55 via-emerald-300/30 to-transparent rounded-[50%] blur-[90px] opacity-30" />
            <div className="absolute top-[-12%] left-1/2 -translate-x-1/2 w-[140%] h-[520px] bg-gradient-to-b from-teal-300/35 via-emerald-500/15 to-transparent rounded-[50%] blur-[130px]" />
            <div className="absolute top-[-18%] left-[-8%] w-[55%] h-[480px] bg-gradient-to-br from-emerald-300/25 via-teal-400/10 to-transparent rounded-full blur-[120px]" />
            <div className="absolute top-[-12%] right-[-8%] w-[50%] h-[420px] bg-gradient-to-bl from-teal-300/22 via-cyan-300/10 to-transparent rounded-full blur-[110px]" />
            <div className="absolute top-[2%] left-1/2 -translate-x-1/2 w-[680px] h-[320px] bg-gradient-to-b from-teal-200/25 to-transparent rounded-full blur-[80px]" />

            {/* premium noise */}
            <div
              className="absolute inset-0 opacity-[0.06] mix-blend-soft-light"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
              }}
            />

            {/* softer fade */}
            <div className="absolute top-[260px] left-0 right-0 h-[440px] bg-gradient-to-b from-transparent via-[#0B201B]/65 to-[#071612]" />
          </div>

          <Container className="relative">
            <motion.div
              className="max-w-4xl mx-auto text-center"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              

              <motion.h1
                variants={fadeIn}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1] capitalize"
              >
               Build your buisness with <br></br> a partner not a competitor
               
              </motion.h1>

              <motion.p
                variants={fadeIn}
                className="mt-8 text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
              >
                Manage jobs, generate affidavits, invoice clients, and track your team — all from one powerful dashboard. Spend less time on admin and more time serving.
              </motion.p>

              <motion.div
                variants={fadeIn}
                className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button
                  size="lg"
                  onClick={handleSignUp}
                  className="h-12 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-base font-medium shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:scale-[1.02]"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 rounded-full border-gray-600 text-gray-300 hover:bg-white/5 hover:text-white text-base"
                >
                  <Play className="mr-2 w-4 h-4" />
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              className="mt-16 lg:mt-20 max-w-5xl mx-auto"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/10">
                <img
                  src={screenshotDashboard}
                  alt="Diligence Dashboard"
                  className="w-full"
                />
              </div>
            </motion.div>
          </Container>
        </section>

        {/* ── Trusted By ── */}
        <section className="py-14 bg-white border-b border-gray-100">
          <Container>
            <p className="text-center text-xs font-semibold tracking-[0.2em] text-gray-400 uppercase mb-10">
              Trusted by teams at
            </p>
            <div className="flex items-center justify-center gap-x-12 gap-y-6 flex-wrap opacity-40 grayscale">
              {trustedLogos.map((logo) => (
                <img
                  key={logo.alt}
                  src={logo.src}
                  alt={logo.alt}
                  className="h-8"
                />
              ))}
            </div>
          </Container>
        </section>

        {/* ── Features ── */}
        <section className="py-20 lg:py-28 bg-[#F9FAFB]">
          <Container>
            <motion.div
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
                  Features
                </span>
              </motion.div>
              <motion.h2
                variants={fadeIn}
                className="mt-6 text-3xl lg:text-5xl font-bold text-gray-900 tracking-tight"
              >
                Built for clarity, built for speed
              </motion.h2>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={fadeIn}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="bg-[#0D2E26] p-5">
                    <div className="rounded-lg overflow-hidden">
                      <img
                        src={feature.image}
                        alt={feature.title}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </Container>
        </section>

        {/* ── Mission Statement ── */}
        <section className="py-20 lg:py-28 bg-white">
          <Container>
            <motion.p
              className="max-w-4xl mx-auto text-center text-2xl lg:text-3xl font-medium text-gray-900 leading-relaxed lg:leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              We help people turn ordinary content into polished results that
              capture attention, express creativity, and inspire real-world
              action.
            </motion.p>
          </Container>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="py-20 lg:py-28 bg-[#F9FAFB]">
          <Container>
            <motion.div
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
                  Pricing Plan
                </span>
              </motion.div>
              <motion.h2
                variants={fadeIn}
                className="mt-6 text-3xl lg:text-5xl font-bold text-gray-900 tracking-tight"
              >
                Simple, transparent pricing
              </motion.h2>
              <motion.p
                variants={fadeIn}
                className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto"
              >
                Choose the plan that fits your business. All plans include a
                30-day free trial.
              </motion.p>
            </motion.div>

            {isLoadingPricing ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <motion.div
                className={clsx(
                  "grid gap-8 mx-auto",
                  pricingPlans.length === 2
                    ? "md:grid-cols-2 max-w-4xl"
                    : pricingPlans.length >= 3
                    ? "md:grid-cols-3 max-w-6xl"
                    : "max-w-md"
                )}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                {pricingPlans.map((plan, index) => {
                  const isFree = plan.is_free || plan.monthly_price === 0;
                  return (
                    <motion.div
                      key={plan.id || index}
                      variants={fadeIn}
                      className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg transition-shadow duration-300 relative"
                    >
                      {isFree && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-emerald-500 text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                            NO CREDIT CARD REQUIRED
                          </span>
                        </div>
                      )}
                      <h3 className="text-2xl font-bold text-gray-900">
                        {plan.name}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500">
                        {plan.description || `${plan.job_limit} jobs per month`}
                      </p>
                      <div className="mt-6 flex items-baseline gap-1">
                        {isFree ? (
                          <span className="text-5xl font-bold text-emerald-600">
                            Free
                          </span>
                        ) : (
                          <>
                            <span className="text-5xl font-bold text-gray-900">
                              ${plan.monthly_price}
                            </span>
                            <span className="text-gray-500 text-sm">
                              /month
                            </span>
                          </>
                        )}
                      </div>
                      <Button
                        onClick={handleSignUp}
                        className={clsx(
                          "mt-8 w-full h-12 rounded-xl font-medium",
                          isFree
                            ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                            : "bg-[#0D2E26] hover:bg-[#134035] text-white"
                        )}
                      >
                        {isFree ? "Start Free" : "Get Started Now"}
                      </Button>
                      <ul className="mt-8 space-y-3">
                        {(plan.features || []).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-600">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </Container>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-20 lg:py-28 bg-[#0A1F1A]">
          <Container>
            <motion.div
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              <motion.div variants={fadeIn}>
                <span className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
                  Why Our Clients Love Us
                </span>
              </motion.div>
              <motion.h2
                variants={fadeIn}
                className="mt-6 text-3xl lg:text-5xl font-bold text-white tracking-tight"
              >
                Real stories from real users
              </motion.h2>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-6 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              {testimonials.map((t, idx) => (
                <motion.div
                  key={idx}
                  variants={fadeIn}
                  className={clsx(
                    "bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm",
                    idx < 2 ? "md:col-span-3" : "md:col-span-2"
                  )}
                >
                  <p className="text-sm font-semibold text-emerald-400 mb-3">
                    {t.company}
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    &ldquo;{t.content}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <img
                      src={t.author.image}
                      alt={t.author.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {t.author.name}
                      </p>
                      <p className="text-xs text-gray-400">{t.author.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </Container>
        </section>

        {/* ── FAQ ── */}
        <section className="py-20 lg:py-28 bg-[#0D2E26]">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={stagger}
              >
                <motion.div variants={fadeIn}>
                  <span className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase">
                    Frequently Asked Questions
                  </span>
                </motion.div>
                <motion.h2
                  variants={fadeIn}
                  className="mt-6 text-3xl lg:text-5xl font-bold text-white tracking-tight leading-tight"
                >
                  Everything you
                  <br />
                  want to know
                </motion.h2>
              </motion.div>

              <div>
                <Accordion type="single" collapsible>
                  {faqs.map((faq, idx) => (
                    <AccordionItem
                      key={idx}
                      value={`faq-${idx}`}
                      className="border-b border-white/10"
                    >
                      <AccordionTrigger className="text-white text-base font-medium hover:no-underline py-5 [&>svg]:text-gray-400">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-400 text-sm leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </Container>
        </section>

        {/* ── CTA Banner ── */}
        <section className="py-20 lg:py-28 bg-[#0A1F1A] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
          </div>
          <Container className="relative">
            <motion.div
              className="max-w-3xl mx-auto text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
              <motion.h2
                variants={fadeIn}
                className="text-3xl lg:text-5xl font-bold text-white tracking-tight"
              >
                Ready To Streamline Your Business?
              </motion.h2>
              <motion.p
                variants={fadeIn}
                className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto"
              >
                Join hundreds of process servers who trust Diligence. Start your
                free trial today—no credit card required.
              </motion.p>
              <motion.div variants={fadeIn}>
                <Button
                  size="lg"
                  onClick={handleSignUp}
                  className="mt-10 h-12 px-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-base shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02]"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
            </motion.div>
          </Container>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#0A1F1A] border-t border-white/10 pt-16 pb-10">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12">
            <div className="col-span-2 md:col-span-4">
              <img src={logoFullWhite} alt="Diligence" className="h-12" />
              <p className="mt-4 text-sm text-gray-500 max-w-xs">
                The all-in-one platform for process serving businesses.
              </p>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                {["Blog", "Docs", "Changelog", "Pricing"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                {["About", "Careers"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to={createPageUrl("Terms")}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to={createPageUrl("PrivacyPolicy")}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-2 flex md:justify-end items-start">
              <div className="flex gap-4">
                <a
                  href="#"
                  className="text-gray-500 hover:text-white transition-colors"
                  aria-label="Twitter"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-gray-500 hover:text-white transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-gray-500 hover:text-white transition-colors"
                  aria-label="GitHub"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Diligence. All rights reserved.
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
