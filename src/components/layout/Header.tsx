'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home', page: 'home' },
  { href: '/directory', label: 'Directory', page: 'directory' },
  { href: '/services', label: 'Services', page: 'services' },
  { href: '/resources', label: 'Resources', page: 'resources' },
  { href: '/conservation', label: 'Conservation', page: 'conservation' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="Soralia Village Logo"
            className="w-16 h-16 rounded-full bg-white p-2 border-2 border-white shadow-lg object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold">Soralia Village</h1>
            <p className="text-xs opacity-75">Conscious Community Living</p>
          </div>
        </div>

        <nav className="hidden md:flex space-x-6">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`hover:text-soralia-accent font-medium ${pathname === link.href ? 'text-soralia-accent' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          <Link
            href="/auth-handler"
            className="bg-white text-soralia-primary py-2 px-4 rounded-md hover:bg-gray-100 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}
