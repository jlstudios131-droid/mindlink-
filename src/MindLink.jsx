import React from "react";
import { motion } from "framer-motion";

export default function MindLink() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 text-gray-800">
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-4xl font-bold tracking-wide"
      >
        MindLink 🌐
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-4 text-lg text-gray-600"
      >
        The intelligent connection between minds.
      </motion.p>
    </div>
  );
}
