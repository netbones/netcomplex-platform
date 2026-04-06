'use client';

import { PrimaryCTA } from '@/components/ui/PrimaryCTA';
import { SectionLayout } from '@/components/layout/SectionLayout';
import { Network } from 'lucide-react';

export function HeroSection() {
  return (
    <SectionLayout
      size="xl"
      background="transparent"
      className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-vellum to-lapis-azure/10"
    >
      {/* Decorative background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-lapis-azure rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-lapis-azure rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gold-vein rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse delay-500"></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-gold-vein rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse delay-700"></div>
      </div>

      {/* Network/Node Visualization */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="signalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4A7AB5" stopOpacity="0" />
            <stop offset="50%" stopColor="#4A7AB5" stopOpacity="1" />
            <stop offset="100%" stopColor="#4A7AB5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1="15%"
          y1="20%"
          x2="30%"
          y2="35%"
          stroke="#4A7AB5"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="30%"
          y1="35%"
          x2="50%"
          y2="40%"
          stroke="#4A7AB5"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="50%"
          y1="40%"
          x2="70%"
          y2="35%"
          stroke="#C8A84B"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="70%"
          y1="35%"
          x2="85%"
          y2="20%"
          stroke="#C8A84B"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="30%"
          y1="35%"
          x2="50%"
          y2="60%"
          stroke="#4A7AB5"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="50%"
          y1="60%"
          x2="70%"
          y2="35%"
          stroke="#C8A84B"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="15%"
          y1="80%"
          x2="30%"
          y2="65%"
          stroke="#4A7AB5"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="70%"
          y1="65%"
          x2="85%"
          y2="80%"
          stroke="#C8A84B"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="50%"
          y1="40%"
          x2="50%"
          y2="60%"
          stroke="#4A7AB5"
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Signal pulses */}
        <circle r="4" fill="#4A7AB5" opacity="0.8">
          <animateMotion dur="3s" repeatCount="indefinite">
            <mpath href="#path1" />
          </animateMotion>
        </circle>
        <circle r="4" fill="#C8A84B" opacity="0.8">
          <animateMotion dur="2.5s" repeatCount="indefinite" begin="0.5s">
            <mpath href="#path2" />
          </animateMotion>
        </circle>

        <path id="path1" d="M 15,20 L 30,35 L 50,40" fill="none" opacity="0" />
        <path id="path2" d="M 50,40 L 70,35 L 85,20" fill="none" opacity="0" />

        {/* Node 1 - 15% 20% */}
        <circle cx="15%" cy="20%" r="8" fill="#4A7AB5">
          <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="15%" cy="20%" r="8" fill="none" stroke="#4A7AB5" strokeWidth="1.5">
          <animate attributeName="r" values="8;24;32" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.3;0" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* Node 2 - 30% 35% */}
        <circle cx="30%" cy="35%" r="6" fill="#4A7AB5">
          <animate
            attributeName="r"
            values="6;9;6"
            dur="2.5s"
            repeatCount="indefinite"
            begin="0.3s"
          />
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="2.5s"
            repeatCount="indefinite"
            begin="0.3s"
          />
        </circle>

        {/* Node 3 - 50% 40% (center, gold) */}
        <circle cx="50%" cy="40%" r="10" fill="#C8A84B">
          <animate
            attributeName="r"
            values="10;14;10"
            dur="3s"
            repeatCount="indefinite"
            begin="0.5s"
          />
          <animate
            attributeName="opacity"
            values="0.9;1;0.9"
            dur="3s"
            repeatCount="indefinite"
            begin="0.5s"
          />
        </circle>
        <circle cx="50%" cy="40%" r="10" fill="none" stroke="#C8A84B" strokeWidth="1.5">
          <animate
            attributeName="r"
            values="10;28;36"
            dur="3s"
            repeatCount="indefinite"
            begin="0.5s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="3s"
            repeatCount="indefinite"
            begin="0.5s"
          />
        </circle>

        {/* Node 4 - 70% 35% */}
        <circle cx="70%" cy="35%" r="6" fill="#C8A84B">
          <animate
            attributeName="r"
            values="6;9;6"
            dur="2.2s"
            repeatCount="indefinite"
            begin="0.7s"
          />
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="2.2s"
            repeatCount="indefinite"
            begin="0.7s"
          />
        </circle>

        {/* Node 5 - 85% 20% */}
        <circle cx="85%" cy="20%" r="8" fill="#C8A84B">
          <animate
            attributeName="r"
            values="8;12;8"
            dur="2.8s"
            repeatCount="indefinite"
            begin="1s"
          />
          <animate
            attributeName="opacity"
            values="0.8;1;0.8"
            dur="2.8s"
            repeatCount="indefinite"
            begin="1s"
          />
        </circle>
        <circle cx="85%" cy="20%" r="8" fill="none" stroke="#C8A84B" strokeWidth="1.5">
          <animate
            attributeName="r"
            values="8;24;32"
            dur="2.8s"
            repeatCount="indefinite"
            begin="1s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="2.8s"
            repeatCount="indefinite"
            begin="1s"
          />
        </circle>

        {/* Node 6 - 50% 60% */}
        <circle cx="50%" cy="60%" r="7" fill="#4A7AB5">
          <animate
            attributeName="r"
            values="7;10;7"
            dur="2.4s"
            repeatCount="indefinite"
            begin="0.4s"
          />
          <animate
            attributeName="opacity"
            values="0.75;1;0.75"
            dur="2.4s"
            repeatCount="indefinite"
            begin="0.4s"
          />
        </circle>
        <circle cx="50%" cy="60%" r="7" fill="none" stroke="#4A7AB5" strokeWidth="1.5">
          <animate
            attributeName="r"
            values="7;22;30"
            dur="2.4s"
            repeatCount="indefinite"
            begin="0.4s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="2.4s"
            repeatCount="indefinite"
            begin="0.4s"
          />
        </circle>

        {/* Node 7 - 15% 80% */}
        <circle cx="15%" cy="80%" r="6" fill="#4A7AB5">
          <animate
            attributeName="r"
            values="6;9;6"
            dur="2.6s"
            repeatCount="indefinite"
            begin="1.2s"
          />
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="2.6s"
            repeatCount="indefinite"
            begin="1.2s"
          />
        </circle>
        <circle cx="15%" cy="80%" r="6" fill="none" stroke="#4A7AB5" strokeWidth="1.5">
          <animate
            attributeName="r"
            values="6;20;28"
            dur="2.6s"
            repeatCount="indefinite"
            begin="1.2s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="2.6s"
            repeatCount="indefinite"
            begin="1.2s"
          />
        </circle>

        {/* Node 8 - 85% 80% */}
        <circle cx="85%" cy="80%" r="6" fill="#C8A84B">
          <animate
            attributeName="r"
            values="6;9;6"
            dur="2.9s"
            repeatCount="indefinite"
            begin="0.6s"
          />
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="2.9s"
            repeatCount="indefinite"
            begin="0.6s"
          />
        </circle>
        <circle cx="85%" cy="80%" r="6" fill="none" stroke="#C8A84B" strokeWidth="1.5">
          <animate
            attributeName="r"
            values="6;20;28"
            dur="2.9s"
            repeatCount="indefinite"
            begin="0.6s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="2.9s"
            repeatCount="indefinite"
            begin="0.6s"
          />
        </circle>

        {/* Add missing connection lines */}
        <line
          x1="15%"
          y1="80%"
          x2="30%"
          y2="65%"
          stroke="#4A7AB5"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="70%"
          y1="65%"
          x2="85%"
          y2="80%"
          stroke="#C8A84B"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="50%"
          y1="40%"
          x2="50%"
          y2="60%"
          stroke="#4A7AB5"
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Intermediate nodes at bends */}
        <circle cx="30%" cy="65%" r="5" fill="#4A7AB5">
          <animate
            attributeName="r"
            values="5;7;5"
            dur="2.3s"
            repeatCount="indefinite"
            begin="0.9s"
          />
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="2.3s"
            repeatCount="indefinite"
            begin="0.9s"
          />
        </circle>

        <circle cx="70%" cy="65%" r="5" fill="#C8A84B">
          <animate
            attributeName="r"
            values="5;7;5"
            dur="2.7s"
            repeatCount="indefinite"
            begin="1.5s"
          />
          <animate
            attributeName="opacity"
            values="0.7;1;0.7"
            dur="2.7s"
            repeatCount="indefinite"
            begin="1.5s"
          />
        </circle>

        {/* Connection lines to center */}
        <line
          x1="30%"
          y1="65%"
          x2="50%"
          y2="60%"
          stroke="#4A7AB5"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="50%"
          y1="60%"
          x2="70%"
          y2="65%"
          stroke="#C8A84B"
          strokeWidth="1.5"
          opacity="0.4"
        />
      </svg>

      <div className="relative max-w-4xl mx-auto text-center space-y-6">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-lapis-deep rounded-2xl shadow-lg">
            <Network className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <p className="text-gold-vein tracking-wider text-sm md:text-base uppercase font-medium">
            Community Informatics Platform
          </p>
          <h1 className="text-5xl md:text-7xl font-bold text-lapis-deep tracking-tight">
            NetComplex
          </h1>
          <p className="text-lapis-mid text-sm md:text-base pt-2">by Netbones Africa</p>
        </div>

        {/* Subtext */}
        <p className="text-2xl md:text-3xl text-lapis-mid font-light">Your complex, connected.</p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <PrimaryCTA
            href="/signup"
            size="md"
            className="bg-gold-vein text-lapis-deep hover:bg-gold-vein/90"
          >
            Sign Up
          </PrimaryCTA>
          <PrimaryCTA
            href="/pricing"
            variant="outline"
            size="md"
            className="border-2 border-gold-vein text-gold-vein hover:bg-gold-vein/10"
          >
            View Pricing
          </PrimaryCTA>
        </div>
      </div>

      {/* City Silhouette */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none flex justify-center">
        <img
          src="/platform/four.webp"
          alt=""
          className="max-w-3xl w-full h-auto object-contain opacity-70"
        />
      </div>
    </SectionLayout>
  );
}
