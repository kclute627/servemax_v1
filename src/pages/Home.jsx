import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Check, ArrowRight, Shield, Clock, FileCheck, TrendingUp } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { entities } from "@/firebase/database";
import { Container } from '@/components/ui/container';
import clsx from 'clsx';
import screenshotJobs from '@/images/screenshots/reporting.png';
import screenshotDocuments from '@/images/screenshots/contacts.png';
import screenshotAccounting from '@/images/screenshots/inventory.png';
import screenshotDashboard from '@/images/screenshots/payroll.png';
import avatarImage1 from '@/images/avatars/avatar-1.png'
import avatarImage2 from '@/images/avatars/avatar-2.png'
import avatarImage3 from '@/images/avatars/avatar-3.png'
import avatarImage4 from '@/images/avatars/avatar-4.png'
import avatarImage5 from '@/images/avatars/avatar-5.png'
import screenshotContacts from '@/images/screenshots/contacts.png'

// Cohesive color palette as CSS custom properties
const colors = {
  // Primary forest greens
  forest: {
    900: '#0A1F1A',
    800: '#0D2E26',
    700: '#134035',
    600: '#1A5245',
    500: '#1F6355',
  },
  // Accent emerald (harmonizes with forest)
  emerald: {
    500: '#10B981',
    400: '#34D399',
    300: '#6EE7B7',
    200: '#A7F3D0',
    100: '#D1FAE5',
    50: '#ECFDF5',
  },
  // Warm neutrals
  warm: {
    50: '#FAFAF9',
    100: '#F5F5F4',
    200: '#E7E5E4',
  }
};

export default function HomePage() {
  const navigate = useNavigate();
  const [pricingPlans, setPricingPlans] = useState([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);

  useEffect(() => {
    loadPricingPlans();
  }, []);

  const loadPricingPlans = async () => {
    try {
      setIsLoadingPricing(true);
      const allPlans = await entities.PricingPlan.list();
      const standardPlans = allPlans.filter(plan => plan.is_visible_on_home);
      standardPlans.sort((a, b) => a.monthly_price - b.monthly_price);
      setPricingPlans(standardPlans);
    } catch (error) {
      console.error("Error loading pricing plans:", error);
      setPricingPlans([
        {
          name: "Professional",
          job_limit: 100,
          monthly_price: 39.99,
          features: ["Unlimited clients", "Document generation", "Email support"]
        }
      ]);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  const handleLogin = () => navigate(createPageUrl('Login'));
  const handleSignUp = () => navigate(createPageUrl('SignUp'));

  const primaryFeatures = [
    {
      title: 'Job Management',
      description: 'Create jobs in seconds. Assign servers, track attempts, monitor status. Everything in one place.',
      image: screenshotJobs,
    },
    {
      title: 'Document Generation',
      description: 'Auto-generate affidavits and field sheets. Professional documents, zero paperwork.',
      image: screenshotDocuments,
    },
    {
      title: 'Invoicing',
      description: 'Create invoices from jobs with one click. Track payments. Get paid faster.',
      image: screenshotAccounting,
    },
    {
      title: 'Analytics',
      description: 'See which clients send work. Track server performance. Make smarter decisions.',
      image: screenshotDashboard,
    },
  ];

  const testimonials = [
    {
      content: 'Diligence cut our admin time in half. What took hours now takes minutes.',
      author: { name: 'Michael Torres', role: 'Process Server, TX', image: avatarImage1 },
    },
    {
      content: 'The affidavit generation alone saves me 5+ hours every week.',
      author: { name: 'Sarah Mitchell', role: 'Swift Legal Services', image: avatarImage4 },
    },
    {
      content: 'Finally—software built by people who understand process serving.',
      author: { name: 'David Chen', role: 'Process Server, CA', image: avatarImage5 },
    },
  ];

  const faqs = [
    { q: 'How long to get started?', a: 'Most users are running in 15 minutes. Sign up, add a client, create a job.' },
    { q: 'Can I customize affidavit templates?', a: 'Yes. Create templates for any state or court. Dynamic fields auto-populate.' },
    { q: 'Is my data secure?', a: 'Industry-standard encryption. Secure cloud infrastructure. Never shared.' },
    { q: 'Can I add my team?', a: 'Invite employees and contractors with custom permissions. Track everyone.' },
    { q: 'Mobile support?', a: 'Fully responsive. Works great on any device. Native app coming soon.' },
    { q: 'Cancel anytime?', a: 'Yes. No fees. Your data stays accessible for 30 days.' },
  ];

  const secondaryFeatures = [
    {
      name: 'Dashboard',
      summary: 'Real-time insights into jobs, invoices, and performance.',
      description: 'See which clients send the most work. Track your best servers. Monitor cash flow.',
      image: screenshotDashboard,
    },
    {
      name: 'Client Hub',
      summary: 'All clients, contacts, and history in one place.',
      description: 'Store details, addresses, case history. Never lose track of who needs what.',
      image: screenshotContacts,
    },
    {
      name: 'Automation',
      summary: 'Generate documents automatically from job data.',
      description: 'Professional affidavits and field sheets. Consistent. Compliant. Fast.',
      image: screenshotDocuments,
    },
  ];

  function Plan({ name, price, description, features, featured, onSignUp }) {
    return (
      <div className={clsx(
        'relative rounded-2xl p-8 transition-all duration-300',
        featured
          ? 'bg-[#0D2E26] text-white scale-105 shadow-2xl shadow-[#0D2E26]/20'
          : 'bg-white border border-stone-200 hover:border-emerald-300 hover:shadow-lg'
      )}>
        {featured && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full tracking-wide">
              MOST POPULAR
            </span>
          </div>
        )}
        <h3 className={clsx('text-2xl font-semibold', featured ? 'text-white' : 'text-stone-900')}>
          {name}
        </h3>
        <p className={clsx('mt-2 text-sm', featured ? 'text-emerald-200' : 'text-stone-500')}>
          {description}
        </p>
        <p className="mt-6 flex items-baseline gap-1">
          <span className={clsx('text-5xl font-bold tracking-tight', featured ? 'text-white' : 'text-stone-900')}>
            {price}
          </span>
          <span className={clsx('text-sm', featured ? 'text-emerald-200' : 'text-stone-500')}>/month</span>
        </p>
        <Button
          onClick={onSignUp}
          className={clsx(
            'mt-8 w-full h-12 rounded-xl font-medium transition-all',
            featured
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
              : 'bg-[#0D2E26] hover:bg-[#134035] text-white'
          )}
        >
          Start free trial
        </Button>
        <ul className="mt-8 space-y-3">
          {features?.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <Check className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', featured ? 'text-emerald-400' : 'text-emerald-500')} />
              <span className={clsx('text-sm', featured ? 'text-emerald-100' : 'text-stone-600')}>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function FeaturesDesktop() {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
      <div className="hidden lg:block mt-20">
        <div className="grid grid-cols-3 gap-8">
          {secondaryFeatures.map((feature, idx) => (
            <button
              key={feature.name}
              onClick={() => setActiveIndex(idx)}
              className={clsx(
                'text-left p-6 rounded-2xl transition-all duration-300',
                idx === activeIndex
                  ? 'bg-[#0D2E26] text-white shadow-xl'
                  : 'bg-white hover:bg-stone-50 border border-stone-200'
              )}
            >
              <h3 className={clsx('font-semibold text-lg', idx === activeIndex ? 'text-emerald-400' : 'text-emerald-600')}>
                {feature.name}
              </h3>
              <p className={clsx('mt-2 text-xl font-medium', idx === activeIndex ? 'text-white' : 'text-stone-900')}>
                {feature.summary}
              </p>
              <p className={clsx('mt-3 text-sm', idx === activeIndex ? 'text-emerald-100' : 'text-stone-500')}>
                {feature.description}
              </p>
            </button>
          ))}
        </div>
        <div className="mt-12 rounded-2xl bg-stone-100 p-6 lg:p-10">
          <div className="overflow-hidden rounded-xl shadow-2xl">
            <img
              src={secondaryFeatures[activeIndex].image}
              alt={secondaryFeatures[activeIndex].name}
              className="w-full transition-opacity duration-300"
            />
          </div>
        </div>
      </div>
    );
  }

  function FeaturesMobile() {
    return (
      <div className="lg:hidden mt-16 space-y-12">
        {secondaryFeatures.map((feature) => (
          <div key={feature.name}>
            <div className="bg-[#0D2E26] text-white p-6 rounded-2xl">
              <h3 className="text-emerald-400 font-semibold">{feature.name}</h3>
              <p className="mt-2 text-xl font-medium">{feature.summary}</p>
              <p className="mt-3 text-sm text-emerald-100">{feature.description}</p>
            </div>
            <div className="mt-6 rounded-xl overflow-hidden shadow-lg">
              <img src={feature.image} alt={feature.name} className="w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-stone-50 text-stone-900 antialiased">
      {/* Inject Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-stone-50/80 backdrop-blur-xl border-b border-stone-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0D2E26] flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-xl font-bold text-[#0D2E26] tracking-tight">Diligence</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleLogin}
              className="text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            >
              Sign in
            </Button>
            <Button
              onClick={handleSignUp}
              className="bg-[#0D2E26] hover:bg-[#134035] text-white rounded-full px-5"
            >
              Start free trial
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-stone-50 pointer-events-none" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-emerald-100/30 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <Container className="relative">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Built for process servers
              </div>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-stone-900 leading-[1.1]">
                The platform that runs your
                <span className="relative mx-3">
                  <span className="relative z-10 text-[#0D2E26]">serving business</span>
                  <span className="absolute bottom-2 left-0 right-0 h-4 bg-emerald-200/60 -skew-x-3 -z-0" />
                </span>
              </h1>

              <p className="mt-8 text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed">
                Manage jobs, generate affidavits, invoice clients, and track your team—all in one place.
                Less admin. More serving.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  onClick={handleSignUp}
                  className="h-14 px-8 rounded-full bg-[#0D2E26] hover:bg-[#134035] text-white text-lg font-medium shadow-xl shadow-[#0D2E26]/20 transition-all hover:shadow-2xl hover:scale-[1.02]"
                >
                  Start free trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleLogin}
                  className="h-14 px-8 rounded-full border-stone-300 text-stone-700 hover:bg-stone-100 text-lg"
                >
                  Watch demo
                </Button>
              </div>

              {/* Social proof */}
              <div className="mt-16 pt-10 border-t border-stone-200">
                <p className="text-sm text-stone-500 mb-6">Trusted by process servers across the country</p>
                <div className="flex items-center justify-center gap-8 flex-wrap">
                  {[
                    { icon: Clock, label: '10k+', desc: 'Jobs completed' },
                    { icon: FileCheck, label: '5k+', desc: 'Affidavits generated' },
                    { icon: TrendingUp, label: '50%', desc: 'Time saved' },
                  ].map((stat, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <stat.icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-stone-900">{stat.label}</div>
                        <div className="text-xs text-stone-500">{stat.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 lg:py-32 bg-[#0D2E26] relative overflow-hidden">
          <Container className="relative">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="font-display text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Everything you need to run your business
              </h2>
              <p className="mt-6 text-xl text-emerald-200/80">
                From job intake to final invoice. One platform. Zero chaos.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {primaryFeatures.map((feature, idx) => (
                <div
                  key={feature.title}
                  className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-emerald-400">{idx + 1}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-emerald-100/70 text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>

            {/* Screenshot */}
            <div className="mt-16">
              <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/10">
                <img src={screenshotJobs} alt="Diligence Dashboard" className="w-full" />
              </div>
            </div>
          </Container>
        </section>

        {/* Secondary Features */}
        <section id="secondary-features" className="py-20 lg:py-32 bg-stone-50">
          <Container>
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-display text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight">
                Simplify your daily workflow
              </h2>
              <p className="mt-6 text-xl text-stone-600">
                Less time on admin. More time serving papers and growing your business.
              </p>
            </div>
            <FeaturesMobile />
            <FeaturesDesktop />
          </Container>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-[#0D2E26] to-[#134035] relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          </div>

          <Container className="relative">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Ready to streamline your business?
              </h2>
              <p className="mt-6 text-xl text-emerald-100/80">
                Join hundreds of process servers who trust Diligence. Start your free trial today—no credit card required.
              </p>
              <Button
                size="lg"
                onClick={handleSignUp}
                className="mt-10 h-14 px-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#0D2E26] font-semibold text-lg shadow-xl transition-all hover:scale-[1.02]"
              >
                Start free trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </Container>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-20 lg:py-32 bg-stone-50">
          <Container>
            <div className="max-w-2xl mx-auto text-center mb-16">
              <h2 className="font-display text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight">
                Trusted nationwide
              </h2>
              <p className="mt-6 text-xl text-stone-600">
                See why process servers choose Diligence.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-stone-200 hover:shadow-lg hover:border-emerald-200 transition-all duration-300"
                >
                  <div className="flex items-center gap-1 mb-6">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-stone-700 text-lg leading-relaxed">"{testimonial.content}"</p>
                  <div className="mt-6 pt-6 border-t border-stone-100 flex items-center gap-4">
                    <img
                      src={testimonial.author.image}
                      alt={testimonial.author.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-stone-900">{testimonial.author.name}</div>
                      <div className="text-sm text-stone-500">{testimonial.author.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 lg:py-32 bg-[#0D2E26]">
          <Container>
            <div className="max-w-2xl mx-auto text-center mb-16">
              <h2 className="font-display text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Simple, transparent pricing
              </h2>
              <p className="mt-6 text-xl text-emerald-100/80">
                Choose the plan that fits your business. All plans include a 30-day free trial.
              </p>
            </div>

            {isLoadingPricing ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {pricingPlans.map((plan, index) => (
                  <Plan
                    key={plan.id || index}
                    name={plan.name}
                    price={`$${plan.monthly_price}`}
                    description={plan.description || `${plan.job_limit} jobs per month`}
                    features={plan.features || []}
                    featured={index === 1}
                    onSignUp={handleSignUp}
                  />
                ))}
              </div>
            )}
          </Container>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 lg:py-32 bg-stone-50">
          <Container>
            <div className="max-w-2xl mx-auto text-center mb-16">
              <h2 className="font-display text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight">
                Questions? Answers.
              </h2>
              <p className="mt-6 text-xl text-stone-600">
                Everything you need to know about Diligence.
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-6 border border-stone-200">
                    <h3 className="font-semibold text-stone-900 text-lg">{faq.q}</h3>
                    <p className="mt-3 text-stone-600">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0A1F1A] py-12">
        <Container>
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">Diligence</span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                to={createPageUrl('PrivacyPolicy')}
                className="text-emerald-100/60 hover:text-emerald-100 text-sm transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to={createPageUrl('Terms')}
                className="text-emerald-100/60 hover:text-emerald-100 text-sm transition-colors"
              >
                Terms of Service
              </Link>
            </div>
            <p className="text-emerald-100/60 text-sm">
              &copy; {new Date().getFullYear()} Diligent. All rights reserved.
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
