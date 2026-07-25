export default function GuidelinesPage() {
  return (
    <main className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold text-soralia-primary mb-8">Community Guidelines</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-lg text-gray-600 mb-8">
          These guidelines ensure our community remains a welcoming, harmonious place for all
          residents.
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Respect & Courtesy</h2>
          <p className="text-gray-700">
            Treat all fellow residents, staff, and visitors with dignity and respect. We are a
            diverse community united by shared neighborhood. Personal disagreements should be
            resolved privately and respectfully.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Communication</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>
              Use appropriate channels for concerns - maintenance requests via the portal, personal
              matters directly
            </li>
            <li>Avoid shouting or aggressive behavior in common areas</li>
            <li>Respect quiet hours (10 PM - 7 AM) in shared spaces</li>
            <li>Keep communication professional and constructive</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Property & Common Areas</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Keep common areas clean and free of personal belongings</li>
            <li>Follow parking regulations and designated areas only</li>
            <li>Report maintenance issues promptly through the portal</li>
            <li>Obey speed limits (20 km/h) within the village</li>
            <li>Clean up after pets in all common areas</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Noise & Disturbances</h2>
          <p className="text-gray-700 mb-4">
            Excessive noise that disturbs neighbors is not permitted. This includes:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Loud music or entertainment after 10 PM on weekdays, 11 PM on weekends</li>
            <li>Construction noise during restricted hours (9 AM - 5 PM only)</li>
            <li>Vehicle alarms or horn honking</li>
            <li>Party noise audible from outside your unit</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Rental & Tenancy</h2>
          <p className="text-gray-700">
            All tenants must be registered with the HOA. Property owners are responsible for
            ensuring their tenants comply with all community rules and guidelines.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Safety & Security</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Do not prop open security doors or gates</li>
            <li>Report suspicious activity to security immediately</li>
            <li>Do not share access codes or keys with non-residents</li>
            <li>Follow all emergency and evacuation procedures</li>
            <li>Park only in designated areas</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Interest Groups & Events</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Respect group leaders and their guidelines</li>
            <li>No commercial solicitation within group activities</li>
            <li>Obtain permission for events in common areas</li>
            <li>Clean up after group activities</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Reporting Concerns</h2>
          <p className="text-gray-700 mb-4">
            If you observe violations of these guidelines, please:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>For immediate safety issues - contact security</li>
            <li>For maintenance violations - submit a maintenance request</li>
            <li>For ongoing issues - contact the HOA management</li>
            <li>Document concerns with dates and times when possible</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Enforcement</h2>
          <p className="text-gray-700">
            Violations may result in warnings, fines, or other action as per HOA governing
            documents. Repeated violations or serious incidents may be referred to the HOA Board for
            review.
          </p>
        </section>

        <section className="mb-8 bg-blue-50 p-6 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Emergency Contacts</h2>
          <ul className="text-gray-700 space-y-2">
            <li>
              <strong>Emergency:</strong> +27 21 555-HELP
            </li>
            <li>
              <strong>Security:</strong> +27 21 555-SAFE
            </li>
            <li>
              <strong>Maintenance:</strong> +27 21 555-FIXIT
            </li>
            <li>
              <strong>Email:</strong> info@example.com
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
