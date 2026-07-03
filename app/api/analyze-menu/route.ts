import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { MenuAnalysisSchema } from "@/lib/menu";

export const maxDuration = 300;

const client = new Anthropic();

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

export async function POST(request: Request) {
  const { image, mediaType } = (await request.json()) as {
    image?: string;
    mediaType?: string;
  };

  if (!image || !MEDIA_TYPES.includes(mediaType as MediaType)) {
    return NextResponse.json(
      { error: "Send { image: <base64>, mediaType: <image/jpeg|png|webp|gif> }" },
      { status: 400 },
    );
  }

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system:
        "You are a food expert who reads restaurant menus. Extract every dish you can read " +
        "from the menu photo and explain each one for a curious diner who wants to understand " +
        "it and maybe cook it at home. Be accurate about allergens (flag likely ones based on " +
        "typical preparations) and honest about home-cooking difficulty. If the image is not a " +
        "menu or dish list, set isMenu to false and return an empty dishes array.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as MediaType,
                data: image,
              },
            },
            { type: "text", text: "Read this menu and break down every dish." },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(MenuAnalysisSchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json(
        { error: "Could not analyze this image. Try a clearer photo of the menu." },
        { status: 422 },
      );
    }

    return NextResponse.json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Too many requests right now. Wait a moment and try again." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error("analyze-menu API error", error.status, error.message);
      return NextResponse.json(
        { error: "Menu analysis failed. Try again with a clearer photo." },
        { status: 502 },
      );
    }
    throw error;
  }
}
