'use client';

const samplePhotos = [
  {
    id: 1,
    title: 'Morning Dew Aloe',
    author: 'Community Member A',
    image:
      'https://cdn.prod.website-files.com/5bc276afccad94a3a06cdf15/5ff131bffdd5f75a881a0ad7_20201127_Aloe%20ferox_334.jpg',
  },
  {
    id: 2,
    title: 'Aloe in Bloom',
    author: 'Community Member B',
    image: 'https://www.gardenia.net/wp-content/uploads/2023/04/Aloe-ferox4.webp',
  },
  {
    id: 3,
    title: 'Aloe and the Sunset',
    author: 'Community Member C',
    image: 'https://www.vetplant.co.za/wp-content/uploads/2017/06/aloferox3.jpg',
  },
];

export default function CompetitionPage() {
  return (
    <main className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-4 py-1 rounded-full mb-4">
          Photography Competition
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Aloe in Wonderland</h1>
        <p className="text-xl text-gray-600">Best Aloe Photography Competition</p>
      </div>

      <div className="max-w-3xl mx-auto mb-12">
        <p className="text-gray-700 text-lg text-center">
          Showcase the beauty of Soralia&apos;s indigenous flora! Submit your best photographs of
          Aloe plants found within our community. Winners will be featured on our community
          platforms and receive a special prize.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {samplePhotos.map(photo => (
          <div
            key={photo.id}
            className="bg-gray-50 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="aspect-w-16 aspect-h-12">
              <img src={photo.image} alt={photo.title} className="w-full h-48 object-cover" />
            </div>
            <div className="p-4 text-center">
              <h3 className="font-semibold text-lg text-gray-900">&ldquo;{photo.title}&rdquo;</h3>
              <p className="text-gray-600 text-sm">By: {photo.author}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button className="bg-green-600 text-white py-3 px-8 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg">
          <i className="fas fa-camera mr-2"></i>
          Submit Your Aloe Photo!
        </button>
      </div>

      <div className="mt-16 bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Competition Rules</h2>
        <div className="max-w-2xl mx-auto text-gray-700 space-y-4">
          <ul className="list-disc pl-6 space-y-2">
            <li>Photos must be taken within Soralia Village community</li>
            <li>Only Aloe plants (any species) qualify</li>
            <li>One submission per resident</li>
            <li>High-resolution images (minimum 1920x1080) preferred</li>
            <li>No heavy editing or AI enhancement</li>
            <li>Deadline: End of October each year</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-600">
          Questions? Contact the competition organizer at{' '}
          <a href="mailto:competition@soralia.co.za" className="text-green-600 hover:underline">
            competition@soralia.co.za
          </a>
        </p>
      </div>
    </main>
  );
}
