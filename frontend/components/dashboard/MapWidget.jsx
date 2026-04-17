"use client";
import { motion } from "framer-motion";

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

export function MapWidget() {
  return (
    <motion.div 
      variants={itemVariants}
      className="lg:col-span-2 bg-surface-container-low rounded-xl relative overflow-hidden border border-outline-variant/15 flex flex-col min-h-[400px]"
    >
      <div className="p-4 bg-surface-container-lowest/80 backdrop-blur-md absolute top-4 left-4 z-10 rounded-lg tincture-shadow border border-outline-variant/10">
        <h3 className="font-headline font-bold text-primary-container text-sm mb-2">Network Hubs</h3>
        <div className="flex gap-2 font-label text-xs">
            <span className="flex items-center gap-1 text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-secondary"></span> Optimal
            </span>
            <span className="flex items-center gap-1 text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-tertiary-container"></span> Stress
            </span>
        </div>
      </div>
      
      <div className="absolute inset-0 bg-surface-dim">
        {/* We use a colored div overlay simulating the map or a placeholder image if available, using the image url from the design prototype */}
        <img 
          alt="Satellite view of agricultural fields" 
          className="w-full h-full object-cover opacity-80 mix-blend-multiply" 
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJdp-MddoUBIosjN46QPHP-TGctjhDbXXEqc-novDR0YXvqyBefXWCiZD8RPOg_8uTr-2gFbeOuFk5XknQ107kwdjGyoysR707WA_lz1pSHUDe5PcDSMxNpNYRv6KtnCeulHCmuX3aeDrze0pbybaINcgYf_Wqr4rDxjDb2ROV4sNhiqINv98SlxuQTFcgN5pB9OtT1lArzzqX8lke7oNvK6kI4sfI6_3XWS7cQAPZzhYGAuKZ1bvifZSRcxQzeukw0jBIusb-iWuT" 
        />
        
        <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-secondary rounded-full flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 2, 2], opacity: [1, 0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute w-8 h-8 rounded-full border-2 border-secondary"
            />
        </div>
        <div className="absolute top-1/2 left-2/3 w-3 h-3 bg-secondary rounded-full ring-2 ring-secondary/20"></div>
        <div className="absolute top-2/3 left-1/2 w-5 h-5 bg-tertiary-container rounded-full flex items-center justify-center">
            <motion.div 
              animate={{ scale: [1, 2.5, 2.5], opacity: [1, 0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute w-10 h-10 rounded-full border-2 border-tertiary-container"
            />
        </div>
      </div>
    </motion.div>
  );
}
