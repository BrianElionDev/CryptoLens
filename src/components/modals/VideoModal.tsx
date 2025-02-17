"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

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

  if (!videoId) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute inset-x-0 bottom-0 h-[80vh] bg-gradient-to-b from-gray-900/95 to-gray-800/95 backdrop-blur-xl shadow-2xl rounded-t-xl"
      >
        <div className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50 rounded-t-xl">
          <div className="flex items-center justify-between p-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-200">
                {videoDetails.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-400">
                  {videoDetails.channel}
                </span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-400">
                  {new Date(videoDetails.date).toLocaleDateString()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
        <div className="relative h-full">
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
