// MindLink.jsx
import React from "react";
import { motion } from "framer-motion";
import "./index.css";

export default function MindLink() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen flex flex-col items-center justify-center text-center"
      style={{
        background: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
        color: "#2b2b2b",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div className="p-6 bg-white/70 backdrop-blur-xl rounded-3xl shadow-lg max-w-md">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-[#6c63ff] to-[#ff7b72] text-transparent bg-clip-text">
          MindLink
        </h1>
        <p className="text-sm text-slate-700">
          The intelligent social connection — empathy, creativity, and technology united.
        </p>

        <button
          className="mt-6 px-6 py-2 rounded-full text-white font-semibold shadow-md"
          style={{
            background: "linear-gradient(90deg, #6c63ff, #ff7b72)",
          }}
        >
          Enter Network
        </button>
      </div>
    </motion.div>
  );
}
