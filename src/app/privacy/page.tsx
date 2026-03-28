export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold text-soralia-primary mb-8">Privacy Policy</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-lg text-gray-600 mb-8">Last updated: March 2026</p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
          <p className="text-gray-700">
            Soralia Village Homeowners Association (&quot;we,&quot; &quot;our,&quot; or
            &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when you use our community
            portal.
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
            to your account is protected by authentication mechanisms provided by Stack Auth.
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
            For questions about this Privacy Policy, please contact the Soralia Village HOA at{' '}
            <a href="mailto:info@soralia.co.za" className="text-soralia-primary hover:underline">
              info@soralia.co.za
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
