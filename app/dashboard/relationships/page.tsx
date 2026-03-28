"use client";

import { RelationshipMatrix } from "@/features/office/components/RelationshipMatrix";

export default function RelationshipsPage() {
  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Agent Relationships
        </h1>
        <p className="text-gray-400">
          Trust dynamics between Cortex Capital trading agents
        </p>
      </div>

      {/* Relationship Matrix */}
      <div className="max-w-7xl">
        <RelationshipMatrix />
      </div>
    </div>
  );
}
