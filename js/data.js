// DishDash seed data — restaurants, menus, categories.
// All imagery is emoji-on-gradient so the app runs fully offline.

const CATEGORIES = [
  { id: "all", label: "All", emoji: "🍽️" },
  { id: "pizza", label: "Pizza", emoji: "🍕" },
  { id: "burgers", label: "Burgers", emoji: "🍔" },
  { id: "sushi", label: "Sushi", emoji: "🍣" },
  { id: "mexican", label: "Mexican", emoji: "🌮" },
  { id: "chinese", label: "Chinese", emoji: "🥡" },
  { id: "thai", label: "Thai", emoji: "🍜" },
  { id: "indian", label: "Indian", emoji: "🍛" },
  { id: "salads", label: "Salads", emoji: "🥗" },
  { id: "breakfast", label: "Breakfast", emoji: "🥞" },
  { id: "chicken", label: "Chicken", emoji: "🍗" },
  { id: "desserts", label: "Desserts", emoji: "🍩" },
  { id: "coffee", label: "Coffee", emoji: "☕" },
];

const RESTAURANTS = [
  {
    id: "brick-oven-social",
    name: "Brick Oven Social",
    emoji: "🍕",
    gradient: ["#B33420", "#E8622C"],
    categories: ["pizza"],
    tags: ["Pizza", "Italian", "Wings"],
    rating: 4.7,
    ratingCount: "2,400+",
    deliveryMin: 25,
    deliveryMax: 40,
    fee: 1.99,
    price: "$$",
    promoted: true,
    promo: "20% off orders $30+",
    menu: [
      {
        section: "Wood-Fired Pizzas",
        items: [
          { id: "bos-margherita", name: "Margherita", desc: "San Marzano tomato, fresh mozzarella, basil, extra-virgin olive oil on a blistered 12\" crust.", price: 14.5, emoji: "🍕", popular: true },
          { id: "bos-pepperoni", name: "Double Pepperoni", desc: "Cup-and-char pepperoni two ways, low-moisture mozzarella, hot honey drizzle.", price: 16.0, emoji: "🍕", popular: true },
          { id: "bos-mushroom", name: "Funghi Bianca", desc: "Roasted cremini and shiitake, taleggio, garlic cream, thyme. No red sauce.", price: 17.0, emoji: "🍄" },
          { id: "bos-veggie", name: "Garden Party", desc: "Charred peppers, red onion, olives, artichoke hearts, whipped ricotta.", price: 15.5, emoji: "🫑" },
        ],
      },
      {
        section: "Sides & Wings",
        items: [
          { id: "bos-garlic-knots", name: "Garlic Knots (6)", desc: "Brushed with garlic butter and pecorino, side of marinara.", price: 6.5, emoji: "🥨", popular: true },
          { id: "bos-wings", name: "Oven Wings (8)", desc: "Choice of buffalo, BBQ, or lemon-pepper dry rub with ranch.", price: 11.0, emoji: "🍗" },
          { id: "bos-caesar", name: "Little Gem Caesar", desc: "Little gem lettuce, sourdough croutons, shaved parm.", price: 9.0, emoji: "🥗" },
        ],
      },
      {
        section: "Drinks & Dessert",
        items: [
          { id: "bos-soda", name: "Italian Soda", desc: "Blood orange or lemon, over ice.", price: 3.5, emoji: "🥤" },
          { id: "bos-tiramisu", name: "Tiramisu Cup", desc: "Espresso-soaked ladyfingers, mascarpone, cocoa.", price: 7.0, emoji: "🍰" },
        ],
      },
    ],
  },
  {
    id: "stack-city-burgers",
    name: "Stack City Burgers",
    emoji: "🍔",
    gradient: ["#7A4B12", "#D98E2B"],
    categories: ["burgers"],
    tags: ["Burgers", "Fries", "Shakes"],
    rating: 4.5,
    ratingCount: "5,100+",
    deliveryMin: 15,
    deliveryMax: 30,
    fee: 0.99,
    price: "$",
    promoted: true,
    promo: "Free fries with any double",
    menu: [
      {
        section: "Smash Burgers",
        items: [
          { id: "scb-classic", name: "The Classic Smash", desc: "Quarter-pound smashed patty, American cheese, pickles, onion, Stack sauce.", price: 8.5, emoji: "🍔", popular: true },
          { id: "scb-double", name: "Double Trouble", desc: "Two smashed patties, double cheese, caramelized onions, Stack sauce.", price: 11.5, emoji: "🍔", popular: true },
          { id: "scb-veggie", name: "Smash Not-Burger", desc: "Grilled portobello and black-bean patty, chipotle mayo, avocado.", price: 10.0, emoji: "🥑" },
          { id: "scb-blt", name: "Bacon Stack", desc: "Smash patty, thick-cut bacon, lettuce, tomato, garlic aioli.", price: 12.0, emoji: "🥓" },
        ],
      },
      {
        section: "Fries & Sides",
        items: [
          { id: "scb-fries", name: "Crinkle Fries", desc: "Double-fried, sea salt. Add cheese sauce +$1.", price: 4.0, emoji: "🍟", popular: true },
          { id: "scb-rings", name: "Onion Rings", desc: "Beer-battered, served with ranch.", price: 5.5, emoji: "🧅" },
        ],
      },
      {
        section: "Shakes",
        items: [
          { id: "scb-vanilla", name: "Vanilla Bean Shake", desc: "Hand-spun with real vanilla bean.", price: 6.0, emoji: "🥤" },
          { id: "scb-choc", name: "Dark Chocolate Shake", desc: "Hand-spun with 60% dark chocolate.", price: 6.0, emoji: "🍫" },
        ],
      },
    ],
  },
  {
    id: "kaiyo-sushi",
    name: "Kaiyo Sushi Bar",
    emoji: "🍣",
    gradient: ["#134E5E", "#2E8B8B"],
    categories: ["sushi"],
    tags: ["Sushi", "Japanese", "Poke"],
    rating: 4.8,
    ratingCount: "1,900+",
    deliveryMin: 30,
    deliveryMax: 45,
    fee: 3.49,
    price: "$$$",
    promoted: false,
    menu: [
      {
        section: "Signature Rolls",
        items: [
          { id: "ks-dragon", name: "Dragon Roll", desc: "Shrimp tempura, cucumber, topped with avocado and unagi glaze. 8 pc.", price: 16.0, emoji: "🐉", popular: true },
          { id: "ks-spicy-tuna", name: "Spicy Tuna Roll", desc: "Chopped tuna, sriracha mayo, scallion, sesame. 8 pc.", price: 12.0, emoji: "🍣", popular: true },
          { id: "ks-california", name: "California Roll", desc: "Snow crab mix, avocado, cucumber, tobiko. 8 pc.", price: 10.0, emoji: "🦀" },
          { id: "ks-veggie-roll", name: "Garden Roll", desc: "Avocado, cucumber, pickled radish, carrot, shiso. 8 pc.", price: 9.0, emoji: "🥒" },
        ],
      },
      {
        section: "Nigiri & Sashimi",
        items: [
          { id: "ks-salmon-nigiri", name: "Salmon Nigiri (2)", desc: "Scottish salmon over seasoned rice.", price: 7.0, emoji: "🍣" },
          { id: "ks-tuna-sashimi", name: "Tuna Sashimi (5)", desc: "Bigeye tuna, sliced to order.", price: 14.0, emoji: "🐟" },
        ],
      },
      {
        section: "Bowls & Sides",
        items: [
          { id: "ks-poke", name: "Kaiyo Poke Bowl", desc: "Tuna, salmon, edamame, seaweed salad, sushi rice, ponzu.", price: 15.5, emoji: "🥣", popular: true },
          { id: "ks-miso", name: "Miso Soup", desc: "Tofu, wakame, scallion.", price: 3.5, emoji: "🍲" },
          { id: "ks-edamame", name: "Edamame", desc: "Steamed, flaky sea salt.", price: 5.0, emoji: "🫛" },
        ],
      },
    ],
  },
  {
    id: "la-lucha-taqueria",
    name: "La Lucha Taqueria",
    emoji: "🌮",
    gradient: ["#7B2D26", "#C75B39"],
    categories: ["mexican"],
    tags: ["Tacos", "Burritos", "Mexican"],
    rating: 4.6,
    ratingCount: "3,700+",
    deliveryMin: 20,
    deliveryMax: 35,
    fee: 1.49,
    price: "$",
    promoted: false,
    promo: "$0 delivery fee over $15",
    menu: [
      {
        section: "Tacos",
        items: [
          { id: "llt-pastor", name: "Al Pastor Taco", desc: "Spit-roasted pork, pineapple, onion, cilantro on corn tortillas.", price: 3.75, emoji: "🌮", popular: true },
          { id: "llt-carne", name: "Carne Asada Taco", desc: "Grilled steak, salsa verde, onion, cilantro.", price: 4.0, emoji: "🌮", popular: true },
          { id: "llt-baja", name: "Baja Fish Taco", desc: "Beer-battered cod, cabbage slaw, chipotle crema, lime.", price: 4.5, emoji: "🐟" },
          { id: "llt-hongos", name: "Hongos Taco", desc: "Garlicky mushrooms, queso fresco, salsa macha.", price: 3.5, emoji: "🍄" },
        ],
      },
      {
        section: "Burritos & Bowls",
        items: [
          { id: "llt-burrito", name: "Mission Burrito", desc: "Choice of meat, rice, beans, cheese, pico, crema. Foil-wrapped and enormous.", price: 11.5, emoji: "🌯", popular: true },
          { id: "llt-bowl", name: "Lucha Bowl", desc: "Burrito, minus the tortilla. Extra greens.", price: 11.0, emoji: "🥣" },
          { id: "llt-quesadilla", name: "Quesadilla Grande", desc: "Oaxaca cheese, flour tortilla, choice of meat, guac.", price: 10.0, emoji: "🧀" },
        ],
      },
      {
        section: "Sides & Drinks",
        items: [
          { id: "llt-chips", name: "Chips & Guac", desc: "Fresh-fried tortilla chips, hand-mashed guacamole.", price: 6.0, emoji: "🥑" },
          { id: "llt-elote", name: "Elote", desc: "Grilled corn, crema, cotija, chile-lime.", price: 5.0, emoji: "🌽" },
          { id: "llt-horchata", name: "Horchata", desc: "House-made, cinnamon rice milk.", price: 4.0, emoji: "🥛" },
        ],
      },
    ],
  },
  {
    id: "golden-wok",
    name: "Golden Wok Kitchen",
    emoji: "🥡",
    gradient: ["#8C2318", "#D4A017"],
    categories: ["chinese"],
    tags: ["Chinese", "Noodles", "Dumplings"],
    rating: 4.4,
    ratingCount: "2,100+",
    deliveryMin: 25,
    deliveryMax: 40,
    fee: 2.49,
    price: "$$",
    promoted: false,
    menu: [
      {
        section: "Dumplings & Starters",
        items: [
          { id: "gw-potstickers", name: "Pork Potstickers (6)", desc: "Pan-fried, black vinegar dipping sauce.", price: 8.5, emoji: "🥟", popular: true },
          { id: "gw-springrolls", name: "Veggie Spring Rolls (4)", desc: "Crispy, with sweet chili sauce.", price: 6.0, emoji: "🥢" },
          { id: "gw-wonton-soup", name: "Wonton Soup", desc: "Pork and shrimp wontons in chicken broth, bok choy.", price: 7.5, emoji: "🍲" },
        ],
      },
      {
        section: "Wok Mains",
        items: [
          { id: "gw-kungpao", name: "Kung Pao Chicken", desc: "Peanuts, dried chilies, scallion. Served with jasmine rice.", price: 13.5, emoji: "🌶️", popular: true },
          { id: "gw-beef-broccoli", name: "Beef & Broccoli", desc: "Wok-seared flank steak, oyster sauce, jasmine rice.", price: 14.5, emoji: "🥦" },
          { id: "gw-mapo", name: "Mapo Tofu", desc: "Silken tofu, Sichuan chili bean sauce, numbing peppercorn.", price: 12.0, emoji: "🌶️" },
          { id: "gw-fried-rice", name: "House Fried Rice", desc: "Egg, char siu, peas, scallion.", price: 11.0, emoji: "🍚", popular: true },
          { id: "gw-lomein", name: "Vegetable Lo Mein", desc: "Egg noodles, seasonal vegetables, soy-sesame sauce.", price: 11.5, emoji: "🍜" },
        ],
      },
    ],
  },
  {
    id: "bangkok-street",
    name: "Bangkok Street",
    emoji: "🍜",
    gradient: ["#5B2A86", "#A64AC9"],
    categories: ["thai"],
    tags: ["Thai", "Noodles", "Curry"],
    rating: 4.7,
    ratingCount: "1,600+",
    deliveryMin: 30,
    deliveryMax: 45,
    fee: 2.99,
    price: "$$",
    promoted: false,
    menu: [
      {
        section: "Noodles",
        items: [
          { id: "bs-padthai", name: "Pad Thai", desc: "Rice noodles, tamarind, egg, peanuts, bean sprouts. Choice of chicken, shrimp, or tofu.", price: 13.0, emoji: "🍜", popular: true },
          { id: "bs-drunken", name: "Drunken Noodles", desc: "Wide rice noodles, Thai basil, chili, choice of protein. Spicy.", price: 13.5, emoji: "🌶️" },
          { id: "bs-boat", name: "Boat Noodle Soup", desc: "Rich beef broth, rice noodles, herbs, bean sprouts.", price: 12.5, emoji: "🍲" },
        ],
      },
      {
        section: "Curries & Rice",
        items: [
          { id: "bs-green-curry", name: "Green Curry", desc: "Coconut milk, Thai eggplant, bamboo, basil. With jasmine rice.", price: 14.0, emoji: "🍛", popular: true },
          { id: "bs-massaman", name: "Massaman Curry", desc: "Slow-braised beef, potato, peanut, warm spices.", price: 15.0, emoji: "🥘" },
          { id: "bs-basil-fried-rice", name: "Basil Fried Rice", desc: "Thai basil, chili, egg, choice of protein.", price: 12.5, emoji: "🍚" },
        ],
      },
      {
        section: "Starters",
        items: [
          { id: "bs-satay", name: "Chicken Satay (4)", desc: "Grilled skewers, peanut sauce, cucumber relish.", price: 8.0, emoji: "🍢" },
          { id: "bs-rolls", name: "Fresh Summer Rolls (2)", desc: "Shrimp, vermicelli, herbs, peanut dip.", price: 7.0, emoji: "🥬" },
        ],
      },
    ],
  },
  {
    id: "spice-route",
    name: "Spice Route",
    emoji: "🍛",
    gradient: ["#9A3B00", "#E07B00"],
    categories: ["indian"],
    tags: ["Indian", "Curry", "Tandoor"],
    rating: 4.6,
    ratingCount: "1,300+",
    deliveryMin: 35,
    deliveryMax: 50,
    fee: 2.99,
    price: "$$",
    promoted: false,
    menu: [
      {
        section: "Curries",
        items: [
          { id: "sr-butter-chicken", name: "Butter Chicken", desc: "Tandoori chicken in tomato-fenugreek cream. With basmati rice.", price: 15.5, emoji: "🍛", popular: true },
          { id: "sr-chana", name: "Chana Masala", desc: "Chickpeas simmered with ginger, tomato, garam masala.", price: 12.5, emoji: "🥘" },
          { id: "sr-saag", name: "Saag Paneer", desc: "House paneer in creamed spinach, cumin tempering.", price: 13.5, emoji: "🥬", popular: true },
          { id: "sr-vindaloo", name: "Lamb Vindaloo", desc: "Fiery Goan curry, vinegar tang, potatoes. Very spicy.", price: 16.5, emoji: "🌶️" },
        ],
      },
      {
        section: "Tandoor & Breads",
        items: [
          { id: "sr-naan", name: "Garlic Naan", desc: "Blistered in the tandoor, brushed with garlic butter.", price: 4.0, emoji: "🫓", popular: true },
          { id: "sr-tikka", name: "Chicken Tikka Skewers", desc: "Yogurt-marinated, char-grilled, mint chutney.", price: 13.0, emoji: "🍢" },
          { id: "sr-samosa", name: "Samosas (2)", desc: "Spiced potato and pea, tamarind chutney.", price: 6.0, emoji: "🥟" },
        ],
      },
      {
        section: "Drinks",
        items: [
          { id: "sr-lassi", name: "Mango Lassi", desc: "Alphonso mango, yogurt, cardamom.", price: 5.0, emoji: "🥭" },
          { id: "sr-chai", name: "Masala Chai", desc: "Spiced black tea with milk.", price: 3.5, emoji: "☕" },
        ],
      },
    ],
  },
  {
    id: "verde-bowl",
    name: "Verde Bowl",
    emoji: "🥗",
    gradient: ["#1E5631", "#4C9A2A"],
    categories: ["salads"],
    tags: ["Salads", "Healthy", "Grain Bowls"],
    rating: 4.5,
    ratingCount: "980+",
    deliveryMin: 15,
    deliveryMax: 25,
    fee: 1.99,
    price: "$$",
    promoted: false,
    menu: [
      {
        section: "Signature Salads",
        items: [
          { id: "vb-cobb", name: "Green Goddess Cobb", desc: "Romaine, chicken, avocado, egg, bacon, blue cheese, goddess dressing.", price: 13.5, emoji: "🥗", popular: true },
          { id: "vb-kale", name: "Crunchy Kale Caesar", desc: "Lacinato kale, sourdough crumbs, parm, lemon caesar.", price: 12.0, emoji: "🥬" },
          { id: "vb-mediterranean", name: "Mediterranean Chop", desc: "Cucumber, tomato, chickpeas, feta, olives, red-wine vinaigrette.", price: 12.5, emoji: "🫒" },
        ],
      },
      {
        section: "Grain Bowls",
        items: [
          { id: "vb-harvest", name: "Harvest Grain Bowl", desc: "Farro, roasted squash, cranberries, goat cheese, maple vinaigrette.", price: 13.0, emoji: "🥣", popular: true },
          { id: "vb-salmon", name: "Citrus Salmon Bowl", desc: "Roasted salmon, quinoa, shaved fennel, orange, dill yogurt.", price: 16.0, emoji: "🐟" },
        ],
      },
      {
        section: "Sips",
        items: [
          { id: "vb-green-juice", name: "Cold-Pressed Green Juice", desc: "Kale, apple, cucumber, ginger, lemon.", price: 7.0, emoji: "🥤" },
          { id: "vb-kombucha", name: "Ginger Kombucha", desc: "Local, on rotation.", price: 5.5, emoji: "🫚" },
        ],
      },
    ],
  },
  {
    id: "sunrise-diner",
    name: "Sunrise Diner",
    emoji: "🥞",
    gradient: ["#B45309", "#F59E0B"],
    categories: ["breakfast"],
    tags: ["Breakfast", "Brunch", "Diner"],
    rating: 4.4,
    ratingCount: "2,800+",
    deliveryMin: 20,
    deliveryMax: 35,
    fee: 1.99,
    price: "$",
    promoted: true,
    promo: "Buy 1 stack, get coffee free",
    menu: [
      {
        section: "Griddle",
        items: [
          { id: "sd-pancakes", name: "Buttermilk Stack (3)", desc: "Whipped butter, warm maple syrup.", price: 9.5, emoji: "🥞", popular: true },
          { id: "sd-french-toast", name: "Brioche French Toast", desc: "Vanilla custard-dipped, berries, powdered sugar.", price: 11.0, emoji: "🍞" },
          { id: "sd-waffle", name: "Malted Waffle", desc: "Crisp edges, whipped cream, strawberries.", price: 10.5, emoji: "🧇" },
        ],
      },
      {
        section: "Eggs & Plates",
        items: [
          { id: "sd-breakfast-plate", name: "Big Sunrise Plate", desc: "Two eggs any style, bacon or sausage, home fries, toast.", price: 12.5, emoji: "🍳", popular: true },
          { id: "sd-omelet", name: "Three-Egg Omelet", desc: "Cheddar, peppers, onion, home fries.", price: 11.5, emoji: "🥚" },
          { id: "sd-breakfast-burrito", name: "Breakfast Burrito", desc: "Scrambled eggs, chorizo, potato, cheese, salsa roja.", price: 11.0, emoji: "🌯" },
        ],
      },
      {
        section: "Coffee & Juice",
        items: [
          { id: "sd-drip", name: "Bottomless-Style Drip Coffee", desc: "Diner roast. 16 oz.", price: 3.0, emoji: "☕" },
          { id: "sd-oj", name: "Fresh-Squeezed OJ", desc: "Squeezed this morning.", price: 4.5, emoji: "🍊" },
        ],
      },
    ],
  },
  {
    id: "cluck-house",
    name: "Cluck House Hot Chicken",
    emoji: "🍗",
    gradient: ["#991B1B", "#F97316"],
    categories: ["chicken"],
    tags: ["Fried Chicken", "Nashville Hot", "Sandwiches"],
    rating: 4.6,
    ratingCount: "3,200+",
    deliveryMin: 20,
    deliveryMax: 35,
    fee: 1.49,
    price: "$$",
    promoted: false,
    menu: [
      {
        section: "Sandwiches",
        items: [
          { id: "ch-classic-sando", name: "Classic Cluck Sando", desc: "Buttermilk-fried breast, slaw, pickles, comeback sauce, brioche bun.", price: 10.5, emoji: "🥪", popular: true },
          { id: "ch-hot-sando", name: "Nashville Hot Sando", desc: "Cayenne-oil dredged, pick your heat: mild → cluckin' hot.", price: 11.5, emoji: "🔥", popular: true },
        ],
      },
      {
        section: "Tenders & Wings",
        items: [
          { id: "ch-tenders", name: "Jumbo Tenders (4)", desc: "With Texas toast, pickles, choice of sauce.", price: 12.0, emoji: "🍗" },
          { id: "ch-wings", name: "Hot Wings (8)", desc: "Tossed in Nashville hot oil, ranch on the side.", price: 12.5, emoji: "🍗" },
        ],
      },
      {
        section: "Sides",
        items: [
          { id: "ch-mac", name: "Baked Mac & Cheese", desc: "Three-cheese blend, toasted crumbs.", price: 5.5, emoji: "🧀", popular: true },
          { id: "ch-slaw", name: "Vinegar Slaw", desc: "Crunchy, tangy, the right counterpunch.", price: 3.5, emoji: "🥬" },
          { id: "ch-sweet-tea", name: "Sweet Tea", desc: "Brewed daily. 22 oz.", price: 3.0, emoji: "🧋" },
        ],
      },
    ],
  },
  {
    id: "sugar-cloud",
    name: "Sugar Cloud Bakery",
    emoji: "🍩",
    gradient: ["#9D2B6B", "#E85D9E"],
    categories: ["desserts", "coffee"],
    tags: ["Donuts", "Bakery", "Ice Cream"],
    rating: 4.8,
    ratingCount: "1,100+",
    deliveryMin: 15,
    deliveryMax: 30,
    fee: 2.49,
    price: "$",
    promoted: false,
    menu: [
      {
        section: "Donuts",
        items: [
          { id: "sc-glazed", name: "Classic Glazed", desc: "Yeast-raised, glazed while warm.", price: 2.5, emoji: "🍩", popular: true },
          { id: "sc-choc-sprinkle", name: "Chocolate Sprinkle", desc: "Chocolate icing, rainbow sprinkles.", price: 3.0, emoji: "🍩" },
          { id: "sc-dozen", name: "Baker's Dozen Box", desc: "13 assorted — we pick the best of the case.", price: 24.0, emoji: "📦", popular: true },
        ],
      },
      {
        section: "Cakes & Scoops",
        items: [
          { id: "sc-slice", name: "Funfetti Cake Slice", desc: "Three layers, vanilla buttercream.", price: 6.5, emoji: "🍰" },
          { id: "sc-cookie", name: "Brown Butter Chocolate Chip Cookie", desc: "Baked hourly. Flaky salt on top.", price: 3.5, emoji: "🍪" },
          { id: "sc-sundae", name: "Hot Fudge Sundae", desc: "Two scoops vanilla, fudge, whipped cream, cherry.", price: 7.5, emoji: "🍨" },
        ],
      },
      {
        section: "Drinks",
        items: [
          { id: "sc-latte", name: "Vanilla Latte", desc: "Double shot, house vanilla syrup. 12 oz.", price: 5.0, emoji: "☕" },
          { id: "sc-cocoa", name: "Hot Cocoa", desc: "Dark chocolate, marshmallows.", price: 4.5, emoji: "🍫" },
        ],
      },
    ],
  },
  {
    id: "daybreak-coffee",
    name: "Daybreak Coffee Co.",
    emoji: "☕",
    gradient: ["#3E2723", "#795548"],
    categories: ["coffee", "breakfast"],
    tags: ["Coffee", "Pastries", "Toast"],
    rating: 4.7,
    ratingCount: "860+",
    deliveryMin: 10,
    deliveryMax: 25,
    fee: 0.99,
    price: "$",
    promoted: false,
    menu: [
      {
        section: "Espresso & Brew",
        items: [
          { id: "db-latte", name: "Latte", desc: "Double shot, steamed milk of your choice. 12 oz.", price: 4.75, emoji: "☕", popular: true },
          { id: "db-cold-brew", name: "Cold Brew", desc: "20-hour steep, over ice. 16 oz.", price: 4.5, emoji: "🧊", popular: true },
          { id: "db-cappuccino", name: "Cappuccino", desc: "Double shot, dry foam. 8 oz.", price: 4.5, emoji: "☕" },
          { id: "db-matcha", name: "Matcha Latte", desc: "Ceremonial-grade matcha, lightly sweetened.", price: 5.5, emoji: "🍵" },
        ],
      },
      {
        section: "Pastries & Toast",
        items: [
          { id: "db-croissant", name: "Butter Croissant", desc: "Laminated in-house, baked at 6 AM.", price: 4.0, emoji: "🥐", popular: true },
          { id: "db-avo-toast", name: "Avocado Toast", desc: "Sourdough, smashed avocado, chili flake, lemon.", price: 8.5, emoji: "🥑" },
          { id: "db-banana-bread", name: "Banana Bread Slice", desc: "Walnuts, toasted with butter on request.", price: 4.5, emoji: "🍌" },
        ],
      },
    ],
  },
];

const TIP_PRESETS = [0, 0.1, 0.15, 0.2];
const SERVICE_FEE_RATE = 0.1;
const TAX_RATE = 0.0825;
const SERVICE_FEE_CAP = 5.0;
