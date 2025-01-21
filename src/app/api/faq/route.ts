import { NextResponse } from "next/server";
import axios from "axios";

const RELEVANCE_API_KEY = process.env.RELEVANCE_API_KEY;
const RELEVANCE_PROJECT_ID = process.env.RELEVANCE_PROJECT_ID;
const RELEVANCE_ENDPOINT = process.env.RELEVANCE_ENDPOINT;

export async function POST(request: Request) {
  try {
    const { question } = await request.json();

    const response = await axios.post(
      RELEVANCE_ENDPOINT || "",
      {
        params: { question },
        project: RELEVANCE_PROJECT_ID,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: RELEVANCE_API_KEY || "",
        },
      }
    );

    // Extract the answer from the response
    const answer = response.data?.output?.answer || "No answer available.";

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("FAQ API Error:", error);
    return NextResponse.json(
      { error: "Failed to process question" },
      { status: 500 }
    );
  }
}
