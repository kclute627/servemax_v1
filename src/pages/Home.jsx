import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { ShieldCheck, Zap, BarChart, Users, FileText, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { entities } from "@/firebase/database";

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

  return (
    <div className="bg-white text-slate-800">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-800 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">ServeMax</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleLogin}>
              Login
            </Button>
            <Button onClick={handleSignUp}>
              Start Free Trial
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 text-center bg-slate-50">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
              The Modern CRM for Process Servers
            </h2>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
              ServeMax is the all-in-one platform designed to streamline your
              process serving business. Manage jobs, clients, servers, and
              accounting with ease.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleSignUp}
                className="text-lg px-8 py-6"
              >
                Start Free Trial
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleLogin}
                className="text-lg px-8 py-6"
              >
                Login
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold text-slate-900">
                Everything You Need, All in One Place
              </h3>
              <p className="mt-4 text-lg text-slate-600">
                Powerful features to automate your workflow and grow your
                business.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-slate-50 p-8 rounded-xl border border-slate-100"
                >
                  <div className="mb-4">{feature.icon}</div>
                  <h4 className="text-xl font-semibold text-slate-900 mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-slate-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold text-slate-900">
                Simple, Transparent Pricing
              </h3>
              <p className="mt-4 text-lg text-slate-600">
                Choose the plan that fits your business needs
              </p>
            </div>

            {isLoadingPricing ? (
              <div className="text-center py-12">
                <p className="text-slate-500">Loading pricing plans...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {pricingPlans.map((plan, index) => (
                  <Card
                    key={plan.id || index}
                    className={`relative ${
                      index === 1 ? "border-2 border-blue-500 shadow-xl" : ""
                    }`}
                  >
                    {index === 1 && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-blue-500 text-white px-4 py-1">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <div className="mt-4">
                        <span className="text-5xl font-bold text-slate-900">
                          ${plan.monthly_price}
                        </span>
                        <span className="text-slate-500">/month</span>
                      </div>
                      <CardDescription className="text-lg font-semibold mt-2">
                        {plan.job_limit} jobs per month
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {plan.features?.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                            <span className="text-slate-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={index === 1 ? "default" : "outline"}
                        onClick={handleSignUp}
                      >
                        Start Free Trial
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="text-center mt-12">
              <p className="text-slate-600">
                All plans include a 30-day free trial. No credit card required.
              </p>
            </div>
          </div>
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
