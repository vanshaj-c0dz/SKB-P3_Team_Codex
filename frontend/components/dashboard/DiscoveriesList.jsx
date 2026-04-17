"use client";
import { motion } from "framer-motion";

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

export function DiscoveriesList({ discoveries }) {
  return (
    <motion.div 
      variants={itemVariants}
      className="bg-surface-container-lowest rounded-xl p-6 tincture-shadow border border-outline-variant/15 flex flex-col gap-4 overflow-y-auto"
    >
      <h3 className="font-headline font-bold text-primary-container text-lg border-b border-surface-container-highest pb-2">Recent Discoveries</h3>
      
      <div className="flex flex-col gap-4 mt-2">
        {discoveries.map((discovery, i) => (
          <motion.div 
            key={discovery.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + (i * 0.1) }}
            whileHover={{ scale: 1.02 }}
            className="p-4 bg-surface rounded-lg border border-outline-variant/10 hover:bg-surface-container-low transition-colors group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-0.5 ${discovery.tagColor} ${discovery.tagTextColor} rounded-full text-[10px] font-label font-bold uppercase tracking-wider`}>
                {discovery.tag}
              </span>
              <span className="text-outline text-xs font-label">{discovery.time}</span>
            </div>
            <h4 className={`font-headline font-semibold text-on-surface text-sm mb-1 ${discovery.hoverColor} transition-colors`}>
              {discovery.title}
            </h4>
            <p className="font-body text-xs text-on-surface-variant mb-3">{discovery.description}</p>
            
            <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${discovery.progress}%` }}
                transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                className={`h-full ${discovery.progressColor} rounded-full`}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
