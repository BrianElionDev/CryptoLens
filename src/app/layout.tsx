import type { Metadata } from "next";
import "./globals.css";
import "../styles/chat-overlay-fix.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import ChatButton from "@/components/ChatButton";
import { AppProviders } from "@/providers/AppProviders";
import Script from "next/script";

export const metadata: Metadata = {
  title: "CryptoLens",
  description: "Your comprehensive crypto analytics platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-poppins">
        <AppProviders>
          <Navbar />
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 6000,
              style: {
                background: "rgba(17, 24, 39, 0.8)",
                color: "#E5E7EB",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                backdropFilter: "blur(8px)",
                fontSize: "0.875rem",
                maxWidth: "400px",
                padding: "12px 16px",
                borderRadius: "0.75rem",
                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
              },
              success: {
                style: {
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                },
              },
              error: {
                style: {
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                },
              },
              loading: {
                style: {
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                },
              },
            }}
          />
          <ChatButton />
        </AppProviders>

        {/* Error monitoring script */}
        <Script id="error-handling" strategy="afterInteractive">
          {`
            window.addEventListener('error', function(event) {
              console.error('Global error caught:', event.error);
              
              // Prevent client crashes from taking down the whole app
              if (event.error && event.error.message) {
                // Log the error details - in production, you'd send this to a monitoring service
                console.error('Error details:', {
                  message: event.error.message,
                  stack: event.error.stack,
                  type: event.error.name
                });
              }
              
              event.preventDefault();
            });

            window.addEventListener('unhandledrejection', function(event) {
              console.error('Unhandled Promise Rejection:', event.reason);
              
              // Log the rejection details
              if (event.reason) {
                console.error('Rejection details:', {
                  message: event.reason.message || 'Unknown Promise rejection',
                  stack: event.reason.stack || 'No stack trace available',
                });
              }
              
              event.preventDefault();
            });
          `}
        </Script>
      </body>
    </html>
  );
}
