import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img
                src="/logo.png"
                alt="Soralia Village Logo"
                className="w-12 h-12 rounded-full bg-white p-1 shadow-md object-cover"
              />
              <div>
                <h3 className="text-xl font-bold">Soralia Village</h3>
                <p className="text-sm text-gray-300">Community Living</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4">
              A premier residential community in Cape Town, offering modern living with exceptional
              amenities and services.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-soralia-accent transition-colors">
                <i className="fab fa-facebook text-xl" aria-hidden="true"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-soralia-accent transition-colors">
                <i className="fab fa-twitter text-xl" aria-hidden="true"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-soralia-accent transition-colors">
                <i className="fab fa-instagram text-xl" aria-hidden="true"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-soralia-accent transition-colors">
                <i className="fab fa-linkedin text-xl" aria-hidden="true"></i>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-gray-300 hover:text-yellow-400 transition-colors text-sm"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/directory"
                  className="text-gray-300 hover:text-yellow-400 transition-colors text-sm"
                >
                  Directory
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="text-gray-300 hover:text-yellow-400 transition-colors text-sm"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  href="/resources"
                  className="text-gray-300 hover:text-yellow-400 transition-colors text-sm"
                >
                  Resources
                </Link>
              </li>
              <li>
                <Link
                  href="/conservation"
                  className="text-gray-300 hover:text-yellow-400 transition-colors text-sm"
                >
                  Conservation
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:text-yellow-400 transition-colors text-sm"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/services#maintenance"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  Maintenance
                </Link>
              </li>
              <li>
                <Link
                  href="/services#security"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  Security
                </Link>
              </li>
              <li>
                <Link
                  href="/services#landscaping"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  Landscaping
                </Link>
              </li>
              <li>
                <Link
                  href="/services#amenities"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  Amenities
                </Link>
              </li>
              <li>
                <Link
                  href="/resources#events"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  Events
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <i
                  className="fas fa-map-marker-alt text-soralia-accent mt-1"
                  aria-hidden="true"
                ></i>
                <div>
                  <p className="text-gray-300 text-sm">Soralia Village</p>
                  <p className="text-gray-300 text-sm">Cape Town, South Africa</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fas fa-phone text-soralia-accent" aria-hidden="true"></i>
                <a
                  href="tel:+27215550000"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  +27 21 555-0000
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fas fa-envelope text-soralia-accent" aria-hidden="true"></i>
                <a
                  href="mailto:info@soralia.co.za"
                  className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
                >
                  info@soralia.co.za
                </a>
              </div>
              <div className="flex items-center space-x-3">
                <i className="fas fa-clock text-soralia-accent" aria-hidden="true"></i>
                <div>
                  <p className="text-gray-300 text-sm">Office Hours:</p>
                  <p className="text-gray-300 text-sm">Mon-Fri: 8AM-5PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-600 pt-8 mb-8">
          <h4 className="text-lg font-semibold mb-4 text-center">Emergency Contacts</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-600 rounded-lg p-4 text-center">
              <i className="fas fa-exclamation-triangle text-2xl mb-2" aria-hidden="true"></i>
              <h5 className="font-semibold">Emergency</h5>
              <a href="tel:+27215554357" className="text-sm hover:underline">
                +27 21 555-HELP
              </a>
            </div>
            <div className="bg-orange-600 rounded-lg p-4 text-center">
              <i className="fas fa-shield-alt text-2xl mb-2" aria-hidden="true"></i>
              <h5 className="font-semibold">Security</h5>
              <a href="tel:+27215557233" className="text-sm hover:underline">
                +27 21 555-SAFE
              </a>
            </div>
            <div className="bg-green-600 rounded-lg p-4 text-center">
              <i className="fas fa-tools text-2xl mb-2" aria-hidden="true"></i>
              <h5 className="font-semibold">Maintenance</h5>
              <a href="tel:+27215534948" className="text-sm hover:underline">
                +27 21 555-FIXIT
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-600 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <p className="text-gray-300 text-sm">
                &copy; {new Date().getFullYear()} Soralia Village Homeowners Association. All rights
                reserved.
              </p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end space-x-6">
              <Link
                href="#"
                className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
              >
                Community Guidelines
              </Link>
              <Link
                href="/resources#contacts"
                className="text-gray-300 hover:text-soralia-accent transition-colors text-sm"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
