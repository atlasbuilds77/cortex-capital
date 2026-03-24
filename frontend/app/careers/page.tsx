'use client';

import Link from 'next/link';
import { ArrowLeft, Briefcase, MapPin, Clock } from 'lucide-react';

const openings = [
  {
    title: 'Senior Backend Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Build the infrastructure that powers our AI trading agents.',
  },
  {
    title: 'Quantitative Researcher',
    department: 'Research',
    location: 'Remote',
    type: 'Full-time',
    description: 'Develop and backtest new trading strategies.',
  },
  {
    title: 'Frontend Engineer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Create beautiful, responsive interfaces for our trading platform.',
  },
];

export default function CareersPage() {
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
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Careers</h1>
        
        <p className="text-xl text-gray-400 mb-12">
          Join us in building the future of automated trading.
        </p>

        {/* Why Join */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Why Cortex Capital?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Remote First', desc: 'Work from anywhere in the world.' },
              { title: 'Cutting Edge', desc: 'Work with AI, ML, and real-time trading systems.' },
              { title: 'Equity', desc: 'Own a piece of what you help build.' },
            ].map((perk) => (
              <div key={perk.title} className="p-6 rounded-xl bg-slate-900 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-2">{perk.title}</h3>
                <p className="text-gray-400 text-sm">{perk.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Open Positions */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Open Positions</h2>
          
          {openings.length > 0 ? (
            <div className="space-y-4">
              {openings.map((job) => (
                <div key={job.title} className="p-6 rounded-xl bg-slate-900 border border-slate-700 hover:border-purple-500/40 transition">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                      <p className="text-purple-400 text-sm">{job.department}</p>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 md:mt-0 text-sm text-gray-400">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{job.type}</span>
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{job.description}</p>
                  <a 
                    href="mailto:support@zerogtrading.com"
                    className="inline-flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition text-sm"
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Apply Now</span>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-slate-900 border border-slate-700 text-center">
              <p className="text-gray-400">No open positions at the moment. Check back soon!</p>
            </div>
          )}
        </section>

        {/* General Application */}
        <section className="mt-16 p-8 rounded-xl bg-slate-900 border border-slate-700 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Don't see your role?</h3>
          <p className="text-gray-400 mb-4">We're always looking for talented people. Send us your resume.</p>
          <a 
            href="mailto:support@zerogtrading.com"
            className="inline-flex items-center px-6 py-3 rounded-full bg-white/10 text-white font-medium hover:bg-white/20 transition"
          >
            General Application
          </a>
        </section>
      </main>
    </div>
  );
}
