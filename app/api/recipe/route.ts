import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getCachedRecipe, saveRecipe } from "@/lib/cache";
import type { Dish } from "@/lib/menu";

export const maxDuration = 300;

const client = new Anthropic();

export async function POST(request: Request) {
  const { dish, restaurantName } = (await request.json()) as {
    dish?: Dish;
    restaurantName?: string | null;
  };

  if (!dish?.name) {
    return NextResponse.json({ error: "Send { dish } from a menu analysis" }, { status: 400 });
  }

  const cached = await getCachedRecipe(dish.name);
  if (cached) {
    return new Response(cached, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Meally-Cache": "hit",
      },
    });
  }

  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 32000,
    system:
      "You write restaurant-copycat recipes for home cooks. Given a dish from a menu, produce " +
      "one complete recipe that recreates it faithfully in a home kitchen with supermarket " +
      "ingredients. Respond in markdown with exactly four sections, using exactly these four " +
      "heading lines and nothing appended to them:\n" +
      "## The dish\n## You'll need\n## Steps\n## Make it yours\n" +
      "Under 'The dish': 2-3 sentences on what you're recreating and what makes it work. " +
      "Under 'You'll need': equipment on one line, then a bulleted ingredient list with amounts " +
      "for 2 servings, marking sensible substitutions in parentheses. " +
      "Under 'Steps': numbered steps, each one action, with times, temperatures, and the " +
      "sensory cues that tell you it's right. " +
      "Under 'Make it yours': 2-3 short bulleted variations (lighter, faster, or dietary swaps). " +
      "Keep it tight and confident. No preamble before the first heading.",
    messages: [
      {
        role: "user",
        content:
          `Dish: ${dish.name}` +
          (restaurantName ? ` (from ${restaurantName})` : "") +
          `\nMenu description context: ${dish.summary}` +
          `\nTaste profile: ${dish.taste}` +
          `\nKey ingredients: ${dish.keyIngredients.join(", ")}` +
          `\nCuisine: ${dish.cuisine}`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const dishName = dish.name;
  let fullText = "";
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (delta) => {
        fullText += delta;
        controller.enqueue(encoder.encode(delta));
      });
      stream.on("end", () => {
        controller.close();
        if (fullText.trim()) void saveRecipe(dishName, fullText);
      });
      stream.on("error", (error) => controller.error(error));
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
