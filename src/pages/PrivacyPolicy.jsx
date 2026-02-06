import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import { createPageUrl } from '@/utils';

export default function PrivacyPolicy() {
  return (
    <>
      <PublicNavbar />

      <div className="min-h-screen bg-stone-50 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            to={createPageUrl('Home')}
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#0D2E26] rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-stone-900">Privacy Policy</h1>
            </div>
            <p className="text-stone-600">Last updated: February 2025</p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">1. Introduction</h2>
              <p className="text-stone-600 leading-relaxed">
                Diligent ("we," "our," or "us") operates the Diligence platform. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your information when you use
                our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">2. Information We Collect</h2>
              <p className="text-stone-600 leading-relaxed mb-4">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc list-inside text-stone-600 space-y-2">
                <li>Account information (name, email, phone number, company details)</li>
                <li>Job and service data you enter into the platform</li>
                <li>Client and servee information for process serving purposes</li>
                <li>Payment and billing information</li>
                <li>Communications with us or through our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-stone-600 leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-stone-600 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and requests</li>
                <li>Monitor and analyze trends, usage, and activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">4. Information Sharing</h2>
              <p className="text-stone-600 leading-relaxed">
                We do not sell, trade, or rent your personal information to third parties. We may
                share information with service providers who assist in operating our platform,
                conducting our business, or servicing you, so long as those parties agree to keep
                this information confidential.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">5. Data Security</h2>
              <p className="text-stone-600 leading-relaxed">
                We implement appropriate technical and organizational security measures to protect
                your personal information. However, no method of transmission over the Internet or
                electronic storage is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">6. Your Rights</h2>
              <p className="text-stone-600 leading-relaxed">
                You may access, update, or delete your account information at any time through your
                account settings. You may also contact us to request access to, correction of, or
                deletion of any personal information you have provided.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">7. Contact Us</h2>
              <p className="text-stone-600 leading-relaxed">
                If you have questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:support@diligence.app" className="text-emerald-600 hover:text-emerald-700">
                  support@diligence.app
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
