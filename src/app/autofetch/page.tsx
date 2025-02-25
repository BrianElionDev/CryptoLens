"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
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
import { Loader2, Calendar as CalendarIcon, Info } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

export default function AutofetchPage() {
  const router = useRouter();
  const [channelHandler, setChannelHandler] = useState("");
  const [publishedBefore, setPublishedBefore] = useState<string>("");
  const [publishedAfter, setPublishedAfter] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const formatDateInput = (input: string) => {
    // Remove any non-digit characters
    const numbers = input.replace(/\D/g, "");

    // Format as YYYY-MM-DD
    if (numbers.length <= 4) {
      return numbers;
    } else if (numbers.length <= 6) {
      return numbers.slice(0, 4) + "-" + numbers.slice(4);
    } else {
      return (
        numbers.slice(0, 4) +
        "-" +
        numbers.slice(4, 6) +
        "-" +
        numbers.slice(6, 8)
      );
    }
  };

  const validateDateInput = (date: string) => {
    if (date.length !== 10) return false;

    const [year, month, day] = date.split("-").map(Number);

    // Check year is reasonable (1900-current year)
    if (year < 1900 || year > new Date().getFullYear()) return false;

    // Check month is valid
    if (month < 1 || month > 12) return false;

    // Check day is valid for the month
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > lastDayOfMonth) return false;

    return true;
  };

  const handleDateChange = (value: string, setter: (value: string) => void) => {
    const formatted = formatDateInput(value);
    setter(formatted);

    if (formatted.length === 10) {
      if (!validateDateInput(formatted)) {
        setError("Invalid date format or date");
      } else {
        setError("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishedBefore || !publishedAfter) {
      setError("Please enter both dates");
      return;
    }

    const beforeDate = new Date(publishedBefore);
    const afterDate = new Date(publishedAfter);
    const today = new Date();

    if (beforeDate < afterDate) {
      setError("To Date must be after From Date");
      return;
    }

    if (beforeDate > today || afterDate > today) {
      setError("Dates cannot be in the future");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const promise = axios.post(
      "https://hook.us2.make.com/ngpyvadtax553g1rlsn2cs5soca8ilnv",
      {
        channel_handler: channelHandler.trim(),
        published_before: new Date(
          beforeDate.setUTCHours(0, 0, 0, 0)
        ).toISOString(),
        published_after: new Date(
          afterDate.setUTCHours(0, 0, 0, 0)
        ).toISOString(),
      }
    );

    toast.promise(promise, {
      loading: "Starting automation...",
      success: () => {
        setTimeout(() => {
          router.push("/knowledge");
        }, 6000);
        return "🚀 Automation started successfully! It is running in the background and will take a few minutes to complete.";
      },
      error: "❌ Failed to start automation",
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
                  <div className="relative">
                    <Input
                      placeholder="YYYY-MM-DD"
                      value={publishedAfter}
                      onChange={(e) =>
                        handleDateChange(e.target.value, setPublishedAfter)
                      }
                      maxLength={10}
                      className="bg-gray-900/60 border-gray-700/50 text-white h-11 px-4 pr-12 transition-colors focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-full aspect-square p-2 text-gray-400 hover:text-gray-300"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={
                              publishedAfter
                                ? new Date(publishedAfter)
                                : undefined
                            }
                            onSelect={(date) => {
                              setPublishedAfter(
                                date ? date.toISOString().split("T")[0] : ""
                              );
                              setError("");
                            }}
                            disabled={(date) => date > new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    Just type numbers (YYYYMMDD) or use calendar
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">To Date</Label>
                  <div className="relative">
                    <Input
                      placeholder="YYYY-MM-DD"
                      value={publishedBefore}
                      onChange={(e) =>
                        handleDateChange(e.target.value, setPublishedBefore)
                      }
                      maxLength={10}
                      className="bg-gray-900/60 border-gray-700/50 text-white h-11 px-4 pr-12 transition-colors focus:border-blue-500/50 focus:ring-blue-500/20"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-full aspect-square p-2 text-gray-400 hover:text-gray-300"
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={
                              publishedBefore
                                ? new Date(publishedBefore)
                                : undefined
                            }
                            onSelect={(date) => {
                              setPublishedBefore(
                                date ? date.toISOString().split("T")[0] : ""
                              );
                              setError("");
                            }}
                            disabled={(date) =>
                              date > new Date() ||
                              (publishedAfter
                                ? date < new Date(publishedAfter)
                                : false)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    Just type numbers (YYYYMMDD) or use calendar
                  </span>
                </div>

                {(publishedAfter || publishedBefore) &&
                  validateDateInput(publishedAfter) &&
                  validateDateInput(publishedBefore) && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm text-blue-200">
                            Selected Range:
                          </p>
                          <p className="text-xs text-blue-300">
                            From:{" "}
                            {publishedAfter
                              ? format(new Date(publishedAfter), "MMMM d, yyyy")
                              : ""}
                            {publishedAfter && publishedBefore ? " to " : ""}
                            {publishedBefore
                              ? format(
                                  new Date(publishedBefore),
                                  "MMMM d, yyyy"
                                )
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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
