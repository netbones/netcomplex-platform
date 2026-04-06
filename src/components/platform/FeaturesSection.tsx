'use client';

const features = [
  {
    icon: '📅',
    title: 'Facility Bookings',
    desc: 'Manage amenity bookings with ease. Swimming pools, tennis courts, function rooms, and more.',
  },
  {
    icon: '🔧',
    title: 'Maintenance Requests',
    desc: 'Streamline maintenance workflow from submission to completion with tracking and reporting.',
  },
  {
    icon: '💬',
    title: 'Community Chat',
    desc: 'Keep residents informed with announcements, discussions, and group messaging.',
  },
  {
    icon: '👥',
    title: 'Resident Directory',
    desc: 'A searchable directory with contact information, unit details, and role-based access.',
  },
  {
    icon: '📊',
    title: 'Surveys & Voting',
    desc: 'Collect feedback and make decisions with surveys, polls, and voting tools.',
  },
  {
    icon: '🎉',
    title: 'Events & Activities',
    desc: 'Plan and promote community events with calendars and RSVP management.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Everything You Need to Manage Your Community
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Powerful tools designed for HOA boards, property managers, and community leaders.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
