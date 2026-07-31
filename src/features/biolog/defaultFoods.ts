/** Starter food library seeded into a new user's biolog, with average kJ/kcal per default serving. */
export const DEFAULT_FOODS: {
  name: string;
  category: string;
  serving_size: string;
  kilojoules: number;
  calories: number;
}[] = [
  // Protein
  { name: "Chicken Breast", category: "protein", serving_size: "150g", kilojoules: 985, calories: 235 },
  { name: "Chicken Thigh", category: "protein", serving_size: "150g", kilojoules: 1180, calories: 282 },
  { name: "Beef Steak", category: "protein", serving_size: "200g", kilojoules: 1840, calories: 440 },
  { name: "Beef Mince", category: "protein", serving_size: "200g", kilojoules: 2010, calories: 480 },
  { name: "Lamb", category: "protein", serving_size: "200g", kilojoules: 2090, calories: 500 },
  { name: "Pork Chop", category: "protein", serving_size: "150g", kilojoules: 1340, calories: 320 },
  { name: "Salmon", category: "protein", serving_size: "150g", kilojoules: 1300, calories: 310 },
  { name: "Tuna", category: "protein", serving_size: "150g", kilojoules: 730, calories: 175 },
  { name: "White Fish", category: "protein", serving_size: "150g", kilojoules: 630, calories: 150 },
  { name: "Prawns", category: "protein", serving_size: "100g", kilojoules: 420, calories: 100 },
  { name: "Eggs (2)", category: "protein", serving_size: "2 large", kilojoules: 620, calories: 148 },
  { name: "Tofu", category: "protein", serving_size: "150g", kilojoules: 500, calories: 120 },
  { name: "Greek Yoghurt", category: "protein", serving_size: "170g", kilojoules: 480, calories: 115 },
  { name: "Cottage Cheese", category: "protein", serving_size: "100g", kilojoules: 400, calories: 96 },

  // Carbs
  { name: "White Rice", category: "carbs", serving_size: "150g cooked", kilojoules: 780, calories: 186 },
  { name: "Brown Rice", category: "carbs", serving_size: "150g cooked", kilojoules: 750, calories: 179 },
  { name: "Pasta", category: "carbs", serving_size: "150g cooked", kilojoules: 880, calories: 210 },
  { name: "Potato", category: "carbs", serving_size: "200g", kilojoules: 670, calories: 160 },
  { name: "Sweet Potato", category: "carbs", serving_size: "200g", kilojoules: 720, calories: 172 },
  { name: "Oats", category: "carbs", serving_size: "50g dry", kilojoules: 760, calories: 182 },
  { name: "White Bread (2 slices)", category: "carbs", serving_size: "2 slices", kilojoules: 670, calories: 160 },
  { name: "Whole Wheat Bread (2 slices)", category: "carbs", serving_size: "2 slices", kilojoules: 630, calories: 150 },
  { name: "Quinoa", category: "carbs", serving_size: "150g cooked", kilojoules: 800, calories: 191 },

  // Vegetables
  { name: "Broccoli", category: "vegetables", serving_size: "100g", kilojoules: 140, calories: 34 },
  { name: "Spinach", category: "vegetables", serving_size: "100g", kilojoules: 95, calories: 23 },
  { name: "Carrots", category: "vegetables", serving_size: "100g", kilojoules: 175, calories: 41 },
  { name: "Salad Greens", category: "vegetables", serving_size: "100g", kilojoules: 65, calories: 15 },
  { name: "Tomato", category: "vegetables", serving_size: "1 medium", kilojoules: 75, calories: 18 },
  { name: "Peppers", category: "vegetables", serving_size: "100g", kilojoules: 105, calories: 25 },
  { name: "Green Beans", category: "vegetables", serving_size: "100g", kilojoules: 130, calories: 31 },
  { name: "Butternut", category: "vegetables", serving_size: "150g", kilojoules: 250, calories: 60 },

  // Fruits
  { name: "Apple", category: "fruits", serving_size: "1 medium", kilojoules: 330, calories: 79 },
  { name: "Banana", category: "fruits", serving_size: "1 medium", kilojoules: 440, calories: 105 },
  { name: "Orange", category: "fruits", serving_size: "1 medium", kilojoules: 260, calories: 62 },
  { name: "Berries", category: "fruits", serving_size: "100g", kilojoules: 200, calories: 48 },
  { name: "Grapes", category: "fruits", serving_size: "100g", kilojoules: 270, calories: 65 },
  { name: "Avocado", category: "fats", serving_size: "0.5 medium", kilojoules: 610, calories: 145 },

  // Fats
  { name: "Nuts / Mixed", category: "fats", serving_size: "30g", kilojoules: 750, calories: 179 },
  { name: "Peanut Butter", category: "fats", serving_size: "2 tbsp", kilojoules: 720, calories: 172 },
  { name: "Olive Oil", category: "fats", serving_size: "1 tbsp", kilojoules: 500, calories: 119 },
  { name: "Cheese", category: "fats", serving_size: "30g", kilojoules: 500, calories: 120 },

  // Drinks
  { name: "Water", category: "drinks", serving_size: "500ml", kilojoules: 0, calories: 0 },
  { name: "Black Coffee", category: "drinks", serving_size: "1 cup", kilojoules: 5, calories: 1 },
  { name: "Milk", category: "drinks", serving_size: "250ml", kilojoules: 630, calories: 150 },
  { name: "Fruit Juice", category: "drinks", serving_size: "250ml", kilojoules: 470, calories: 112 },
  { name: "Soft Drink", category: "drinks", serving_size: "330ml", kilojoules: 570, calories: 136 },
  { name: "Wine", category: "drinks", serving_size: "150ml", kilojoules: 500, calories: 120 },
  { name: "Beer", category: "drinks", serving_size: "330ml", kilojoules: 590, calories: 141 },

  // Baked goods
  { name: "Muffin", category: "baked_goods", serving_size: "1 medium", kilojoules: 1500, calories: 358 },
  { name: "Croissant", category: "baked_goods", serving_size: "1 medium", kilojoules: 1130, calories: 270 },

  // Treats
  { name: "Chocolate", category: "treats", serving_size: "40g", kilojoules: 900, calories: 215 },
  { name: "Biscuits (2)", category: "treats", serving_size: "2", kilojoules: 500, calories: 120 },
  { name: "Ice Cream", category: "treats", serving_size: "100g", kilojoules: 840, calories: 200 },
];
