# DishDash 🛵

A DoorDash-style food delivery web app — no build step, no dependencies, no backend. Open `index.html` in any browser and it just works.

## Features

- **Browse restaurants** — 12 neighborhood spots across 12 cuisines, with ratings, delivery times, fees, and promos
- **Search & filter** — search by restaurant, dish, or cuisine; filter by category chips; sort by rating, speed, or fee
- **Full menus** — each restaurant has real menu sections and items; tap an item to set quantity and add special instructions
- **Cart** — slide-over cart drawer, one store per cart (switching stores prompts to start fresh, just like the real thing)
- **Checkout** — delivery details, demo payment form, tip selector, and an itemized receipt with delivery fee, service fee, and tax
- **Live order tracking** — animated courier map, ETA countdown, and a status timeline that advances from "Order confirmed" through "Delivered"
- **Order history** — past orders saved in `localStorage` with one-tap reorder
- **Responsive & theme-aware** — works on phones, adapts to light and dark mode

## Running it

No install needed:

```bash
# Option 1: just open it
open index.html

# Option 2: serve it locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Project structure

```
index.html      — app shell (header, view container, drawer/modal roots)
css/styles.css  — design tokens + all styles (light & dark themes)
js/data.js      — restaurants, menus, categories, fee constants
js/app.js       — state, views, cart, checkout, and tracking simulation
```

Everything is vanilla HTML/CSS/JS. Food imagery is emoji on gradient tiles, so the app is fully self-contained and runs offline (fonts fall back gracefully without a network).

> DishDash is a demo. No real restaurants, orders, payments, or couriers are involved.
