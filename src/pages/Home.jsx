import React from "react";
import { Button } from "@/components/ui/button";
import { User } from "@/api/entities";
import { createPageUrl } from "@/utils";
import { ShieldCheck, Zap, BarChart, Users, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();
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
