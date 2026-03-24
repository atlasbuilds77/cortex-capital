// Cortex Capital Fish Tank page
// Live visualization of Cortex Capital trading system
import { CortexDashboard } from "@/features/office/components/CortexDashboard";

export default function CortexPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <CortexDashboard layout="full" tradesLimit={15} activityLimit={25} />
      </div>
    </div>
  );
}
