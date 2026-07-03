"use client";

import { useCallback, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { Dish, MenuAnalysis } from "@/lib/menu";

type Phase = "upload" | "analyzing" | "menu" | "recipe";

const DIFFICULTY_LABEL: Record<Dish["homeCookDifficulty"], string> = {
  easy: "easy at home",
  medium: "weekend project",
  hard: "chef-level",
};

async function fileToResizedJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 2000;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [analysis, setAnalysis] = useState<MenuAnalysis | null>(null);
  const [dish, setDish] = useState<Dish | null>(null);
  const [recipe, setRecipe] = useState("");
  const [recipeDone, setRecipeDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recipeAbort = useRef<AbortController | null>(null);

  const analyzeFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image. Upload a photo of a menu.");
      return;
    }
    setError(null);
    setPhase("analyzing");
    try {
      const image = await fileToResizedJpeg(file);
      const res = await fetch("/api/analyze-menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mediaType: "image/jpeg" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Menu analysis failed. Try again.");
      }
      const result = (await res.json()) as MenuAnalysis;
      if (!result.isMenu || result.dishes.length === 0) {
        setError("No dishes found in that photo. Try a clearer shot of the menu itself.");
        setPhase("upload");
        return;
      }
      setAnalysis(result);
      setPhase("menu");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setPhase("upload");
    }
  }, []);

  const cookDish = useCallback(
    async (selected: Dish) => {
      setDish(selected);
      setRecipe("");
      setRecipeDone(false);
      setError(null);
      setPhase("recipe");
      window.scrollTo({ top: 0 });

      recipeAbort.current?.abort();
      const controller = new AbortController();
      recipeAbort.current = controller;
      try {
        const res = await fetch("/api/recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dish: selected,
            restaurantName: analysis?.restaurantName ?? null,
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error("Couldn't write the recipe. Try again.");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          setRecipe((prev) => prev + decoder.decode(value, { stream: true }));
        }
        setRecipeDone(true);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Couldn't write the recipe. Try again.");
      }
    },
    [analysis],
  );

  const backToMenu = useCallback(() => {
    recipeAbort.current?.abort();
    setPhase("menu");
    setDish(null);
    window.scrollTo({ top: 0 });
  }, []);

  const startOver = useCallback(() => {
    recipeAbort.current?.abort();
    setPhase("upload");
    setAnalysis(null);
    setDish(null);
    setRecipe("");
    setError(null);
  }, []);

  const categories = analysis
    ? [...new Set(analysis.dishes.map((d) => d.category))]
    : [];

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-16 pt-6 flex-1">
      {/* Wordmark header */}
      <header className="flex items-baseline justify-between">
        <button
          onClick={startOver}
          className="font-display text-xl font-extrabold tracking-tight"
        >
          Meally<span className="text-chili">*</span>Delicious
        </button>
        {phase !== "upload" && (
          <button
            onClick={startOver}
            className="font-mono text-xs text-olive underline decoration-dotted underline-offset-4"
          >
            new menu
          </button>
        )}
      </header>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border-2 border-chili/40 bg-card px-4 py-3 text-sm text-chili"
        >
          {error}
        </p>
      )}

      {/* ————— Upload ————— */}
      {phase === "upload" && (
        <section className="mt-10">
          <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight">
            Your menu,
            <br />
            decoded<span className="text-chili">.</span>
          </h1>
          <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-olive">
            Snap the menu. We&apos;ll explain every dish — then hand you the
            recipe to make the one you love at home.
          </p>

          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a photo of a menu"
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInput.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) void analyzeFile(file);
            }}
            className={`mt-8 cursor-pointer rounded-2xl border-[3px] border-dashed bg-card px-6 py-12 text-center shadow-[0_2px_0_var(--line)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chili ${
              dragging ? "border-chili" : "border-line hover:border-olive"
            }`}
          >
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-olive">
              menu goes here
            </span>
            <span className="mt-3 block font-display text-2xl font-bold">
              Snap or upload the menu
            </span>
            <span className="mt-2 block text-sm text-olive">
              photo, screenshot, or camera
            </span>
            <span className="mx-auto mt-6 inline-block rounded-full bg-chili px-6 py-3 font-display text-base font-bold text-card">
              Choose a photo
            </span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void analyzeFile(file);
              e.target.value = "";
            }}
          />

          <ol className="mt-10 space-y-2 font-mono text-xs text-olive">
            {["scan the menu", "meet every dish", "pick one to cook at home"].map(
              (step, i) => (
                <li key={step} className="flex items-baseline">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span className="leader" />
                  <span>{step}</span>
                </li>
              ),
            )}
          </ol>
        </section>
      )}

      {/* ————— Analyzing ————— */}
      {phase === "analyzing" && (
        <section className="mt-24 text-center" aria-live="polite">
          <p className="font-display text-2xl font-bold">Reading your menu</p>
          <div className="leader-loading mx-auto mt-6 w-48" />
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-olive">
            identifying dishes · tastes · allergens
          </p>
        </section>
      )}

      {/* ————— Menu (dish summaries) ————— */}
      {phase === "menu" && analysis && (
        <section className="mt-8">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-olive">
            {analysis.restaurantName ?? "the menu"} · {analysis.dishes.length}{" "}
            {analysis.dishes.length === 1 ? "dish" : "dishes"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
            Pick one to try at home
          </h1>

          {categories.map((category) => (
            <div key={category} className="mt-8">
              <h2 className="flex items-baseline font-display text-lg font-bold">
                {category}
                <span className="leader" />
              </h2>
              <ul className="mt-3 space-y-4">
                {analysis.dishes
                  .filter((d) => d.category === category)
                  .map((d) => (
                    <li
                      key={d.name}
                      className="rounded-xl border border-line bg-card p-5 shadow-[0_2px_0_var(--line)]"
                    >
                      <div className="flex items-baseline">
                        <h3 className="font-display text-xl font-bold leading-tight">
                          {d.name}
                        </h3>
                        <span className="leader" />
                        <span className="font-mono text-sm text-olive">
                          {d.price ?? "—"}
                        </span>
                      </div>
                      <p className="mt-2 text-[0.95rem] leading-relaxed">{d.summary}</p>
                      <p className="mt-2 text-sm leading-relaxed text-olive">
                        <span className="font-semibold text-basil">Tastes like:</span>{" "}
                        {d.taste}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide">
                        <span className="rounded-full bg-butter/50 px-2.5 py-1">
                          {d.cuisine}
                        </span>
                        <span className="rounded-full bg-pistachio px-2.5 py-1">
                          {DIFFICULTY_LABEL[d.homeCookDifficulty]}
                        </span>
                        {d.allergens.map((a) => (
                          <span
                            key={a}
                            className="rounded-full border border-chili/40 px-2.5 py-1 text-chili"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-olive">
                        {d.keyIngredients.join(" · ")}
                      </p>
                      <button
                        onClick={() => void cookDish(d)}
                        className="mt-4 w-full rounded-full bg-basil py-3 font-display text-base font-bold text-card transition-colors hover:bg-chili focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chili"
                      >
                        Make this at home
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* ————— Recipe ————— */}
      {phase === "recipe" && dish && (
        <section className="mt-8">
          <button
            onClick={backToMenu}
            className="font-mono text-xs text-olive underline decoration-dotted underline-offset-4"
          >
            ← back to the menu
          </button>
          <p className="mt-5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-olive">
            home version · {dish.cuisine} ·{" "}
            {DIFFICULTY_LABEL[dish.homeCookDifficulty]}
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight tracking-tight">
            {dish.name}
          </h1>

          <div className="mt-6 rounded-xl border border-line bg-card p-5 shadow-[0_2px_0_var(--line)]">
            {recipe === "" && !error ? (
              <div aria-live="polite" className="py-8 text-center">
                <p className="font-display text-lg font-bold">
                  Writing your recipe
                </p>
                <div className="leader-loading mx-auto mt-4 w-40" />
              </div>
            ) : (
              <div className="recipe-stream text-[0.95rem]">
                <Markdown>{recipe}</Markdown>
                {!recipeDone && !error && (
                  <div className="leader-loading mt-2 w-24" aria-hidden />
                )}
              </div>
            )}
          </div>

          {recipeDone && (
            <button
              onClick={backToMenu}
              className="mt-6 w-full rounded-full border-2 border-basil py-3 font-display text-base font-bold transition-colors hover:bg-basil hover:text-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chili"
            >
              Cook something else
            </button>
          )}
        </section>
      )}

      <footer className="mt-16 border-t-[3px] border-dotted border-line pt-4 text-center font-mono text-[0.65rem] text-olive">
        scan → identify → understand → cook
      </footer>
    </main>
  );
}
