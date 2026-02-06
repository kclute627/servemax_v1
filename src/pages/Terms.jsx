import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import PublicNavbar from '@/components/layout/PublicNavbar';
import { createPageUrl } from '@/utils';

export default function Terms() {
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
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-3xl font-bold text-stone-900">Terms of Service</h1>
            </div>
            <p className="text-stone-600">Last updated: February 2025</p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-stone-600 leading-relaxed">
                By accessing or using the Diligence platform operated by Diligent ("Company," "we,"
                "our," or "us"), you agree to be bound by these Terms of Service. If you do not
                agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">2. Description of Service</h2>
              <p className="text-stone-600 leading-relaxed">
                Diligence provides a software platform for process serving professionals to manage
                jobs, track service attempts, generate affidavits, invoice clients, and related
                business operations. We reserve the right to modify, suspend, or discontinue any
                aspect of the service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">3. User Accounts</h2>
              <p className="text-stone-600 leading-relaxed mb-4">
                When you create an account, you agree to:
              </p>
              <ul className="list-disc list-inside text-stone-600 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Promptly update any changes to your information</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">4. Acceptable Use</h2>
              <p className="text-stone-600 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-stone-600 space-y-2">
                <li>Use the service for any unlawful purpose</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the service</li>
                <li>Upload malicious code or content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">5. Subscription and Billing</h2>
              <p className="text-stone-600 leading-relaxed">
                Certain features of Diligence require a paid subscription. By subscribing, you agree
                to pay all applicable fees. Subscriptions automatically renew unless cancelled before
                the renewal date. Refunds are provided in accordance with our refund policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">6. Data and Content</h2>
              <p className="text-stone-600 leading-relaxed">
                You retain ownership of all data and content you upload to Diligence. By using our
                service, you grant us a limited license to store, process, and display your content
                as necessary to provide the service. You are responsible for ensuring you have the
                right to upload any content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">7. Limitation of Liability</h2>
              <p className="text-stone-600 leading-relaxed">
                To the maximum extent permitted by law, Diligent shall not be liable for any
                indirect, incidental, special, consequential, or punitive damages resulting from
                your use of or inability to use the service. Our total liability shall not exceed
                the amount paid by you in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">8. Termination</h2>
              <p className="text-stone-600 leading-relaxed">
                We may terminate or suspend your account at any time for violation of these terms.
                Upon termination, your right to use the service ceases immediately. You may export
                your data before termination in accordance with our data export policies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">9. Changes to Terms</h2>
              <p className="text-stone-600 leading-relaxed">
                We may update these Terms of Service from time to time. We will notify you of any
                material changes by posting the new terms on this page and updating the "Last updated"
                date. Your continued use of the service after changes constitutes acceptance of the
                new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-stone-900 mb-4">10. Contact Us</h2>
              <p className="text-stone-600 leading-relaxed">
                If you have questions about these Terms of Service, please contact us at{' '}
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
