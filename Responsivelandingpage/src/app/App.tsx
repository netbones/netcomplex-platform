import { Hero } from './components/Hero';
import { Mission } from './components/Mission';
import { Features } from './components/Features';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Hero />
      <Mission />
      <Features />
      <Footer />
    </div>
  );
}
