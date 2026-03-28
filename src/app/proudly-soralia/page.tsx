'use client';

const values = [
  {
    icon: 'fa-handshake',
    title: 'Community Spirit',
    desc: 'Fostering mutual respect and support among all residents.',
    color: 'text-indigo-600',
  },
  {
    icon: 'fa-leaf',
    title: 'Sustainability',
    desc: 'Committed to preserving our natural environment and promoting eco-friendly living.',
    color: 'text-green-600',
  },
  {
    icon: 'fa-shield-alt',
    title: 'Safety & Well-being',
    desc: 'Ensuring a secure and healthy environment for every family.',
    color: 'text-red-600',
  },
];

const stats = [
  { value: '180', label: 'Homes' },
  { value: '15+', label: 'Years of Community' },
  { value: '47', label: 'Bird Species' },
  { value: '150+', label: 'Native Plants' },
];

const testimonials = [
  {
    name: 'The Williams Family',
    text: 'We have lived in Soralia Village for 8 years and it still feels like a vacation every day. The community is wonderful!',
    icon: 'fa-user',
  },
  {
    name: 'David & Michael',
    text: 'The gardening club has been amazing. We have learned so much about indigenous plants and made great friends.',
    icon: 'fa-user-friends',
  },
  {
    name: 'The Ngubane Family',
    text: 'The security and maintenance teams are exceptional. We never have to worry about anything except enjoying our home.',
    icon: 'fa-users',
  },
];

export default function ProudlySoraliaPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gradient-to-r from-indigo-600 to-green-600 rounded-lg shadow-lg p-8 mb-8 text-white text-center">
        <h1 className="text-5xl font-bold mb-4">Proudly Soralia!</h1>
        <p className="text-xl opacity-90 max-w-3xl mx-auto">
          Celebrating our vibrant community, shared values, and the beautiful place we call home.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Our Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map(value => (
            <div key={value.title} className="text-center p-4">
              <i className={`fas ${value.icon} text-5xl ${value.color} mb-4`}></i>
              <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
              <p className="text-gray-700">{value.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Our Community in Numbers
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          What Our Residents Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map(testimonial => (
            <div key={testimonial.name} className="bg-gray-50 rounded-lg p-6">
              <i className={`fas ${testimonial.icon} text-2xl text-indigo-600 mb-4`}></i>
              <p className="text-gray-700 mb-4 italic">&ldquo;{testimonial.text}&rdquo;</p>
              <p className="font-semibold text-gray-900">- {testimonial.name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Aloe in Wonderland</h2>
        <p className="text-gray-600 mb-6">
          Annual Photography Competition celebrating our indigenous flora
        </p>
        <a
          href="/competition"
          className="inline-block bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold"
        >
          <i className="fas fa-camera mr-2"></i>View Competition
        </a>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-8 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Join Our Community</h2>
        <p className="text-xl opacity-90 mb-6">
          Become part of something special. Experience the Soralia Village lifestyle today.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/directory"
            className="bg-white text-indigo-600 py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
          >
            <i className="fas fa-users mr-2"></i>Meet Your Neighbors
          </a>
          <a
            href="/contact"
            className="bg-transparent border-2 border-white text-white py-3 px-6 rounded-lg hover:bg-white hover:text-indigo-600 transition-colors font-semibold"
          >
            <i className="fas fa-envelope mr-2"></i>Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}
