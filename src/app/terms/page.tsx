import { headers } from 'next/headers';
import { PlatformFooter, PlatformHeader } from '@features/platform';

async function PlatformTerms() {
  return (
    <div className="min-h-screen bg-vellum">
      <PlatformHeader variant="light" />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-lapis-deep mb-8">Terms of Service</h1>

        <div className="prose prose-lg max-w-none">
          <p className="text-lg text-lapis-mid mb-8">Last updated: March 2026</p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Acceptance of Terms</h2>
            <p className="text-lapis-mid">
              By accessing and using the NetComplex platform (&quot;the Service&quot;), you accept
              and agree to be bound by these terms and conditions. If you do not agree, do not use
              the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Description of Service</h2>
            <p className="text-lapis-mid">
              NetComplex provides a community management platform for residential complexes,
              homeowners associations, and property managers. The platform is operated by Netbones
              Africa (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">User Accounts</h2>
            <p className="text-lapis-mid mb-4">
              To access the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-lapis-mid space-y-2">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Acceptable Use</h2>
            <p className="text-lapis-mid mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-lapis-mid space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the integrity of the Service</li>
              <li>Upload or distribute malicious code or content</li>
              <li>Violate the rights of other users or third parties</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Intellectual Property</h2>
            <p className="text-lapis-mid">
              The NetComplex platform, including its code, design, branding, and content, is owned
              by Netbones Africa and is protected by applicable intellectual property laws. You may
              not reproduce, distribute, or create derivative works without our express permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Limitation of Liability</h2>
            <p className="text-lapis-mid">
              To the fullest extent permitted by law, Netbones Africa shall not be liable for any
              indirect, incidental, special, or consequential damages arising out of or related to
              your use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-lapis-deep mb-4">Contact</h2>
            <p className="text-lapis-mid">
              Questions about these Terms should be sent to{' '}
              <a href="mailto:legal@netbones.co.za" className="text-lapis-azure hover:underline">
                legal@netbones.co.za
              </a>
            </p>
          </section>
        </div>
      </main>
      <PlatformFooter />
    </div>
  );
}

function TenantTerms() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold text-soralia-primary mb-8">Terms of Service</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-lg text-gray-600 mb-8">Last updated: March 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceptance of Terms</h2>
          <p className="text-gray-700">
            By accessing and using the Soralia Village Community Portal, you accept and agree to be
            bound by the terms and provision of this agreement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Use License</h2>
          <p className="text-gray-700 mb-4">
            Permission is granted to temporarily use the Soralia Village portal for personal,
            non-commercial use only. This is the grant of a license, not a transfer of title.
          </p>
          <p className="text-gray-700">
            You may not: modify or copy the materials; use the materials for any commercial purpose;
            transfer the materials to another person; or attempt to decompile or reverse engineer
            any software contained on the site.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User Accounts</h2>
          <p className="text-gray-700 mb-4">
            To access certain features of the portal, you must register for an account. You agree
            to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Provide accurate and complete registration information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Promptly update any changes to your information</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Community Guidelines</h2>
          <p className="text-gray-700 mb-4">All users agree to:</p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Treat all community members with respect and courtesy</li>
            <li>Use the portal for lawful purposes only</li>
            <li>Not post harmful, offensive, or inappropriate content</li>
            <li>Respect the privacy of other residents</li>
            <li>Not spam or engage in unauthorized commercial activities</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Disclaimer</h2>
          <p className="text-gray-700">
            The materials on the Soralia Village portal are provided on an &quot;as is&quot; basis.
            We make no warranties, express or implied, regarding the accuracy, reliability, or
            availability of the portal.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>
          <p className="text-gray-700">
            In no event shall Soralia Village HOA be liable for any damages arising out of the use
            or inability to use the portal.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
          <p className="text-gray-700">
            Questions about these Terms should be sent to{' '}
            <a href="mailto:info@soralia.co.za" className="text-soralia-primary hover:underline">
              info@soralia.co.za
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function TermsPage() {
  const headersList = await headers();
  const plane = headersList.get('x-plane') || 'tenant';

  if (plane === 'platform') {
    return <PlatformTerms />;
  }

  return <TenantTerms />;
}
