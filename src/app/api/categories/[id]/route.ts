import { NextResponse } from "next/server";

// Disable all Next.js optimizations that are causing our error
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Explicitly tell Next.js this is a static route within
// the dynamic segment (eliminates the params error)
export const preferredRegion = "auto";
export const runtime = "edge";

// Define a clear mapping for special categories that need translation
const SPECIAL_CATEGORY_MAPPINGS: Record<string, string[]> = {
  "layer-1": ["layer 1", "l1", "layer1", "layer one"],
  "meme-token": ["meme", "memes", "meme coin", "memecoin"],
  "gaming-entertainment-social": [
    "gaming",
    "entertainment",
    "games",
    "play to earn",
    "p2e",
    "game",
    "metaverse",
  ],
  "artificial-intelligence-ai": [
    "ai",
    "artificial intelligence",
    "artificial-intelligence",
  ],
  "decentralized-finance-defi": ["defi", "decentralized finance"],
};

// Shared cache structure from the main categories endpoint
interface CategoryData {
  id: string;
  name: string;
  market_cap: number;
  volume_24h: number;
  top_3_coins: string[];
}

// The actual route handler
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Safely destructure params first since we know it exists
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing category ID" },
        { status: 400 }
      );
    }

    const categoryId = decodeURIComponent(id);
    console.log("Looking for category:", categoryId);

    // Get all categories from our main endpoint (which has proper caching)
    // This approach avoids the params error with Next.js
    const apiUrl = new URL(request.url);
    const baseUrl = `${apiUrl.protocol}//${apiUrl.host}`;
    const response = await fetch(`${baseUrl}/api/categories`, {
      cache: "no-store",
    });

    const categoriesData = await response.json();
    const categories = categoriesData.data || [];

    // Look for the category with our improved matching
    if (categories && categories.length > 0) {
      console.log(`Got ${categories.length} categories from main endpoint`);

      // Try to find a matching category
      const foundCategory = findCategoryMatch(categories, categoryId);

      if (foundCategory) {
        console.log("Found category:", foundCategory.name);
        return NextResponse.json({
          data: foundCategory,
          timestamp: Date.now(),
        });
      }

      // Try alternate search for special categories
      for (const [specialKey, alternates] of Object.entries(
        SPECIAL_CATEGORY_MAPPINGS
      )) {
        if (
          specialKey === categoryId ||
          alternates.includes(categoryId.toLowerCase())
        ) {
          // Try to find any category that might match this special case
          for (const cat of categories) {
            // Check if categories match any of our keywords
            if (
              alternates.some(
                (alt) =>
                  cat.name.toLowerCase().includes(alt) ||
                  cat.id.toLowerCase().includes(alt)
              )
            ) {
              console.log(
                `Found special category match: ${cat.name} for ${categoryId}`
              );
              return NextResponse.json({
                data: cat,
                timestamp: Date.now(),
              });
            }
          }
        }
      }

      // No match found
      console.log("Category not found:", categoryId);

      // For debugging: Log category names starting with G (for gaming)
      if (
        categoryId.toLowerCase().includes("gaming") ||
        categoryId.toLowerCase().includes("game")
      ) {
        const gameCategories = categories
          .filter(
            (cat: CategoryData) =>
              cat.name.toLowerCase().includes("game") ||
              cat.name.toLowerCase().includes("gaming")
          )
          .map((cat: CategoryData) => `${cat.id} (${cat.name})`);
        console.log("Available gaming categories:", gameCategories);
      }

      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // No categories returned
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in category API:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch category data",
        message: "API error, please try again later",
      },
      { status: 500 }
    );
  }
}

// Helper function to find a category by name or ID with flexible matching
function findCategoryMatch(
  categories: CategoryData[],
  searchTerm: string
): CategoryData | undefined {
  // Normalize the search term
  const normalizedSearch = searchTerm.toLowerCase().trim();

  // Check if this is a special category first
  for (const [specialKey, alternates] of Object.entries(
    SPECIAL_CATEGORY_MAPPINGS
  )) {
    if (
      specialKey === normalizedSearch ||
      alternates.includes(normalizedSearch)
    ) {
      // Look for exact matches to this special category
      for (const cat of categories) {
        const catName = cat.name.toLowerCase();
        const catId = cat.id.toLowerCase();

        if (alternates.some((alt) => catName === alt || catId === alt)) {
          return cat;
        }
      }
    }
  }

  // Try direct ID match
  let match = categories.find(
    (cat) => cat.id.toLowerCase() === normalizedSearch
  );
  if (match) return match;

  // Try direct name match
  match = categories.find((cat) => cat.name.toLowerCase() === normalizedSearch);
  if (match) return match;

  // Try replacing hyphens and underscores with spaces
  const flexibleSearch = normalizedSearch.replace(/[-_]/g, " ");
  match = categories.find(
    (cat) =>
      cat.name.toLowerCase() === flexibleSearch ||
      cat.id.toLowerCase().replace(/[-_]/g, " ") === flexibleSearch
  );
  if (match) return match;

  // Try partial matching (more aggressive)
  match = categories.find(
    (cat) =>
      cat.name.toLowerCase().includes(normalizedSearch) ||
      cat.id.toLowerCase().includes(normalizedSearch) ||
      normalizedSearch.includes(cat.name.toLowerCase()) ||
      normalizedSearch.includes(cat.id.toLowerCase())
  );

  // If we still don't have a match, try keyword matching for complex categories
  if (!match) {
    // Keywords for gaming
    if (
      normalizedSearch.includes("gaming") ||
      normalizedSearch.includes("game")
    ) {
      match = categories.find(
        (cat) =>
          cat.name.toLowerCase().includes("gaming") ||
          cat.name.toLowerCase().includes("game") ||
          cat.id.toLowerCase().includes("gaming") ||
          cat.id.toLowerCase().includes("game")
      );
    }

    // Keywords for defi
    if (
      normalizedSearch.includes("defi") ||
      normalizedSearch.includes("finance")
    ) {
      match = categories.find(
        (cat) =>
          cat.name.toLowerCase().includes("defi") ||
          cat.name.toLowerCase().includes("finance") ||
          cat.id.toLowerCase().includes("defi") ||
          cat.id.toLowerCase().includes("finance")
      );
    }
  }

  return match;
}
