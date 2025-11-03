// frontend/src/App.jsx
import React, { useState } from "react";
import UploadForm from "./components/UploadForm";
import CameraDetection from "./components/CameraDetection";
import { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";

function App() {
  const [mode, setMode] = useState("upload"); // "upload" or "camera"

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Gradient Background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500"
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: 15,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{
          backgroundSize: "200% 200%",
        }}
      />

      {/* Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Mode Toggle */}
      <div className="relative z-10 mt-6 flex gap-4">
        <button
          onClick={() => setMode("upload")}
          className={`px-5 py-2 rounded-full font-semibold shadow-md transition-all ${
            mode === "upload"
              ? "bg-purple-700 text-white"
              : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          📁 Upload Image
        </button>
        <button
          onClick={() => setMode("camera")}
          className={`px-5 py-2 rounded-full font-semibold shadow-md transition-all ${
            mode === "camera"
              ? "bg-purple-700 text-white"
              : "bg-white/20 text-white hover:bg-white/30"
          }`}
        >
          📷 Live Camera
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-5xl px-4 sm:px-6 md:px-8 mt-6">
        {mode === "upload" ? <UploadForm /> : <CameraDetection />}
      </div>

      {/* Toast Notifications */}
      <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
    </div>
  );
}

export default App;
