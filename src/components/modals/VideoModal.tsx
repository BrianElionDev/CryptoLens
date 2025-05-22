"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface VideoDetails {
  title: string;
  channel: string;
  date: string;
}

interface VideoModalProps {
  videoUrl: string;
  onClose: () => void;
  videoDetails: VideoDetails;
}

const getVideoId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export function VideoModal({
  videoUrl,
  onClose,
  videoDetails,
}: VideoModalProps) {
  const videoId = getVideoId(videoUrl);
  const [isMobile, setIsMobile] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Check if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Manage body overflow and cleanup when component mounts/unmounts
  useEffect(() => {
    // Prevent scrolling on body
    document.body.style.overflow = "hidden";

    // Remove any competing overlays
    const cleanupOverlays = () => {
      const otherOverlays = document.querySelectorAll(
        '.fixed.inset-0:not([id="video-modal-overlay"])'
      );

      otherOverlays.forEach((overlay) => {
        if (
          overlay instanceof HTMLElement &&
          !overlay.hasAttribute("data-active") &&
          overlay !== modalRef.current
        ) {
          overlay.style.display = "none";
          overlay.style.visibility = "hidden";
          overlay.style.opacity = "0";
          overlay.style.pointerEvents = "none";
        }
      });
    };

    cleanupOverlays();

    // Restore body and cleanup on unmount
    return () => {
      document.body.style.overflow = "";

      // Handle final cleanup
      cleanupOverlays();
    };
  }, []);

  if (!videoId) {
    return null;
  }

  return (
    <div className="relative z-[1000]">
      {/* The main overlay */}
      <motion.div
        ref={modalRef}
        id="video-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 z-[1000]"
        onClick={onClose}
        style={{ top: "0px" }}
        data-active="true"
      />

      {/* Modal content container */}
      <div className="fixed inset-x-0 top-16 bottom-0 flex items-start justify-center p-4 z-[1001]">
        <motion.div
          initial={{ opacity: 0, y: isMobile ? "20%" : 0, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-4xl bg-gradient-to-b from-gray-900/95 to-gray-800/95 shadow-2xl rounded-xl overflow-hidden mt-4 border border-gray-700/30"
          style={{ maxHeight: "calc(100vh - 100px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gray-900/80 border-b border-gray-800/50">
            <div className="flex items-start md:items-center justify-between p-3 md:p-4">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-base md:text-lg font-semibold text-gray-200 truncate">
                  {videoDetails.title}
                </h2>
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mt-0.5 md:mt-1">
                  <span className="text-xs md:text-sm text-gray-400 truncate">
                    {videoDetails.channel}
                  </span>
                  <span className="hidden md:inline text-sm text-gray-500 flex-shrink-0">
                    •
                  </span>
                  <span className="text-xs md:text-sm text-gray-400 flex-shrink-0">
                    {new Date(videoDetails.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-1.5 md:p-2 hover:bg-gray-800/50 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 md:w-6 md:h-6 text-gray-300 hover:text-white" />
              </button>
            </div>
          </div>

          {/* Video container */}
          <div className="p-2 md:p-4 bg-black">
            <div
              className="w-full bg-black rounded-lg overflow-hidden"
              style={{ height: "auto", maxHeight: "calc(100vh - 180px)" }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full relative z-[1002]"
                style={{
                  aspectRatio: "16/9",
                  height: isMobile ? "100%" : "calc(100vh - 220px)",
                  maxHeight: "70vh",
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
