import { Users, Wrench, Calendar, Megaphone, BarChart3, Heart } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from './ui/card';

const features = [
  {
    icon: Users,
    title: 'Residents Directory',
    description:
      'Know who lives nearby. A trusted, opt-in listing of your community — connect with neighbours you actually see.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Wrench,
    title: 'Maintenance Requests',
    description:
      'Log it, track it, resolve it. From leaky faucets to community repairs — every request gets a number.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: Calendar,
    title: 'Facility Bookings',
    description:
      'Book amenities with ease. Swimming pools, tennis courts, function rooms — reserve your space.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Megaphone,
    title: 'Community Announcements',
    description:
      'Your space to post updates, stories, and announcements. Keep everyone informed and engaged.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: BarChart3,
    title: 'Surveys & Polling',
    description:
      'Ask your community. Get real answers. Quick questions, instant sentiment — make decisions together.',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    icon: Heart,
    title: 'Interest Groups',
    description:
      'Find your people within your complex. Connect over shared interests, activities, and causes.',
    color: 'bg-red-100 text-red-600',
  },
];

export function Features() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
            Build a Connected Community
          </h2>
          <p className="text-lg text-slate-600">
            Powerful tools that transform residential communities from managed populations into
            informed, engaged, and self-expressive networks.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
              >
                <CardHeader className="space-y-4 pb-8">
                  <div
                    className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl text-slate-900">{feature.title}</CardTitle>
                  <CardDescription className="text-base text-slate-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
