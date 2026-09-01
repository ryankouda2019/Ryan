# Arctic HVAC Services — Website Redesign

A modern, mobile-friendly rebuild of [arctichvacservices.com](https://arctichvacservices.com) — Arctic HVAC Services, Inc., a licensed, bonded & insured heating and air conditioning company serving the Washington, DC metro area since 2004.

## What's in here

- `index.html` — the entire site. Zero dependencies, no frameworks, no build step. All CSS/JS is inlined, icons are inline SVG. Loads instantly.

## Features

- Mobile-first responsive design with hamburger menu and a sticky "Call Now" bar on phones
- Click-to-call buttons throughout (`tel:` links to (240) 793-6757)
- Sections: Hero, Services, Brands, Why Us, About, Service Area, Contact + embedded Google Map
- SEO: meta description, Open Graph tags, and schema.org `HVACBusiness` JSON-LD (helps Google show the business in local search)
- Accessible: semantic HTML, ARIA labels, keyboard focus states, reduced-motion support

## Before launch (small checklist)

1. **Contact form email** — the form currently opens the visitor's email client addressed to `info@arctichvacservices.com`. Confirm the business's real email, or wire the form to a free service like [Formspree](https://formspree.io) / [FormSubmit](https://formsubmit.co) so requests land directly in their inbox (see the `TODO` in the script at the bottom of `index.html`).
2. **Verify business details** with the owner: hours, exact service area, license number (good to add in the footer if they have one).
3. **Optional photos** — swapping in a few real photos of the crew/trucks/completed jobs makes it even more personal.

## Deploying

Any static host works — the site is a single file:

- **GitHub Pages**: Settings → Pages → deploy from this branch, done.
- **Netlify / Vercel / Cloudflare Pages**: drag-and-drop or connect the repo.
- **Existing hosting**: upload `index.html` to the web root, replacing the old WordPress site (back it up first).

Then point the `arctichvacservices.com` DNS at the new host.
