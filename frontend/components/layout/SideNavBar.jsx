"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SideNavBar({ navItems }) {
  const pathname = usePathname();

  return (
    <motion.nav 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="bg-[#F3F4F3] dark:bg-stone-900 h-screen w-64 fixed left-0 top-0 border-none flat no shadows flex flex-col py-6 px-4 z-50">
      <div className="mb-8 px-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>spa</span>
        </div>
        <div>
            <h1 className="text-lg font-bold text-[#1B3022] dark:text-stone-100 tracking-tighter">Agri-AI Lab</h1>
            <p className="font-['Manrope'] text-[10px] tracking-tight font-bold text-secondary uppercase">Precision Systems</p>
        </div>
      </div>

      <button className="mb-8 w-full py-3 px-4 bg-primary-container text-on-primary-container rounded-xl font-label text-sm font-medium hover:bg-surface-tint transition-colors duration-200 flex items-center justify-center gap-2">
        <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>add</span>
        Run New Simulation
      </button>

      <div className="flex-1 flex flex-col gap-2">
        {navItems.map((item, i) => {
          const isActive = pathname === item.href || (pathname === '/' && item.href === '/');
          return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold cursor-pointer active:scale-95 transition-all
              ${isActive 
                ? "text-[#1B3022] dark:text-white border-r-4 border-[#3C692B] bg-stone-200/50 dark:bg-stone-800/50" 
                : "text-stone-500 dark:text-stone-400 hover:text-[#3C692B] hover:bg-stone-200/50 dark:hover:bg-stone-800/50 font-medium"
              }
            `}
          >
            <span className="material-symbols-outlined" style={{fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"}}>{item.icon}</span>
            <span className="font-headline text-sm tracking-tight">{item.label}</span>
          </Link>
        )})}
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-outline-variant/20 pt-4">
        <a className="flex items-center gap-3 px-4 py-2 rounded-lg font-medium text-stone-500 dark:text-stone-400 hover:text-[#3C692B] hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors duration-200 cursor-pointer active:scale-95 transition-transform" href="#">
          <span className="material-symbols-outlined">settings</span>
          <span className="font-headline text-sm tracking-tight">Lab Settings</span>
        </a>
        <a className="flex items-center gap-3 px-4 py-2 rounded-lg font-medium text-stone-500 dark:text-stone-400 hover:text-[#3C692B] hover:bg-stone-200/50 dark:hover:bg-stone-800/50 transition-colors duration-200 cursor-pointer active:scale-95 transition-transform" href="#">
          <span className="material-symbols-outlined">contact_support</span>
          <span className="font-headline text-sm tracking-tight">Support</span>
        </a>
      </div>
    </motion.nav>
  );
}
