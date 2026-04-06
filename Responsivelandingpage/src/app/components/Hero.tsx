import { Button } from './ui/button';
import { Network } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-20">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Top Left */}
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        {/* Top Right */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        {/* Bottom Left */}
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-500"></div>
        {/* Bottom Right */}
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-700"></div>
      </div>

      {/* Network/Node Visualization */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Define animations for signals traveling along paths */}
          <linearGradient id="signalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Connection Lines */}
        <line
          x1="15%"
          y1="20%"
          x2="30%"
          y2="35%"
          stroke="#3b82f6"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="30%"
          y1="35%"
          x2="50%"
          y2="40%"
          stroke="#3b82f6"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="50%"
          y1="40%"
          x2="70%"
          y2="35%"
          stroke="#6366f1"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="70%"
          y1="35%"
          x2="85%"
          y2="20%"
          stroke="#6366f1"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="30%"
          y1="35%"
          x2="50%"
          y2="60%"
          stroke="#3b82f6"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="50%"
          y1="60%"
          x2="70%"
          y2="35%"
          stroke="#6366f1"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="15%"
          y1="80%"
          x2="30%"
          y2="65%"
          stroke="#3b82f6"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="70%"
          y1="65%"
          x2="85%"
          y2="80%"
          stroke="#6366f1"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="50%"
          y1="40%"
          x2="50%"
          y2="60%"
          stroke="#3b82f6"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="30%"
          y1="65%"
          x2="50%"
          y2="60%"
          stroke="#3b82f6"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <line
          x1="50%"
          y1="60%"
          x2="70%"
          y2="65%"
          stroke="#6366f1"
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Animated Signal Pulses traveling between nodes */}
        <circle r="4" fill="#3b82f6" opacity="0.8">
          <animateMotion dur="3s" repeatCount="indefinite">
            <mpath href="#path1" />
          </animateMotion>
        </circle>
        <circle r="4" fill="#6366f1" opacity="0.8">
          <animateMotion dur="2.5s" repeatCount="indefinite" begin="0.5s">
            <mpath href="#path2" />
          </animateMotion>
        </circle>
        <circle r="4" fill="#3b82f6" opacity="0.8">
          <animateMotion dur="4s" repeatCount="indefinite" begin="1s">
            <mpath href="#path3" />
          </animateMotion>
        </circle>
        <circle r="4" fill="#6366f1" opacity="0.8">
          <animateMotion dur="3.5s" repeatCount="indefinite" begin="1.5s">
            <mpath href="#path4" />
          </animateMotion>
        </circle>
        <circle r="4" fill="#3b82f6" opacity="0.8">
          <animateMotion dur="3s" repeatCount="indefinite" begin="0.8s">
            <mpath href="#path5" />
          </animateMotion>
        </circle>
        <circle r="4" fill="#6366f1" opacity="0.8">
          <animateMotion dur="2.8s" repeatCount="indefinite" begin="2s">
            <mpath href="#path6" />
          </animateMotion>
        </circle>

        {/* Hidden paths for signal animation */}
        <path id="path1" d="M 15,20 L 30,35 L 50,40" fill="none" opacity="0" />
        <path id="path2" d="M 50,40 L 70,35 L 85,20" fill="none" opacity="0" />
        <path id="path3" d="M 30,35 L 50,60 L 70,65" fill="none" opacity="0" />
        <path id="path4" d="M 85,80 L 70,65 L 70,35 L 50,40" fill="none" opacity="0" />
        <path id="path5" d="M 15,80 L 30,65 L 50,60 L 50,40" fill="none" opacity="0" />
        <path id="path6" d="M 50,60 L 70,35 L 85,20" fill="none" opacity="0" />

        {/* Nodes with pulsing animation */}
        <circle cx="15%" cy="20%" r="8" fill="#3b82f6">
          <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
        {/* Ripples for first node */}
        <circle cx="15%" cy="20%" r="8" fill="none" stroke="#3b82f6" strokeWidth="1.5">
          <animate attributeName="r" values="8;24;32" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.3;0" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="15%" cy="20%" r="8" fill="none" stroke="#3b82f6" strokeWidth="1">
          <animate
            attributeName="r"
            values="8;24;32"
            dur="2s"
            repeatCount="indefinite"
            begin="0.5s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="2s"
            repeatCount="indefinite"
            begin="0.5s"
          />
        </circle>

        <circle cx="30%" cy="35%" r="6" fill="#3b82f6">
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
        {/* Ripples for second node */}
        <circle cx="30%" cy="35%" r="6" fill="none" stroke="#3b82f6" strokeWidth="1.5">
          <animate
            attributeName="r"
            values="6;20;28"
            dur="2.5s"
            repeatCount="indefinite"
            begin="0.3s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="2.5s"
            repeatCount="indefinite"
            begin="0.3s"
          />
        </circle>

        <circle cx="50%" cy="40%" r="10" fill="#6366f1">
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
        {/* Ripples for center node */}
        <circle cx="50%" cy="40%" r="10" fill="none" stroke="#6366f1" strokeWidth="1.5">
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
        <circle cx="50%" cy="40%" r="10" fill="none" stroke="#6366f1" strokeWidth="1">
          <animate
            attributeName="r"
            values="10;28;36"
            dur="3s"
            repeatCount="indefinite"
            begin="1s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="3s"
            repeatCount="indefinite"
            begin="1s"
          />
        </circle>

        <circle cx="70%" cy="35%" r="6" fill="#6366f1">
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
        {/* Ripples for fourth node */}
        <circle cx="70%" cy="35%" r="6" fill="none" stroke="#6366f1" strokeWidth="1.5">
          <animate
            attributeName="r"
            values="6;20;28"
            dur="2.2s"
            repeatCount="indefinite"
            begin="0.7s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="2.2s"
            repeatCount="indefinite"
            begin="0.7s"
          />
        </circle>

        <circle cx="85%" cy="20%" r="8" fill="#6366f1">
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
        {/* Ripples for fifth node */}
        <circle cx="85%" cy="20%" r="8" fill="none" stroke="#6366f1" strokeWidth="1.5">
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
        <circle cx="85%" cy="20%" r="8" fill="none" stroke="#6366f1" strokeWidth="1">
          <animate
            attributeName="r"
            values="8;24;32"
            dur="2.8s"
            repeatCount="indefinite"
            begin="1.5s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="2.8s"
            repeatCount="indefinite"
            begin="1.5s"
          />
        </circle>

        <circle cx="50%" cy="60%" r="7" fill="#3b82f6">
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
        {/* Ripples for sixth node */}
        <circle cx="50%" cy="60%" r="7" fill="none" stroke="#3b82f6" strokeWidth="1.5">
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

        <circle cx="15%" cy="80%" r="6" fill="#3b82f6">
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
        {/* Ripples for seventh node */}
        <circle cx="15%" cy="80%" r="6" fill="none" stroke="#3b82f6" strokeWidth="1.5">
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

        <circle cx="30%" cy="65%" r="5" fill="#3b82f6">
          <animate
            attributeName="r"
            values="5;8;5"
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
        {/* Ripples for eighth node */}
        <circle cx="30%" cy="65%" r="5" fill="none" stroke="#3b82f6" strokeWidth="1">
          <animate
            attributeName="r"
            values="5;18;26"
            dur="2.3s"
            repeatCount="indefinite"
            begin="0.9s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="2.3s"
            repeatCount="indefinite"
            begin="0.9s"
          />
        </circle>

        <circle cx="70%" cy="65%" r="5" fill="#6366f1">
          <animate
            attributeName="r"
            values="5;8;5"
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
        {/* Ripples for ninth node */}
        <circle cx="70%" cy="65%" r="5" fill="none" stroke="#6366f1" strokeWidth="1">
          <animate
            attributeName="r"
            values="5;18;26"
            dur="2.7s"
            repeatCount="indefinite"
            begin="1.5s"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.3;0"
            dur="2.7s"
            repeatCount="indefinite"
            begin="1.5s"
          />
        </circle>

        <circle cx="85%" cy="80%" r="6" fill="#6366f1">
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
        {/* Ripples for tenth node */}
        <circle cx="85%" cy="80%" r="6" fill="none" stroke="#6366f1" strokeWidth="1.5">
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
      </svg>

      <div className="relative max-w-4xl mx-auto text-center space-y-8">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-lg">
            <Network className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Supertext */}
        <div className="space-y-2">
          <p className="text-blue-600 tracking-wider text-sm md:text-base uppercase font-medium">
            Community Informatics Platform
          </p>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight">
            NetComplex
          </h1>
          <p className="text-slate-500 text-sm md:text-base pt-2">by Netbones Africa</p>
        </div>

        {/* Subtext */}
        <p className="text-xl md:text-3xl text-slate-600 font-light">Your complex, connected.</p>

        {/* CTA Button */}
        <div className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Sign Up
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
