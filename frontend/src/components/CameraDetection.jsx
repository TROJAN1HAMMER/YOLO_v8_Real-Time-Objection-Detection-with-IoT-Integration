// src/components/CameraDetection.jsx
import React, { useRef, useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

function CameraDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [detections, setDetections] = useState([]);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // mobile rear camera
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStreaming(true);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        toast.error("Could not access the camera!");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      try {
        const formData = new FormData();
        formData.append("file", blob, "frame.jpg");
        const response = await axios.post(
          "http://localhost:8000/predict/",
          formData
        );

        const { detections } = response.data;
        setDetections(detections);
        toast.success("Frame analyzed!");
      } catch (err) {
        console.error(err);
        toast.error("Error analyzing frame");
      }
    }, "image/jpeg");
  };

  return (
    <div className="h-auto bg-gradient-to-br from-purple-950 via-purple-900 to-black flex flex-col md:flex-row items-center justify-center px-4 py-8 md:px-6 md:py-12 relative overflow-hidden rounded-2xl">
      {/* Background Blobs */}
      <motion.div
        className="absolute top-8 left-8 w-60 h-60 md:w-96 md:h-96 bg-purple-700 rounded-full mix-blend-multiply filter blur-3xl opacity-25"
        animate={{ y: [0, 18, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-8 right-8 w-64 h-64 md:w-96 md:h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        animate={{ y: [0, -18, 0] }}
        transition={{ duration: 14, repeat: Infinity }}
      />

      <motion.div
        className="relative z-10 flex flex-col md:grid md:grid-cols-2 gap-6 w-full bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl p-6 md:p-8 max-h-[85vh] overflow-y-auto"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* LEFT - Video Feed */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <h1 className="text-xl md:text-3xl font-bold text-white mb-2">
            Live Camera Detection
          </h1>
          <video
            ref={videoRef}
            className="rounded-lg border border-gray-700 w-full max-w-sm"
            playsInline
            muted
          ></video>

          <canvas ref={canvasRef} className="hidden"></canvas>

          <button
            onClick={captureFrame}
            disabled={!streaming}
            className="mt-4 px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium shadow hover:scale-[1.02] transition text-sm md:text-base"
          >
            {streaming ? "Capture & Detect" : "Starting Camera..."}
          </button>
        </div>

        {/* RIGHT - Detections */}
        <div className="flex flex-col gap-4">
          <h4 className="text-sm font-medium text-pink-300 mb-2">
            Detected Objects
          </h4>
          {detections.length === 0 ? (
            <div className="text-xs text-gray-400">No detections yet.</div>
          ) : (
            <ul className="space-y-2">
              {detections.map((d, i) => (
                <li
                  key={i}
                  className="flex justify-between text-sm text-gray-200 bg-white/5 px-3 py-2 rounded"
                >
                  <span className="font-medium text-purple-200">
                    {d.label}
                  </span>
                  <span className="text-gray-300">
                    {(d.confidence * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default CameraDetection;
