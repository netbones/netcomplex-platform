import { headers } from 'next/headers';
import { APP_NAME } from '@shared/lib';
import { PlatformFooter, PlatformHeader } from '@features/platform';

async function PlatformPrivacy() {
  return (
    <div className="min-h-screen bg-vellum">
      <PlatformHeader variant="light" />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-lapis-deep mb-8">Privacy Policy</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-lg text-lapis-mid mb-8">Last updated: March 2026</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Introduction</h2>
            <p className="text-lapis-mid">
              NetComplex (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to
              protecting your privacy. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our platform and related services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Information We Collect</h2>
            <p className="text-lapis-mid mb-4">We may collect information including:</p>
            <ul className="list-disc pl-6 text-lapis-mid space-y-2">
              <li>
                Account information (name, email, organization details) provided during registration
              </li>
              <li>Usage data and analytics to improve our services</li>
              <li>Communication data from support requests and inquiries</li>
              <li>
                Payment information for paid services (processed securely by third-party providers)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">How We Use Your Information</h2>
            <p className="text-lapis-mid mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 text-lapis-mid space-y-2">
              <li>Provide, maintain, and improve the NetComplex platform</li>
              <li>Communicate platform updates and important notices</li>
              <li>Respond to support requests and inquiries</li>
              <li>Ensure platform security and prevent abuse</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Data Sharing</h2>
            <p className="text-lapis-mid">
              We do not sell your personal information. We may share data with trusted service
              providers who assist in operating our platform, subject to confidentiality agreements.
              Community-specific data is governed by each tenant&apos;s own privacy policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Data Security</h2>
            <p className="text-lapis-mid">
              We implement industry-standard security measures to protect your information,
              including encryption in transit and at rest, access controls, and regular security
              audits.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Your Rights</h2>
            <p className="text-lapis-mid mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-lapis-mid space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Contact Us</h2>
            <p className="text-lapis-mid">
              For questions about this Privacy Policy, please contact us at{' '}
              <a href="mailto:privacy@netbones.co.za" className="text-lapis-azure hover:underline">
                privacy@netbones.co.za
              </a>
            </p>
          </section>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}

function TenantPrivacy() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold text-soralia-primary mb-8">Privacy Policy</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-lg text-gray-600 mb-8">Last updated: March 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
          <p className="text-gray-700">
            {APP_NAME} Homeowners Association (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
            is committed to protecting your privacy. This Privacy Policy explains how we collect,
            use, disclose, and safeguard your information when you use our community portal.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
          <p className="text-gray-700 mb-4">We may collect information including:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Personal information (name, email, phone number) provided during registration</li>
            <li>Property information (street address, unit number)</li>
            <li>Community involvement data (interest groups, bookings)</li>
            <li>Usage data and analytics</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Information</h2>
          <p className="text-gray-700 mb-4">We use your information to:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Provide access to the community directory and services</li>
            <li>Send important community notifications</li>
            <li>Process maintenance requests and bookings</li>
            <li>Improve our services and user experience</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Information Sharing</h2>
          <p className="text-gray-700">
            Your contact information may be visible to other registered residents through our
            community directory. You can control visibility settings in your profile. We do not sell
            or share your personal information with third parties for marketing purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
          <p className="text-gray-700">
            We implement appropriate security measures to protect your personal information. Access
            to your account is protected by authentication mechanisms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
          <p className="text-gray-700 mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Opt out of directory visibility</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-700">
            For questions about this Privacy Policy, please contact the {APP_NAME} HOA at{' '}
            <a href="mailto:privacy@example.com" className="text-soralia-primary hover:underline">
              privacy@example.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function PrivacyPage() {
  const headersList = await headers();
  const plane = headersList.get('x-plane') || 'tenant';

  if (plane === 'platform') {
    return <PlatformPrivacy />;
  }

  return <TenantPrivacy />;
}
