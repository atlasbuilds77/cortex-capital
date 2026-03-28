'use client';

import Link from 'next/link';
import { ArrowLeft, Users, Target, Zap, Shield } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <Link href="/" className="text-xl font-bold text-white">
            Cortex Capital
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">About Cortex Capital</h1>
        
        <p className="text-xl text-gray-400 mb-12">
          We're building the future of automated portfolio management, powered by AI agents that work 24/7 to optimize your investments.
        </p>

        {/* Mission */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-gray-400 leading-relaxed">
            Cortex Capital was founded with a simple belief: professional-grade trading strategies shouldn't be reserved for hedge funds and institutions. Our AI-powered platform democratizes access to sophisticated portfolio management, giving retail investors the same tools used by the pros.
          </p>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Target, title: 'Precision', desc: 'Every trade is calculated, every decision data-driven.' },
              { icon: Zap, title: 'Speed', desc: 'Sub-50ms execution. Markets move fast, we move faster.' },
              { icon: Shield, title: 'Security', desc: 'Your credentials are encrypted. Your data is protected.' },
              { icon: Users, title: 'Transparency', desc: 'See exactly what our AI agents are doing and why.' },
            ].map((value) => (
              <div key={value.title} className="p-6 rounded-xl bg-slate-900 border border-slate-700">
                <value.icon className="w-8 h-8 text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">{value.title}</h3>
                <p className="text-gray-400 text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-4">The Team</h2>
          <p className="text-gray-400 leading-relaxed">
            Built by traders, for traders. Our team combines decades of experience in quantitative finance, machine learning, and software engineering. We've worked at hedge funds, trading desks, and tech companies before coming together to build Cortex Capital.
          </p>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Link 
            href="/signup"
            className="inline-flex items-center px-8 py-4 rounded-full bg-purple-600 text-white font-semibold hover:bg-purple-500 transition"
          >
            Get Started
          </Link>
        </div>
      </main>
    </div>
  );
}
