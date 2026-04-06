import { Network } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and Name */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Network className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">NetComplex</span>
          </div>

          {/* Tagline */}
          <div className="text-center md:text-right">
            <p className="text-sm">© 2026 NetComplex. Activating communities.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
