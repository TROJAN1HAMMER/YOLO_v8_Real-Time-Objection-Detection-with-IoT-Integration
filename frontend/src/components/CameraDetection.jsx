// src/components/CameraDetection.jsx
import React, { useRef, useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

function CameraDetection() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [detections, setDetections] = useState([]);
  const [selectedGrid, setSelectedGrid] = useState(1);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
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
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const drawGridOverlay = () => {
    if (!overlayRef.current || !videoRef.current) return;
    const canvas = overlayRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.font = "22px Poppins";
    ctx.fillStyle = "white";

    // Vertical & horizontal lines
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Label grids with glow
    const labelStyle = { shadowColor: "black", shadowBlur: 8 };
    ctx.shadowColor = "black";
    ctx.shadowBlur = 8;
    ctx.fillText("1", 10, 30);
    ctx.fillText("2", canvas.width / 2 + 10, 30);
    ctx.fillText("3", 10, canvas.height / 2 + 30);
    ctx.fillText("4", canvas.width / 2 + 10, canvas.height / 2 + 30);

    // Highlight selected grid
    ctx.fillStyle = "rgba(59, 130, 246, 0.25)"; // blue overlay
    switch (selectedGrid) {
      case 1: ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2); break;
      case 2: ctx.fillRect(canvas.width / 2, 0, canvas.width / 2, canvas.height / 2); break;
      case 3: ctx.fillRect(0, canvas.height / 2, canvas.width / 2, canvas.height / 2); break;
      case 4: ctx.fillRect(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2); break;
      default: break;
    }
  };

  useEffect(() => {
    let animationFrameId;
    const render = () => {
      drawGridOverlay();
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [selectedGrid]);

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;

    let sx = 0, sy = 0, sw = vw / 2, sh = vh / 2;
    switch (selectedGrid) {
      case 1: sx = 0; sy = 0; break;
      case 2: sx = vw / 2; sy = 0; break;
      case 3: sx = 0; sy = vh / 2; break;
      case 4: sx = vw / 2; sy = vh / 2; break;
    }
    canvas.width = sw; canvas.height = sh;
    ctx.drawImage(videoRef.current, sx, sy, sw, sh, 0, 0, sw, sh);

    canvas.toBlob(async (blob) => {
      try {
        const formData = new FormData();
        formData.append("file", blob, "frame.jpg");
        formData.append("selected_cell", selectedGrid);

        const response = await axios.post(
          "http://localhost:8000/predict/",
          formData
        );

        const data = response.data;
        setDetections(data.detections);

        if (data.person_in_selected_grid) {
          toast.success(`Person detected in Grid ${selectedGrid}`);
        } else {
          toast("No person in the selected grid");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error analyzing frame");
      }
    }, "image/jpeg");
  };

  return (
    <div className="relative h-165 bg-gradient-to-br from-purple-950 via-purple-900 to-black flex items-center justify-center p-6 rounded-2xl">
      {/* Animated Background Blobs */}
      <motion.div className="absolute top-0 left-0 w-80 h-80 bg-purple-700 rounded-full filter blur-3xl opacity-30 mix-blend-multiply"
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity }}
      />
      <motion.div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-600 rounded-full filter blur-3xl opacity-20 mix-blend-multiply"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 15, repeat: Infinity }}
      />

      <motion.div className="relative z-10 grid md:grid-cols-2 gap-6 w-full max-w-6xl bg-black/70 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl p-6 md:p-8 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        {/* Left - Video Feed */}
        <div className="flex flex-col items-center justify-center relative">
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4 tracking-wide">
            Live Camera Detection
          </h2>
          <div className="relative w-full max-w-md">
            <video ref={videoRef} className="rounded-xl border border-gray-600 w-full shadow-lg" playsInline muted />
            <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-xl" />
          </div>
          <canvas ref={canvasRef} className="hidden"></canvas>

          <div className="flex items-center gap-2 mt-4">
            <span className="text-white font-medium">Select Grid:</span>
            {[1,2,3,4].map(g => (
              <button
                key={g}
                className={`px-4 py-1 rounded-lg font-semibold transition-all duration-300 ${
                  selectedGrid===g
                    ? "bg-blue-600 text-white shadow-lg scale-105"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setSelectedGrid(g)}
              >
                {g}
              </button>
            ))}
          </div>

          <button
            onClick={captureFrame}
            disabled={!streaming}
            className="mt-5 px-6 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold shadow-lg hover:scale-105 transition-transform duration-300"
          >
            {streaming ? "Capture & Detect" : "Starting Camera..."}
          </button>
        </div>

        {/* Right - Detection Results */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xl font-semibold text-pink-300 mb-2 tracking-wide">Detected Objects</h3>
          {detections.length === 0 ? (
            <div className="text-gray-400 text-sm">No detections yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {detections.map((d, i) => (
                <motion.div key={i} className="flex justify-between items-center bg-white/10 px-4 py-2 rounded-xl shadow-md"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <span className="text-purple-200 font-medium">{d.label}</span>
                  <span className="text-gray-300">{(d.confidence*100).toFixed(1)}%</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default CameraDetection;
