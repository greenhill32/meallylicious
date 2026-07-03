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

/** Sample data for previewing the menu screen without a working upload. */
export const SAMPLE_ANALYSIS: MenuAnalysis = {
  isMenu: true,
  restaurantName: "Osteria Luna",
  dishes: [
    {
      name: "Burrata con Prosciutto",
      price: "$16",
      category: "Antipasti",
      summary:
        "A creamy fresh Italian cheese called burrata served alongside thin slices of dry-cured ham (prosciutto di Parma) and grilled rustic bread. It's a classic no-cook Italian starter.",
      taste:
        "Rich and creamy from the burrata, salty and savory from the aged ham, with a herbal note from the basil oil and a crunchy, toasty bread contrast.",
      keyIngredients: ["burrata cheese", "prosciutto di Parma", "sourdough bread", "basil oil"],
      allergens: ["dairy", "gluten"],
      cuisine: "Italian",
      homeCookDifficulty: "easy",
    },
    {
      name: "Calamari Fritti",
      price: "$14",
      category: "Antipasti",
      summary:
        "Squid rings and tentacles lightly coated and deep-fried until crisp, served with a lemony garlic mayonnaise and tangy pickled chilies.",
      taste:
        "Crunchy on the outside and tender inside, mildly sweet seafood flavor brightened by lemon and a gentle kick of chili heat.",
      keyIngredients: ["squid", "flour batter", "lemon aioli", "pickled chilies"],
      allergens: ["shellfish", "gluten", "eggs"],
      cuisine: "Italian",
      homeCookDifficulty: "medium",
    },
    {
      name: "Cacio e Pepe",
      price: "$19",
      category: "Primi",
      summary:
        "A famous Roman pasta made with just cheese and black pepper, tossed with fresh tonnarelli (a thick square-cut spaghetti). The cheese and starchy pasta water form a silky sauce.",
      taste:
        "Intensely savory and cheesy with a sharp, peppery bite; creamy, clingy sauce despite having no cream.",
      keyIngredients: ["tonnarelli pasta", "pecorino romano", "black pepper"],
      allergens: ["gluten", "dairy", "eggs"],
      cuisine: "Roman Italian",
      homeCookDifficulty: "medium",
    },
    {
      name: "Ragù alla Bolognese",
      price: "$23",
      category: "Primi",
      summary:
        "Ribbon-shaped tagliatelle pasta topped with a rich, slow-cooked meat sauce made from beef and pork. This is the authentic Bologna version, served with fresh grated parmesan.",
      taste:
        "Deeply savory and meaty, rich and slightly sweet from long braising, with a comforting hearty texture.",
      keyIngredients: ["tagliatelle", "beef", "pork", "parmigiano"],
      allergens: ["gluten", "dairy", "eggs"],
      cuisine: "Northern Italian",
      homeCookDifficulty: "medium",
    },
    {
      name: "Risotto ai Funghi",
      price: "$22",
      category: "Primi",
      summary:
        "A creamy rice dish slowly cooked with mushrooms, using carnaroli rice known for its texture, finished with earthy porcini and cremini mushrooms and truffle butter.",
      taste: "Creamy and comforting with deep earthy mushroom flavor and a luxurious truffle aroma.",
      keyIngredients: ["carnaroli rice", "porcini mushrooms", "cremini mushrooms", "truffle butter"],
      allergens: ["dairy"],
      cuisine: "Northern Italian",
      homeCookDifficulty: "medium",
    },
    {
      name: "Tiramisù della Casa",
      price: "$11",
      category: "Dolci",
      summary:
        "The classic Italian layered dessert made with ladyfinger biscuits soaked in espresso, layered with sweet mascarpone cream and dusted with cocoa.",
      taste: "Creamy, sweet and rich with a bold coffee flavor and a slightly bitter cocoa finish.",
      keyIngredients: ["savoiardi ladyfingers", "espresso", "mascarpone", "cocoa"],
      allergens: ["dairy", "eggs", "gluten"],
      cuisine: "Italian",
      homeCookDifficulty: "easy",
    },
  ],
};
