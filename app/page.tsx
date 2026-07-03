"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { Dish, MenuAnalysis } from "@/lib/menu";

type Phase = "upload" | "analyzing" | "menu" | "recipe";

type RecipeEntry = {
  status: "loading" | "done" | "error";
  text: string;
};

type ImageEntry = {
  status: "loading" | "done" | "error";
  dataUrl: string;
};

type UsageBucket = { costUsd: number; calls: number };
type UsageSummary = {
  today: UsageBucket;
  week: UsageBucket;
  month: UsageBucket;
  allTime: UsageBucket;
  byRoute: Record<string, UsageBucket>;
};

const ROUTE_LABEL: Record<string, string> = {
  "analyze-menu": "menu scans",
  recipe: "recipes",
  "dish-image": "dish photos",
};

const DIFFICULTY_LABEL: Record<Dish["homeCookDifficulty"], string> = {
  easy: "easy at home",
  medium: "weekend project",
  hard: "chef-level",
};

/** Menus with more than this many dishes collapse to one-line rows until tapped. */
const BUSY_MENU_THRESHOLD = 12;

function DishCard({
  dish,
  busy,
  expanded,
  onToggle,
  image,
  recipeReady,
  onCook,
  onViewImage,
}: {
  dish: Dish;
  busy: boolean;
  expanded: boolean;
  onToggle: () => void;
  image: ImageEntry | undefined;
  recipeReady: boolean;
  onCook: () => void;
  onViewImage: (src: string) => void;
}) {
  const showDetails = !busy || expanded;
  const thumbSize = busy && !expanded ? "h-14 w-14" : "h-20 w-20";

  return (
    <li className="overflow-hidden rounded-xl border border-line bg-card shadow-[0_2px_0_var(--line)]">
      <div className="flex items-start gap-4 p-5">
        <div
          role={busy ? "button" : undefined}
          tabIndex={busy ? 0 : undefined}
          onClick={busy ? onToggle : undefined}
          onKeyDown={
            busy
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggle();
                  }
                }
              : undefined
          }
          aria-expanded={busy ? expanded : undefined}
          className={`min-w-0 flex-1 ${busy ? "cursor-pointer" : ""}`}
        >
          <div className="flex items-baseline">
            <h3 className="font-display text-xl font-bold leading-tight">{dish.name}</h3>
            <span className="leader" />
            <span className="font-mono text-sm text-olive">{dish.price ?? "—"}</span>
            {busy && (
              <span
                aria-hidden
                className={`ml-2 shrink-0 font-display text-base text-olive transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              >
                ⌄
              </span>
            )}
          </div>
          <p
            className={`mt-2 text-[0.95rem] leading-relaxed ${
              busy && !expanded ? "line-clamp-1 text-olive" : ""
            }`}
          >
            {dish.summary}
          </p>
        </div>

        {image?.status === "done" ? (
          <button
            onClick={() => onViewImage(image.dataUrl)}
            aria-label={`View photo of ${dish.name}`}
            className="mt-1 shrink-0 overflow-hidden rounded-lg border border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chili"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.dataUrl}
              alt={dish.name}
              className={`object-cover transition-transform hover:scale-105 ${thumbSize}`}
            />
          </button>
        ) : image?.status === "loading" ? (
          <div
            aria-hidden
            className={`mt-1 flex shrink-0 items-center justify-center rounded-lg border border-dashed border-line bg-pistachio ${thumbSize}`}
          >
            <div className="leader-loading w-10" />
          </div>
        ) : null}
      </div>

      {showDetails && (
        <div className="px-5 pb-5">
          <p className="text-sm leading-relaxed text-olive">
            <span className="font-semibold text-basil">Tastes like:</span> {dish.taste}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[0.65rem] uppercase tracking-wide">
            <span className="rounded-full bg-butter/50 px-2.5 py-1">{dish.cuisine}</span>
            <span className="rounded-full bg-pistachio px-2.5 py-1">
              {DIFFICULTY_LABEL[dish.homeCookDifficulty]}
            </span>
            {dish.allergens.map((a) => (
              <span
                key={a}
                className="rounded-full border border-chili/40 px-2.5 py-1 text-chili"
              >
                {a}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-olive">{dish.keyIngredients.join(" · ")}</p>
          <button
            onClick={onCook}
            className="mt-4 w-full rounded-full bg-basil py-3 font-display text-base font-bold text-card transition-colors hover:bg-chili focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chili"
          >
            {recipeReady ? "Make this at home · recipe ready" : "Make this at home"}
          </button>
        </div>
      )}
    </li>
  );
}

const COOKING_CAPTIONS = [
  "reading the dish",
  "raiding the pantry",
  "testing the sauce",
  "writing the steps",
  "tasting for seasoning",
];

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

/** Simulated progress: eases toward 96% and sits there until the real work lands. */
function FakeProgress() {
  const [progress, setProgress] = useState(3);
  const [caption, setCaption] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const seconds = (Date.now() - start) / 1000;
      setProgress(Math.min(96, Math.round(100 * (1 - Math.exp(-seconds / 14)))));
    }, 200);
    const words = setInterval(
      () => setCaption((c) => (c + 1) % COOKING_CAPTIONS.length),
      2600,
    );
    return () => {
      clearInterval(tick);
      clearInterval(words);
    };
  }, []);

  return (
    <div aria-live="polite" className="py-10 text-center">
      <p className="font-display text-lg font-bold">Writing your recipe</p>
      <div className="mx-auto mt-5 h-3 w-56 overflow-hidden rounded-full border border-line bg-pistachio">
        <div
          className="h-full rounded-full bg-chili transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 font-mono text-xs text-olive">
        {progress}% · {COOKING_CAPTIONS[caption]}
      </p>
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [analysis, setAnalysis] = useState<MenuAnalysis | null>(null);
  const [dish, setDish] = useState<Dish | null>(null);
  const [recipes, setRecipes] = useState<Record<string, RecipeEntry>>({});
  const [images, setImages] = useState<Record<string, ImageEntry>>({});
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const [expandedDishes, setExpandedDishes] = useState<Set<string>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const prefetchAbort = useRef<AbortController | null>(null);

  const fetchRecipe = useCallback(
    async (target: Dish, restaurantName: string | null, signal: AbortSignal) => {
      setRecipes((prev) => ({
        ...prev,
        [target.name]: { status: "loading", text: "" },
      }));
      try {
        const res = await fetch("/api/recipe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dish: target, restaurantName }),
          signal,
        });
        if (!res.ok || !res.body) throw new Error("recipe request failed");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
        }
        setRecipes((prev) => ({
          ...prev,
          [target.name]: { status: "done", text },
        }));
      } catch {
        if (!signal.aborted) {
          setRecipes((prev) => ({
            ...prev,
            [target.name]: { status: "error", text: "" },
          }));
        }
      }
    },
    [],
  );

  const fetchImage = useCallback(async (target: Dish, signal: AbortSignal) => {
    setImages((prev) => ({
      ...prev,
      [target.name]: { status: "loading", dataUrl: "" },
    }));
    try {
      const res = await fetch("/api/dish-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dish: target }),
        signal,
      });
      if (!res.ok) throw new Error("image request failed");
      const data = (await res.json()) as { url?: string; image?: string };
      const src = data.url ?? (data.image ? `data:image/png;base64,${data.image}` : null);
      if (!src) throw new Error("no image in response");
      setImages((prev) => ({
        ...prev,
        [target.name]: { status: "done", dataUrl: src },
      }));
    } catch {
      if (!signal.aborted) {
        setImages((prev) => ({
          ...prev,
          [target.name]: { status: "error", dataUrl: "" },
        }));
      }
    }
  }, []);

  /**
   * Kick off recipe generation for every dish, a few at a time. Dish photos
   * (slower, costlier — OpenAI) are also prefetched for normal menus, but on
   * a busy menu (> BUSY_MENU_THRESHOLD dishes) they're skipped here and only
   * fetched on demand once a dish is expanded and "Make this at home" is
   * actually tapped — see cookDish.
   */
  const prefetchAll = useCallback(
    (result: MenuAnalysis) => {
      prefetchAbort.current?.abort();
      const controller = new AbortController();
      prefetchAbort.current = controller;
      const busy = result.dishes.length > BUSY_MENU_THRESHOLD;

      const recipeQueue = [...result.dishes];
      const recipeWorkers = Array.from({ length: 3 }, async () => {
        while (recipeQueue.length > 0 && !controller.signal.aborted) {
          const next = recipeQueue.shift()!;
          await fetchRecipe(next, result.restaurantName, controller.signal);
        }
      });

      const workers: Promise<void>[] = [...recipeWorkers];
      if (!busy) {
        const imageQueue = [...result.dishes];
        const imageWorkers = Array.from({ length: 2 }, async () => {
          while (imageQueue.length > 0 && !controller.signal.aborted) {
            const next = imageQueue.shift()!;
            await fetchImage(next, controller.signal);
          }
        });
        workers.push(...imageWorkers);
      }

      void Promise.all(workers);
    },
    [fetchRecipe, fetchImage],
  );

  const analyzeFile = useCallback(
    async (file: File) => {
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
          setError(
            "No dishes found in that photo. Try a clearer shot of the menu itself.",
          );
          setPhase("upload");
          return;
        }
        setAnalysis(result);
        setRecipes({});
        setImages({});
        setExpandedDishes(new Set());
        setPhase("menu");
        prefetchAll(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
        setPhase("upload");
      }
    },
    [prefetchAll],
  );

  const cookDish = useCallback(
    (selected: Dish) => {
      setDish(selected);
      setError(null);
      setPhase("recipe");
      window.scrollTo({ top: 0 });

      const controller = prefetchAbort.current ?? new AbortController();
      prefetchAbort.current = controller;

      // Retry on demand if the background fetch for this dish failed or never ran.
      const recipeEntry = recipes[selected.name];
      if (!recipeEntry || recipeEntry.status === "error") {
        void fetchRecipe(selected, analysis?.restaurantName ?? null, controller.signal);
      }

      // The photo normally starts loading when the dish is expanded
      // (toggleExpanded); this just retries if that attempt errored.
      const imageEntry = images[selected.name];
      if (imageEntry?.status === "error") {
        void fetchImage(selected, controller.signal);
      }
    },
    [recipes, images, analysis, fetchRecipe, fetchImage],
  );

  const backToMenu = useCallback(() => {
    setPhase("menu");
    setDish(null);
    window.scrollTo({ top: 0 });
  }, []);

  const startOver = useCallback(() => {
    prefetchAbort.current?.abort();
    setPhase("upload");
    setAnalysis(null);
    setDish(null);
    setRecipes({});
    setImages({});
    setLightbox(null);
    setExpandedDishes(new Set());
    setError(null);
  }, []);

  const toggleExpanded = useCallback(
    (target: Dish) => {
      // State updater must stay pure (React/Strict Mode may invoke it twice) —
      // decide expand-vs-collapse from the outer closure, fire the fetch
      // side effect separately, exactly once.
      const isExpanding = !expandedDishes.has(target.name);
      setExpandedDishes((prev) => {
        const next = new Set(prev);
        if (next.has(target.name)) next.delete(target.name);
        else next.add(target.name);
        return next;
      });

      if (isExpanding) {
        // Expanding is the signal to fetch the photo on a busy menu, where
        // it wasn't prefetched — see prefetchAll.
        const entry = images[target.name];
        if (!entry || entry.status === "error") {
          const controller = prefetchAbort.current ?? new AbortController();
          prefetchAbort.current = controller;
          void fetchImage(target, controller.signal);
        }
      }
    },
    [expandedDishes, images, fetchImage],
  );

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
    setUsageLoading(true);
    fetch("/api/usage-summary")
      .then((res) => res.json())
      .then((data: UsageSummary) => setUsage(data))
      .catch(() => setUsage(null))
      .finally(() => setUsageLoading(false));
  }, []);

  const categories = analysis
    ? [...new Set(analysis.dishes.map((d) => d.category))]
    : [];
  const isBusyMenu = (analysis?.dishes.length ?? 0) > BUSY_MENU_THRESHOLD;

  const currentRecipe = dish ? recipes[dish.name] : undefined;

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-16 pt-6 flex-1">
      {/* Wordmark header */}
      <header className="flex items-baseline justify-between gap-3">
        <button
          onClick={startOver}
          className="font-display text-xl font-extrabold tracking-tight"
        >
          Meally<span className="text-chili">*</span>Delicious
        </button>
        <div className="flex items-baseline gap-3">
          {phase !== "upload" && (
            <button
              onClick={startOver}
              className="font-mono text-xs text-olive underline decoration-dotted underline-offset-4"
            >
              new menu
            </button>
          )}
          <button
            onClick={openSettings}
            aria-label="Usage and cost settings"
            className="text-olive transition-colors hover:text-basil focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chili"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
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
          {isBusyMenu && (
            <p className="mt-2 font-mono text-xs text-olive">
              big menu — tap a dish to see the full breakdown
            </p>
          )}

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
                    <DishCard
                      key={d.name}
                      dish={d}
                      busy={isBusyMenu}
                      expanded={expandedDishes.has(d.name)}
                      onToggle={() => toggleExpanded(d)}
                      image={images[d.name]}
                      recipeReady={recipes[d.name]?.status === "done"}
                      onCook={() => cookDish(d)}
                      onViewImage={(src) => setLightbox({ src, alt: d.name })}
                    />
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

          {images[dish.name]?.status === "done" && (
            <button
              onClick={() =>
                setLightbox({ src: images[dish.name].dataUrl, alt: dish.name })
              }
              aria-label={`View photo of ${dish.name}`}
              className="mt-5 block w-full overflow-hidden rounded-xl border border-line shadow-[0_2px_0_var(--line)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chili"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[dish.name].dataUrl}
                alt={dish.name}
                className="aspect-[2/1] w-full object-cover"
              />
            </button>
          )}

          <div className="mt-6 rounded-xl border border-line bg-card p-5 shadow-[0_2px_0_var(--line)]">
            {currentRecipe?.status === "done" ? (
              <div className="recipe-stream text-[0.95rem]">
                <Markdown>{currentRecipe.text}</Markdown>
              </div>
            ) : currentRecipe?.status === "error" ? (
              <div className="py-8 text-center">
                <p className="text-sm text-chili">
                  Couldn&apos;t write this recipe. Check your connection and try again.
                </p>
                <button
                  onClick={() => cookDish(dish)}
                  className="mt-4 rounded-full border-2 border-basil px-6 py-2 font-display text-sm font-bold"
                >
                  Try again
                </button>
              </div>
            ) : (
              <FakeProgress />
            )}
          </div>

          {currentRecipe?.status === "done" && (
            <button
              onClick={backToMenu}
              className="mt-6 w-full rounded-full border-2 border-basil py-3 font-display text-base font-bold transition-colors hover:bg-basil hover:text-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chili"
            >
              Cook something else
            </button>
          )}
        </section>
      )}

      {/* ————— Photo lightbox ————— */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo of ${lightbox.alt}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-basil/85 p-5"
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightbox(null);
          }}
        >
          <figure className="w-full max-w-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.src}
              alt={lightbox.alt}
              className="w-full rounded-2xl shadow-2xl"
            />
            <figcaption className="mt-3 flex items-baseline font-display text-lg font-bold text-card">
              {lightbox.alt}
              <span className="leader !border-card/60" />
              <button
                autoFocus
                onClick={() => setLightbox(null)}
                className="font-mono text-xs font-normal text-card/80 underline decoration-dotted underline-offset-4"
              >
                close
              </button>
            </figcaption>
          </figure>
        </div>
      )}

      {/* ————— Settings / usage & cost ————— */}
      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Usage and cost"
          className="fixed inset-0 z-50 flex items-end justify-center bg-basil/60 p-0 sm:items-center sm:p-5"
          onClick={() => setSettingsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setSettingsOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-2xl border border-line bg-card p-6 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-bold">Usage &amp; cost</h2>
              <button
                autoFocus
                onClick={() => setSettingsOpen(false)}
                className="font-mono text-xs text-olive underline decoration-dotted underline-offset-4"
              >
                close
              </button>
            </div>

            {usageLoading ? (
              <div className="py-10 text-center">
                <div className="leader-loading mx-auto w-32" />
              </div>
            ) : usage ? (
              <div className="mt-4">
                <div className="space-y-2">
                  <UsageRow label="Today" data={usage.today} />
                  <UsageRow label="This week" data={usage.week} />
                  <UsageRow label="This month" data={usage.month} />
                  <UsageRow label="All time" data={usage.allTime} />
                </div>
                {Object.keys(usage.byRoute).length > 0 && (
                  <div className="mt-5 border-t-2 border-dotted border-line pt-4">
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-olive">
                      by feature
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {Object.entries(usage.byRoute).map(([route, d]) => (
                        <div
                          key={route}
                          className="flex items-baseline justify-between text-sm"
                        >
                          <span>{ROUTE_LABEL[route] ?? route}</span>
                          <span className="font-mono text-olive">
                            ${d.costUsd.toFixed(3)} · {d.calls}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-5 font-mono text-[0.6rem] leading-relaxed text-olive">
                  real cost from actual token usage on every call · USD · days measured in UTC
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-chili">Couldn&apos;t load usage.</p>
            )}
          </div>
        </div>
      )}

      <footer className="mt-16 border-t-[3px] border-dotted border-line pt-4 text-center font-mono text-[0.65rem] text-olive">
        scan → identify → understand → cook
      </footer>
    </main>
  );
}

function UsageRow({ label, data }: { label: string; data: UsageBucket }) {
  return (
    <div className="flex items-baseline justify-between rounded-lg bg-pistachio px-4 py-3">
      <span className="font-display text-base font-bold">{label}</span>
      <span className="font-mono text-sm">
        ${data.costUsd.toFixed(3)}{" "}
        <span className="text-olive">
          · {data.calls} {data.calls === 1 ? "call" : "calls"}
        </span>
      </span>
    </div>
  );
}
