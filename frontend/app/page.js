"use client";

import { motion } from "framer-motion";
import { SideNavBar } from "@/components/layout/SideNavBar";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MapWidget } from "@/components/dashboard/MapWidget";
import { DiscoveriesList } from "@/components/dashboard/DiscoveriesList";
import { getDashboardData } from "@/lib/mockData";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
};

export default function Dashboard() {
  const data = getDashboardData();

  return (
    <main className="p-8 overflow-y-auto flex-1 flex flex-col gap-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-between items-end"
      >
        <div>
          <h2 className="text-3xl font-headline font-bold text-primary-container">Global Intelligence</h2>
          <p className="text-on-surface-variant font-body text-sm mt-1">Real-time macro-analysis of breeding network performance.</p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-label font-medium">
            <span className="w-2 h-2 rounded-full bg-secondary"></span> Live Sync
          </span>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {data.metrics.map(metric => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]"
      >
        <MapWidget />
        <DiscoveriesList discoveries={data.discoveries} />
      </motion.div>

    </main>
  );
}
