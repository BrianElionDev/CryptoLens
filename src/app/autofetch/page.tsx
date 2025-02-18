"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function AutofetchPage() {
  const router = useRouter();
  const [channelHandler, setChannelHandler] = useState("");
  const [publishedBefore, setPublishedBefore] = useState<Date>();
  const [publishedAfter, setPublishedAfter] = useState<Date>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishedBefore || !publishedAfter) {
      setError("Please select both dates");
      return;
    }
    setIsSubmitting(true);
    setError("");

    const promise = axios.post(
      "https://hook.us2.make.com/ngpyvadtax553g1rlsn2cs5soca8ilnv",
      {
        channel_handler: channelHandler.trim(),
        published_before: new Date(
          publishedBefore.setUTCHours(0, 0, 0, 0)
        ).toISOString(),
        published_after: new Date(
          publishedAfter.setUTCHours(0, 0, 0, 0)
        ).toISOString(),
      }
    );

    toast.promise(promise, {
      loading: "Starting automation...",
      success: () => {
        setTimeout(() => {
          router.push("/knowledge");
        }, 5000);
        return "Automation started successfully! It is running in the background and will take a few minutes to complete.";
      },
      error: "Failed to start automation",
    });

    try {
      await promise;
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to start automation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 bg-gradient-to-br from-gray-900 via-blue-900/50 to-gray-900">
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1F2937",
            color: "#E5E7EB",
            border: "1px solid rgba(59, 130, 246, 0.5)",
            backdropFilter: "blur(8px)",
            fontSize: "1rem",
            padding: "16px",
            maxWidth: "400px",
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.3)",
          },
          success: {
            icon: "🚀",
            style: {
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid rgba(16, 185, 129, 0.5)",
            },
          },
          error: {
            icon: "❌",
            style: {
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.5)",
            },
          },
        }}
      />

      <div className="container max-w-md mx-auto px-4">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/25 via-purple-600/25 to-pink-600/25 rounded-2xl blur-xl opacity-60 transition-opacity duration-500 group-hover:opacity-100"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-lg opacity-75"></div>

          <Card className="relative border-gray-800/40 bg-black/40 backdrop-blur-xl shadow-2xl transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-blue-500/10">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 pb-1">
                    Autofetch
                  </CardTitle>
                  <CardDescription className="text-gray-100 text-base">
                    Automate content fetching from YouTube channels
                  </CardDescription>
                </div>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-gray-800/40 shadow-inner">
                  <svg
                    className="w-7 h-7 text-blue-400/90"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>

              {error && (
                <Alert
                  variant="destructive"
                  className="mb-6 border border-red-500/20 bg-red-500/5"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="channel"
                    className="text-gray-100 font-medium"
                  >
                    Channel Handler
                  </Label>
                  <Input
                    id="channel"
                    value={channelHandler}
                    onChange={(e) => setChannelHandler(e.target.value)}
                    placeholder="@channel_name"
                    className="bg-gray-900/60 border-gray-700/50 text-white placeholder:text-gray-500 h-11 px-4 transition-colors focus:border-blue-500/50 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11",
                          "bg-gray-900/60 border-gray-700/50 text-gray-100",
                          "hover:bg-gray-800/80 hover:border-gray-600/50",
                          "focus:ring-offset-0 focus:ring-1 focus:ring-gray-600/50 focus:border-gray-600/50",
                          !publishedAfter && "text-gray-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                        {publishedAfter ? (
                          format(publishedAfter, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={publishedAfter}
                        onSelect={setPublishedAfter}
                        disabled={{ after: new Date() }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-11",
                          "bg-gray-900/60 border-gray-700/50 text-gray-100",
                          "hover:bg-gray-800/80 hover:border-gray-600/50",
                          "focus:ring-offset-0 focus:ring-1 focus:ring-gray-600/50 focus:border-gray-600/50",
                          !publishedBefore && "text-gray-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                        {publishedBefore ? (
                          format(publishedBefore, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={publishedBefore}
                        onSelect={setPublishedBefore}
                        disabled={{
                          after: new Date(),
                          before: publishedAfter,
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting Automation...
                    </>
                  ) : (
                    "Start Automation"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
