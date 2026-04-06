import { Target, Lightbulb } from 'lucide-react';

export function Mission() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Mission Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-10 shadow-lg border border-blue-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Mission</h2>
            </div>
            <div className="space-y-4 text-base md:text-lg text-slate-700 leading-relaxed">
              <p>
                NetComplex is not a management tool. We are an{' '}
                <span className="font-semibold text-blue-700">informatics platform</span> — a living
                network that gives homeowners associations and their residents a shared language, a
                common space, and the infrastructure to act together.
              </p>
              <p className="font-medium text-slate-900 pt-2">
                Where other platforms manage properties, we activate communities.
              </p>
            </div>
          </div>

          {/* Core Belief Card */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 md:p-10 shadow-lg border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-slate-700 rounded-xl">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900">Core belief</h3>
            </div>
            <p className="text-base md:text-lg text-slate-700 leading-relaxed">
              A neighbourhood is not just an address. It is a{' '}
              <span className="font-semibold text-slate-900">
                network of relationships, resources, and shared stakes
              </span>
              . NetComplex makes that network visible, useful, and participatory.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
