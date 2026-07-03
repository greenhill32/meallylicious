import { z } from "zod";

export const DishSchema = z.object({
  name: z.string().describe("Dish name exactly as written on the menu"),
  price: z
    .string()
    .nullable()
    .describe("Price as printed on the menu, e.g. '$14', or null if not shown"),
  category: z
    .string()
    .describe(
      "Menu section this dish belongs to, e.g. Starters, Mains, Desserts. Use 'Menu' if the menu has no sections.",
    ),
  summary: z
    .string()
    .describe(
      "One or two friendly sentences explaining what this dish actually is, for someone who has never heard of it",
    ),
  taste: z
    .string()
    .describe("Short description of how it tastes: flavors, texture, richness"),
  keyIngredients: z
    .array(z.string())
    .describe("The 3-6 ingredients that define the dish"),
  allergens: z
    .array(z.string())
    .describe(
      "Common allergens likely present: gluten, dairy, eggs, nuts, peanuts, shellfish, fish, soy, sesame. Empty array if likely none.",
    ),
  cuisine: z.string().describe("Cuisine or origin, e.g. 'Thai', 'Southern Italian'"),
  homeCookDifficulty: z
    .enum(["easy", "medium", "hard"])
    .describe("How hard this dish is to recreate in a home kitchen"),
});

export const MenuAnalysisSchema = z.object({
  isMenu: z
    .boolean()
    .describe("True if the image actually shows a restaurant menu or dish list"),
  restaurantName: z
    .string()
    .nullable()
    .describe("Restaurant name if visible on the menu, else null"),
  dishes: z
    .array(DishSchema)
    .describe("Every distinct dish readable on the menu, in menu order"),
});

export type Dish = z.infer<typeof DishSchema>;
export type MenuAnalysis = z.infer<typeof MenuAnalysisSchema>;
