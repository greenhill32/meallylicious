import { NextResponse } from "next/server";
import { getCachedImageUrl, saveImage } from "@/lib/cache";
import type { Dish } from "@/lib/menu";

export const maxDuration = 300;

export async function POST(request: Request) {
  const { dish } = (await request.json()) as { dish?: Dish };

  if (!dish?.name) {
    return NextResponse.json({ error: "Send { dish }" }, { status: 400 });
  }

  const cachedUrl = await getCachedImageUrl(dish.name);
  if (cachedUrl) {
    return NextResponse.json({ url: cachedUrl }, { headers: { "X-Meally-Cache": "hit" } });
  }

  const prompt =
    `Professional restaurant food photography of ${dish.name}, a ${dish.cuisine} dish. ` +
    `${dish.summary} Key ingredients visible: ${dish.keyIngredients.join(", ")}. ` +
    `Plated on ceramic, soft natural window light, shallow depth of field, ` +
    `overhead three-quarter angle, appetizing, photorealistic, high detail. No text or hands.`;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      quality: "medium",
      n: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("dish-image generation failed", res.status, body.slice(0, 300));
    return NextResponse.json(
      { error: "Couldn't create a photo for this dish." },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const image = data.data?.[0]?.b64_json;
  if (!image) {
    return NextResponse.json(
      { error: "Couldn't create a photo for this dish." },
      { status: 502 },
    );
  }

  const savedUrl = await saveImage(dish.name, Buffer.from(image, "base64"));
  if (savedUrl) {
    return NextResponse.json({ url: savedUrl });
  }
  return NextResponse.json({ image });
}
