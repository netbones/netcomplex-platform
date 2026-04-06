'use client';

import Link from 'next/link';

export function PlatformFooter() {
  return (
    <footer className="bg-lapis-deep py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 text-lapis-azure">
          <div>
            <h3 className="text-white font-semibold mb-4">
              NetComplex by <b>Net</b>bones
            </h3>
            <p className="text-sm">
              Community informatics platform that activates residential communities.
            </p>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/pricing" className="hover:text-gold-vein">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-gold-vein">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-gold-vein">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-gold-vein">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gold-vein">
                  Contact
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gold-vein">
                  Blog
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/privacy" className="hover:text-gold-vein">
                  Privacy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-gold-vein">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-lapis-azure/20 mt-8 pt-8 text-center text-sm text-lapis-azure/70">
          © {new Date().getFullYear()} NetComplex by <b>Net</b>bones Africa. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
