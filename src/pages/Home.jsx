import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Zap, BarChart, Users, FileText, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { entities } from "@/firebase/database";
import { Container } from '@/components/ui/container';
import logoLaravel from '@/images/logos/laravel.svg'
import logoMirage from '@/images/logos/mirage.svg'
import logoStatamic from '@/images/logos/statamic.svg'
import logoStaticKit from '@/images/logos/statickit.svg'
import logoTransistor from '@/images/logos/transistor.svg'
import logoTuple from '@/images/logos/tuple.svg'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import clsx from 'clsx';
import backgroundFeatures from '@/images/background-features.jpg';
import screenshotJobs from '@/images/screenshots/reporting.png';
import screenshotDocuments from '@/images/screenshots/contacts.png';
import screenshotAccounting from '@/images/screenshots/inventory.png';
import screenshotDashboard from '@/images/screenshots/payroll.png';
import backgroundImage from '@/images/background-call-to-action.jpg'
import avatarImage1 from '@/images/avatars/avatar-1.png'
import avatarImage2 from '@/images/avatars/avatar-2.png'
import avatarImage3 from '@/images/avatars/avatar-3.png'
import avatarImage4 from '@/images/avatars/avatar-4.png'
import avatarImage5 from '@/images/avatars/avatar-5.png'
import faqbackgroundImage from '@/images/background-faqs.jpg'
import screenshotContacts from '@/images/screenshots/contacts.png'


export default function HomePage() {
  const navigate = useNavigate();
  const [pricingPlans, setPricingPlans] = useState([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [tabOrientation, setTabOrientation] = useState('horizontal');


  function ReportingIcon({ id }) {
    return (
      <>
        <defs>
          <linearGradient
            id={id}
            x1="11.5"
            y1={18}
            x2={36}
            y2="15.5"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".194" stopColor="#fff" />
            <stop offset={1} stopColor="#6692F1" />
          </linearGradient>
        </defs>
        <path
          d="m30 15-4 5-4-11-4 18-4-11-4 7-4-5"
          stroke={`url(#${id})`}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  function InventoryIcon() {
    return (
      <>
        <path
          opacity=".5"
          d="M8 17a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2Z"
          fill="#fff"
        />
        <path
          opacity=".3"
          d="M8 24a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2Z"
          fill="#fff"
        />
        <path
          d="M8 10a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2Z"
          fill="#fff"
        />
      </>
    );
  }

  function ContactsIcon() {
    return (
      <>
        <path
          opacity=".5"
          d="M25.778 25.778c.39.39 1.027.393 1.384-.028A11.952 11.952 0 0 0 30 18c0-6.627-5.373-12-12-12S6 11.373 6 18c0 2.954 1.067 5.659 2.838 7.75.357.421.993.419 1.384.028.39-.39.386-1.02.036-1.448A9.959 9.959 0 0 1 8 18c0-5.523 4.477-10 10-10s10 4.477 10 10a9.959 9.959 0 0 1-2.258 6.33c-.35.427-.354 1.058.036 1.448Z"
          fill="#fff"
        />
        <path
          d="M12 28.395V28a6 6 0 0 1 12 0v.395A11.945 11.945 0 0 1 18 30c-2.186 0-4.235-.584-6-1.605ZM21 16.5c0-1.933-.5-3.5-3-3.5s-3 1.567-3 3.5 1.343 3.5 3 3.5 3-1.567 3-3.5Z"
          fill="#fff"
        />
      </>
    );
  }


  useEffect(() => {
    loadPricingPlans();
  }, []);

  const loadPricingPlans = async () => {
    try {
      setIsLoadingPricing(true);
      const allPlans = await entities.PricingPlan.list();
      // Only show standard plans (not custom)
      const standardPlans = allPlans.filter(plan => plan.is_visible_on_home);
      // Sort by price
      standardPlans.sort((a, b) => a.monthly_price - b.monthly_price);
      setPricingPlans(standardPlans);
    } catch (error) {
      console.error("Error loading pricing plans:", error);
      // Fallback to default plan if database fails
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



  useEffect(() => {
    const lgMediaQuery = window.matchMedia('(min-width: 1024px)');

    function onMediaQueryChange({ matches }) {
      setTabOrientation(matches ? 'vertical' : 'horizontal');
    }

    onMediaQueryChange(lgMediaQuery);
    lgMediaQuery.addEventListener('change', onMediaQueryChange);

    return () => {
      lgMediaQuery.removeEventListener('change', onMediaQueryChange);
    };
  }, []);

  const handleLogin = () => {
    navigate(createPageUrl('Login'));
  };

  const handleSignUp = () => {
    navigate(createPageUrl('SignUp'));
  };

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-blue-500" />,
      title: "Streamlined Job Management",
      description:
        "From creation to completion, track every job with status updates, server assignments, and detailed activity logs.",
    },
    {
      icon: <Users className="w-8 h-8 text-blue-500" />,
      title: "Client & Server Hub",
      description:
        "Manage all your clients, employees, and contractors in one centralized location with detailed profiles.",
    },
    {
      icon: <FileText className="w-8 h-8 text-blue-500" />,
      title: "Automated Document Generation",
      description:
        "Instantly generate professional affidavits and field sheets, reducing manual paperwork and saving time.",
    },
    {
      icon: <BarChart className="w-8 h-8 text-blue-500" />,
      title: "Insightful Dashboard",
      description:
        "Get a real-time overview of your operations with key metrics on jobs, invoices, and top performers.",
    },
  ];


  const primaryFeatures = [
    {
      title: 'Job Tracking & Workflow',
      description:
        'Create jobs in seconds, assign servers, track attempts, and never lose sight of what’s pending, served, or completed.',
      image: screenshotJobs,
    },
    {
      title: 'Smart Document Generation',
      description:
        'Auto-generate affidavits and field sheets from your job data so your team spends less time on paperwork.',
      image: screenshotDocuments,
    },
    {
      title: 'Invoices & Accounting',
      description:
        'Issue invoices directly from your jobs, keep billing organized, and stay on top of what’s paid and outstanding.',
      image: screenshotAccounting,
    },
    {
      title: 'Performance Insights',
      description:
        'See which clients send the most work and which servers perform best with a clean, actionable dashboard.',
      image: screenshotDashboard,
    },
  ];


  const testimonials = [
    [
      {
        content:
          'TaxPal is so easy to use I can’t help but wonder if it’s really doing the things the government expects me to do.',
        author: {
          name: 'Sheryl Berge',
          role: 'CEO at Lynch LLC',
          image: avatarImage1,
        },
      },
      {
        content:
          'I’m trying to get a hold of someone in support, I’m in a lot of trouble right now and they are saying it has something to do with my books. Please get back to me right away.',
        author: {
          name: 'Amy Hahn',
          role: 'Director at Velocity Industries',
          image: avatarImage4,
        },
      },
    ],
    [
      {
        content:
          'The best part about TaxPal is every time I pay my employees, my bank balance doesn’t go down like it used to. Looking forward to spending this extra cash when I figure out why my card is being declined.',
        author: {
          name: 'Leland Kiehn',
          role: 'Founder of Kiehn and Sons',
          image: avatarImage5,
        },
      },
      {
        content:
          'There are so many things I had to do with my old software that I just don’t do at all with TaxPal. Suspicious but I can’t say I don’t love it.',
        author: {
          name: 'Erin Powlowski',
          role: 'COO at Armstrong Inc',
          image: avatarImage2,
        },
      },
    ],
    [
      {
        content:
          'I used to have to remit tax to the EU and with TaxPal I somehow don’t have to do that anymore. Nervous to travel there now though.',
        author: {
          name: 'Peter Renolds',
          role: 'Founder of West Inc',
          image: avatarImage3,
        },
      },
      {
        content:
          'This is the fourth email I’ve sent to your support team. I am literally being held in jail for tax fraud. Please answer your damn emails, this is important.',
        author: {
          name: 'Amy Hahn',
          role: 'Director at Velocity Industries',
          image: avatarImage4,
        },
      },
    ],
  ]

  function QuoteIcon(props) {
    return (
      <svg aria-hidden="true" width={105} height={78} {...props}>
        <path d="M25.086 77.292c-4.821 0-9.115-1.205-12.882-3.616-3.767-2.561-6.78-6.102-9.04-10.622C1.054 58.534 0 53.411 0 47.686c0-5.273.904-10.396 2.712-15.368 1.959-4.972 4.746-9.567 8.362-13.786a59.042 59.042 0 0 1 12.43-11.3C28.325 3.917 33.599 1.507 39.324 0l11.074 13.786c-6.479 2.561-11.677 5.951-15.594 10.17-3.767 4.219-5.65 7.835-5.65 10.848 0 1.356.377 2.863 1.13 4.52.904 1.507 2.637 3.089 5.198 4.746 3.767 2.41 6.328 4.972 7.684 7.684 1.507 2.561 2.26 5.5 2.26 8.814 0 5.123-1.959 9.19-5.876 12.204-3.767 3.013-8.588 4.52-14.464 4.52Zm54.24 0c-4.821 0-9.115-1.205-12.882-3.616-3.767-2.561-6.78-6.102-9.04-10.622-2.11-4.52-3.164-9.643-3.164-15.368 0-5.273.904-10.396 2.712-15.368 1.959-4.972 4.746-9.567 8.362-13.786a59.042 59.042 0 0 1 12.43-11.3C82.565 3.917 87.839 1.507 93.564 0l11.074 13.786c-6.479 2.561-11.677 5.951-15.594 10.17-3.767 4.219-5.65 7.835-5.65 10.848 0 1.356.377 2.863 1.13 4.52.904 1.507 2.637 3.089 5.198 4.746 3.767 2.41 6.328 4.972 7.684 7.684 1.507 2.561 2.26 5.5 2.26 8.814 0 5.123-1.959 9.19-5.876 12.204-3.767 3.013-8.588 4.52-14.464 4.52Z" />
      </svg>
    )
  }


  const faqs = [
    [
      {
        question: 'Does TaxPal handle VAT?',
        answer:
          'Well no, but if you move your company offshore you can probably ignore it.',
      },
      {
        question: 'Can I pay for my subscription via purchase order?',
        answer: 'Absolutely, we are happy to take your money in all forms.',
      },
      {
        question: 'How do I apply for a job at TaxPal?',
        answer:
          'We only hire our customers, so subscribe for a minimum of 6 months and then let’s talk.',
      },
    ],
    [
      {
        question: 'What was that testimonial about tax fraud all about?',
        answer:
          'TaxPal is just a software application, ultimately your books are your responsibility.',
      },
      {
        question:
          'TaxPal sounds horrible but why do I still feel compelled to purchase?',
        answer:
          'This is the power of excellent visual design. You just can’t resist it, no matter how poorly it actually functions.',
      },
      {
        question:
          'I found other companies called TaxPal, are you sure you can use this name?',
        answer:
          'Honestly not sure at all. We haven’t actually incorporated or anything, we just thought it sounded cool and made this website.',
      },
    ],
    [
      {
        question: 'How do you generate reports?',
        answer:
          'You just tell us what data you need a report for, and we get our kids to create beautiful charts for you using only the finest crayons.',
      },
      {
        question: 'Can we expect more inventory features?',
        answer: 'In life it’s really better to never expect anything at all.',
      },
      {
        question: 'I lost my password, how do I get into my account?',
        answer:
          'Send us an email and we will send you a copy of our latest password spreadsheet so you can find your information.',
      },
    ],
  ]



  function Plan({ name, price, description, features, featured, onSignUp }) {
    return (
      <div
        className={clsx(
          'rounded-3xl bg-white px-6 py-8 shadow-xl shadow-slate-900/10 sm:px-8',
          featured && 'bg-slate-900'
        )}
      >
        {featured && (
          <p className="text-sm font-semibold tracking-wider text-blue-400">
            MOST POPULAR
          </p>
        )}
        <h3
          className={clsx(
            'mt-4 font-display text-3xl tracking-tight',
            featured ? 'text-white' : 'text-slate-900'
          )}
        >
          {name}
        </h3>
        <p
          className={clsx(
            'mt-4 text-sm tracking-tight',
            featured ? 'text-slate-400' : 'text-slate-600'
          )}
        >
          {description}
        </p>
        <p className="mt-6 flex items-baseline gap-x-1">
          <span
            className={clsx(
              'text-4xl font-bold tracking-tight',
              featured ? 'text-white' : 'text-slate-900'
            )}
          >
            {price}
          </span>
          <span
            className={clsx(
              'text-sm font-semibold',
              featured ? 'text-slate-400' : 'text-slate-600'
            )}
          >
            /month
          </span>
        </p>
        <Button
          onClick={onSignUp}
          className={clsx(
            'mt-6 w-full',
            featured
              ? 'bg-white text-slate-900 hover:bg-blue-50'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          )}
        >
          Get started today
        </Button>
        <ul
          className={clsx(
            'mt-10 space-y-4 text-sm tracking-tight',
            featured ? 'text-slate-300' : 'text-slate-600'
          )}
        >
          {features?.map((feature, idx) => (
            <li key={idx} className="flex gap-x-3">
              <Check
                className={clsx(
                  'h-6 w-5 flex-none',
                  featured ? 'text-blue-400' : 'text-blue-600'
                )}
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const SwirlyDoodle = ({ className }) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 418 42"
      className={className}
      preserveAspectRatio="none"
    >
      <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z" />
    </svg>
  );



  // Features data (ServeMax context)
  const secondaryFeatures = [
    {
      name: 'Dashboard & Analytics',
      summary: 'Get real-time insights into your jobs, invoices, and top performers.',
      description:
        'Track key metrics at a glance. See which clients send the most work, which servers perform best, and monitor your cash flow in real time.',
      image: screenshotDashboard, // Use your existing import
      icon: ReportingIcon,
    },
    {
      name: 'Client Management',
      summary: 'Keep all your clients, contacts, and case history organized in one place.',
      description:
        'Store client details, service addresses, contact information, and full case history. Never lose track of who needs what and when.',
      image: screenshotContacts, // Use your existing import
      icon: ContactsIcon,
    },
    {
      name: 'Document Automation',
      summary: 'Generate affidavits, field sheets, and invoices automatically from job data.',
      description:
        'Reduce paperwork time by auto-generating professional documents. All your forms stay consistent and compliant with your templates.',
      image: screenshotDocuments, // Use your existing import
      icon: InventoryIcon,
    },
  ];

  // Feature card component
  function Feature({ feature, isActive, className, ...props }) {
    const iconId = React.useId();
    return (
      <div
        className={clsx(className, !isActive && 'opacity-75 hover:opacity-100')}
        {...props}
      >
        <div
          className={clsx(
            'w-9 rounded-lg',
            isActive ? 'bg-blue-600' : 'bg-slate-500',
          )}
        >
          <svg aria-hidden="true" className="h-9 w-9" fill="none">
            <feature.icon id={iconId} />
          </svg>
        </div>
        <h3
          className={clsx(
            'mt-6 text-sm font-medium',
            isActive ? 'text-blue-600' : 'text-slate-600',
          )}
        >
          {feature.name}
        </h3>
        <p className="mt-2 font-display text-xl text-slate-900">
          {feature.summary}
        </p>
        <p className="mt-4 text-sm text-slate-600">{feature.description}</p>
      </div>
    );
  }

  // Mobile version
  function FeaturesMobile() {
    return (
      <div className="-mx-4 mt-20 flex flex-col gap-y-10 overflow-hidden px-4 sm:-mx-6 sm:px-6 lg:hidden">
        {secondaryFeatures.map((feature) => (
          <div key={feature.summary}>
            <Feature feature={feature} className="mx-auto max-w-2xl" isActive />
            <div className="relative mt-10 pb-10">
              <div className="absolute -inset-x-4 top-8 bottom-0 bg-slate-200 sm:-inset-x-6" />
              <div className="relative mx-auto w-full max-w-[52.75rem] overflow-hidden rounded-xl bg-white shadow-lg ring-1 shadow-slate-900/5 ring-slate-500/10">
                <img className="w-full" src={feature.image} alt={feature.name} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop version (using shadcn Tabs)
  function FeaturesDesktop() {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
      <div className="hidden lg:mt-20 lg:block">
        <Tabs
          value={secondaryFeatures[activeIndex]?.name}
          onValueChange={(value) => {
            const index = secondaryFeatures.findIndex((f) => f.name === value);
            setActiveIndex(index);
          }}
          className="w-full"
        >
          <div className="grid grid-cols-3 gap-x-8">
            {secondaryFeatures.map((feature, featureIndex) => (
              <button
                key={feature.summary}
                onClick={() => setActiveIndex(featureIndex)}
                className={clsx(
                  "block h-full w-full text-left",
                  featureIndex === activeIndex && "opacity-100",
                  featureIndex !== activeIndex && "opacity-75 hover:opacity-100"
                )}
              >
                <Feature
                  feature={feature}
                  isActive={featureIndex === activeIndex}
                  className="relative w-full h-full flex flex-col"
                />
              </button>
            ))}
          </div>

          <div className="relative mt-20 overflow-hidden rounded-3xl bg-slate-200 px-8 py-12 sm:px-10 lg:px-12 xl:px-14">
            <div className="relative w-full overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {secondaryFeatures.map((feature) => (
                  <div
                    key={feature.summary}
                    className="min-w-full flex-shrink-0 px-4 sm:px-5"
                  >
                    <div className="mx-auto w-full max-w-[48rem] overflow-hidden rounded-xl bg-white shadow-lg ring-1 shadow-slate-900/5 ring-slate-500/10">
                      <img className="w-full h-auto" src={feature.image} alt={feature.name} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-slate-900/10 ring-inset" />
          </div>
        </Tabs>
      </div>
    );
  }


  return (
    <div className="bg-white text-slate-800">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-800 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">ServeMax</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="neutral" onClick={handleLogin}>
              Login
            </Button>
            <Button variant="default" className="bg-blue-800 hover:bg-blue-900 rounded-full text-white" onClick={handleSignUp}>
              Start Free Trial
            </Button>
          </div>
        </div>
      </header>


      <main>
        {/* Hero Section */}

        <Container className="pt-20 pb-16 text-center lg:pt-32">
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-medium tracking-tight text-slate-900 sm:text-7xl">
            The modern{' '}
            <span className="relative whitespace-nowrap text-blue-600">
              <svg
                aria-hidden="true"
                viewBox="0 0 418 42"
                className="absolute top-2/3 left-0 h-[0.58em] w-full fill-blue-300/70"
                preserveAspectRatio="none"
              >
                <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z" />
              </svg>
              <span className="relative">CRM for process servers</span>
            </span>{' '}
            built for scale.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg tracking-tight text-slate-700">
            ServeMax centralizes your jobs, clients, servers, and accounting in one powerful dashboard, so you
            spend less time on admin work and more time growing your business.
          </p>
          <div className="mt-10 flex justify-center gap-x-6">
            <Button
              size="lg"
              onClick={handleSignUp}
              className="px-8 py-6 rounded-full bg-blue-800 hover:bg-blue-900 text-white"
            >
              Start free trial
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleLogin}
              className="px-8 py-6 rounded-full"
            >
              Watch product tour
            </Button>
          </div>

          <div className="mt-36 lg:mt-44">
            <p className="font-display text-base text-slate-900">
              Trusted by these six companies so far
            </p>
            <ul
              role="list"
              className="mt-8 flex items-center justify-center gap-x-8 sm:flex-col sm:gap-x-0 sm:gap-y-10 xl:flex-row xl:gap-x-12 xl:gap-y-0"
            >
              {[
                [
                  { name: 'Transistor', logo: logoTransistor },
                  { name: 'Tuple', logo: logoTuple },
                  { name: 'StaticKit', logo: logoStaticKit },
                ],
                [
                  { name: 'Mirage', logo: logoMirage },
                  { name: 'Laravel', logo: logoLaravel },
                  { name: 'Statamic', logo: logoStatamic },
                ],
              ].map((group, groupIndex) => (
                <li key={groupIndex}>
                  <ul
                    role="list"
                    className="flex flex-col items-center gap-y-8 sm:flex-row sm:gap-x-12 sm:gap-y-0"
                  >
                    {group.map((company) => (
                      <li key={company.name} className="flex">
                        <img src={company.logo} alt={company.name}  />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </Container>

        {/* Features Section */}
        <section
          id="features"
          aria-label="ServeMax features"
          className="relative overflow-hidden bg-blue-600 pt-20 pb-28 sm:py-32"
        >
          <img
            className="absolute top-1/2 left-1/2 max-w-none translate-x-[-44%] translate-y-[-42%] opacity-40"
            src={backgroundFeatures}
            alt=""
          />

          <Container className="relative">
            <div className="max-w-2xl md:mx-auto md:text-center xl:max-w-none">
              <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl md:text-5xl">
                Everything you need to run your process serving business.
              </h2>
              <p className="mt-6 text-lg tracking-tight text-blue-100">
                From first job intake to final invoice, ServeMax keeps your jobs, documents,
                and accounting in sync.
              </p>
            </div>

            <Tabs
              defaultValue={primaryFeatures[0]?.title}
              className="mt-16 grid grid-cols-1 items-center gap-y-2 pt-10 sm:gap-y-6 md:mt-20 lg:grid-cols-12 lg:pt-0"
            >

              {/* Left side: cards */}
              {/* Left side: cards */}
              <div className="lg:col-span-5 lg:pr-8 relative z-10 w-full -mx-4 sm:mx-0">
                <TabsList className="w-full flex flex-row gap-x-4 overflow-x-auto pb-4 sm:overflow-visible sm:pb-0 lg:flex-col lg:gap-x-0 lg:gap-y-1 bg-transparent px-4 sm:px-0">
                  {primaryFeatures.map((feature) => (
                    <TabsTrigger
                      key={feature.title}
                      value={feature.title}
                      className="
                      group
                      relative
                      flex w-full flex-col items-start
                      rounded-full lg:rounded-l-xl lg:rounded-r-none
                      px-4 py-1 lg:p-6
                      text-center lg:text-left
                      text-blue-100
                      bg-transparent
                      hover:bg-white/10 lg:hover:bg-white/5
                      data-[state=active]:bg-white
                      lg:data-[state=active]:bg-white/10
                      lg:data-[state=active]:ring-1
                      lg:data-[state=active]:ring-white/10
                      lg:data-[state=active]:ring-inset
                      data-[state=active]:text-blue-600
                      lg:data-[state=active]:text-white
                      data-[state=active]:shadow-none
                      !whitespace-normal
                     
                    "
                    >
                      <span
                        className="absolute inset-0 rounded-full lg:rounded-l-xl lg:rounded-r-none"
                        aria-hidden="true"
                      />
                      <span className="relative">{feature.title}</span>
                      <p className="relative mt-2 hidden text-sm lg:block text-blue-100 group-hover:text-white">
                        {feature.description}
                      </p>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Right side: screenshot */}
              <div className="lg:col-span-7">
                {primaryFeatures.map((feature) => (
                  <TabsContent key={feature.title} value={feature.title}>
                    <div className="relative sm:px-6 lg:hidden">
                      <div className="absolute -inset-x-4 -top-26 -bottom-17 bg-white/10 ring-1 ring-white/10 ring-inset sm:inset-x-0 sm:rounded-t-xl" />
                      <p className="relative mx-auto max-w-2xl text-base text-white sm:text-center">
                        {feature.description}
                      </p>
                    </div>
                    <div className="mt-10 w-[45rem] overflow-hidden rounded-xl bg-slate-50 shadow-xl shadow-blue-900/20 sm:w-auto lg:mt-0 lg:w-[67.8125rem]">
                      <img className="w-full" src={feature.image} alt={feature.title} />
                    </div>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </Container>
        </section>



        {/* Secondary Features Section */}
        <section
          id="secondary-features"
          aria-label="Features for simplifying everyday business tasks"
          className="pt-20 pb-14 sm:pt-32 sm:pb-20 lg:pb-32"
        >
          <Container>
            <div className="mx-auto max-w-2xl md:text-center">
              <h2 className="font-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
                Simplify everyday process serving tasks.
              </h2>
              <p className="mt-4 text-lg tracking-tight text-slate-700">
                From job creation to final invoice, ServeMax automates the admin work
                so you can focus on serving papers and growing your business.
              </p>
            </div>
            <FeaturesMobile />
            <FeaturesDesktop />
          </Container>
        </section>


        {/* get started today section */}
        <section
          id="get-started-today"
          className="relative overflow-hidden bg-blue-600 py-32"
        >
          <img
            className="absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 opacity-40"
            src={backgroundImage}
            alt=""
            width={2347}
            height={1244}
          />
          <Container className="relative">
            <div className="mx-auto max-w-lg text-center">
              <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
                Be up and running with ServeMax in minutes
              </h2>
              <p className="mt-4 text-lg tracking-tight text-blue-100">
                Centralize your jobs, clients, servers, and invoices in one dashboard.
                Start your free trial today and see how much admin time you can save.
              </p>
              <Button
                size="lg"
                onClick={handleSignUp}
                className="mt-10 px-8 py-6 rounded-full bg-white text-blue-700 hover:bg-blue-100 font-semibold"
              >
                Start your free trial
              </Button>
            </div>
          </Container>
        </section>

        {/* testimonials section */}
        <section
          id="testimonials"
          aria-label="What our customers are saying"
          className="bg-slate-50 py-20 sm:py-32"
        >
          <Container>
            <div className="mx-auto max-w-2xl md:text-center">
              <h2 className="font-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
                Loved by businesses worldwide.
              </h2>
              <p className="mt-4 text-lg tracking-tight text-slate-700">
                Our software is so simple that people can’t help but fall in love
                with it. Simplicity is easy when you just skip tons of
                mission-critical features.
              </p>
            </div>
            <ul
              role="list"
              className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:gap-8 lg:mt-20 lg:max-w-none lg:grid-cols-3"
            >
              {testimonials.map((column, columnIndex) => (
                <li key={columnIndex}>
                  <ul role="list" className="flex flex-col gap-y-6 sm:gap-y-8">
                    {column.map((testimonial, testimonialIndex) => (
                      <li key={testimonialIndex}>
                        <figure className="relative rounded-2xl bg-white p-6 shadow-xl shadow-slate-900/10">
                          <QuoteIcon className="absolute top-6 left-6 fill-slate-100" />
                          <blockquote className="relative">
                            <p className="text-lg tracking-tight text-slate-900">
                              {testimonial.content}
                            </p>
                          </blockquote>
                          <figcaption className="relative mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
                            <div>
                              <div className="font-display text-base text-slate-900">
                                {testimonial.author.name}
                              </div>
                              <div className="mt-1 text-sm text-slate-500">
                                {testimonial.author.role}
                              </div>
                            </div>
                            <div className="overflow-hidden rounded-full bg-slate-50">
                              <img
                                className="h-14 w-14 object-cover"
                                src={testimonial.author.image}
                                alt=""
                                width={56}
                                height={56}
                              />
                            </div>
                          </figcaption>
                        </figure>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Container>
        </section>




        {/* Pricing Section */}

        <section
          id="pricing"
          aria-label="Pricing"
          className="bg-slate-900 py-20 sm:py-32"
        >
          <Container>
            <div className="md:text-center">
              <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
                <span className="relative whitespace-nowrap">
                  <SwirlyDoodle className="absolute top-1/2 left-0 h-[1em] w-full fill-blue-400" />
                  <span className="relative">Simple pricing,</span>
                </span>{' '}
                for process servers.
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                Choose the ServeMax plan that matches your caseload and team size.
              </p>
            </div>

            {isLoadingPricing ? (
              <div className="mt-16 text-center">
                <p className="text-slate-400">Loading pricing plans...</p>
              </div>
            ) : (
              <div className="-mx-4 mt-16 grid max-w-2xl grid-cols-1 gap-y-10 sm:mx-auto lg:-mx-8 lg:max-w-none lg:grid-cols-3 xl:mx-0 xl:gap-x-8">
                {pricingPlans.map((plan, index) => (
                  <Plan
                    key={plan.id || index}
                    name={plan.name}
                    price={`$${plan.monthly_price}`}
                    description={
                      plan.description ||
                      `${plan.job_limit} jobs per month. Perfect for ${plan.name.toLowerCase()} teams.`
                    }
                    features={plan.features || []}
                    featured={index === 1}
                    onSignUp={handleSignUp}
                  />
                ))}
              </div>
            )}

            <div className="text-center mt-12">
              <p className="text-white">
                All plans include a 30-day free trial. No credit card required.
              </p>
            </div>
          </Container>
        </section>


        {/* faq section */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          className="relative overflow-hidden bg-slate-50 py-20 sm:py-32"
        >
          <img
            className="absolute top-0 left-1/2 max-w-none translate-x-[-30%] -translate-y-1/4"
            src={faqbackgroundImage}
            alt=""
            width={1558}
            height={946}
          />
          <Container className="relative">
            <div className="mx-auto max-w-2xl lg:mx-0">
              <h2
                id="faq-title"
                className="font-display text-3xl tracking-tight text-slate-900 sm:text-4xl"
              >
                Frequently asked questions
              </h2>
              <p className="mt-4 text-lg tracking-tight text-slate-700">
                If you can’t find what you’re looking for, email our support team
                and if you’re lucky someone will get back to you.
              </p>
            </div>
            <ul
              role="list"
              className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3"
            >
              {faqs.map((column, columnIndex) => (
                <li key={columnIndex}>
                  <ul role="list" className="flex flex-col gap-y-8">
                    {column.map((faq, faqIndex) => (
                      <li key={faqIndex}>
                        <h3 className="font-display text-lg/7 text-slate-900">
                          {faq.question}
                        </h3>
                        <p className="mt-4 text-sm text-slate-700">{faq.answer}</p>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <p>
            &copy; {new Date().getFullYear()} ServeMax. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
