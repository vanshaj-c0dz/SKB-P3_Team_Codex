"use client";

import { motion } from "framer-motion";

export function TopAppBar() {
  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
      className="bg-[#F9F9F8]/80 dark:bg-stone-950/80 backdrop-blur-xl sticky top-0 flex-none h-16 z-40 flex justify-between items-center px-8 border-b border-outline-variant/10">

      <div className="flex items-center gap-8 pl-3 pr-3">
        <span className=" text-xl font-black text-[#1B3022] dark:text-white font-headline">SuperCrop Engine</span>
        <nav className="hidden md:flex gap-6">
          {["Global", "Genomics", "Climate", "Breeders"].map((link, i) => (
            <a key={link} href="#" className={`font-headline text-xs font-semibold tracking-widest uppercase transition-all hover:opacity-80
              ${i === 0
                ? "text-[#1B3022] dark:text-white border-b-2 border-[#1B3022] dark:border-white pb-1"
                : "text-stone-400 dark:text-stone-500 hover:text-[#1B3022]"}`}
            >
              {link}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden lg:block group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm transition-colors group-focus-within:text-primary">search</span>
          <input className="pl-9 pr-4 py-2 bg-surface-container-low border-b border-b-transparent focus:border-b-primary focus:ring-0 text-sm font-body text-on-surface w-64 rounded-t-sm outline-none transition-colors" placeholder="Search genotypes, sites..." type="text" />
        </div>
        <div className="flex items-center gap-3 text-[#3C692B] dark:text-green-400">
          <button className="p-2 hover:opacity-80 transition-opacity rounded-full hover:bg-surface-container-highest">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 hover:opacity-80 transition-opacity rounded-full hover:bg-surface-container-highest">
            <span className="material-symbols-outlined">science</span>
          </button>
          <button className="p-2 hover:opacity-80 transition-opacity rounded-full hover:bg-surface-container-highest">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </motion.header>
  );
}
