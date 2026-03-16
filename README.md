# Route Planner UI

## Overview
A frontend GPS-style route planner built with a real mini-city graph and Dijkstra shortest-path routing.

This project is designed to look strong in screenshots while still being functionally meaningful:
- interactive graph map with highlighted route
- practical route controls (mode, preference, constraints)
- deterministic route output recruiters can verify quickly
- clean UI focused on legibility and demo speed

## Core Features
- Start, destination, and multi-waypoint input from known map nodes
- Real shortest-path computation with Dijkstra on a mini city graph
- Route preference modes: `fastest`, `shortest`, `scenic`
- Constraints toggles: avoid toll roads and avoid highways
- Optional waypoint-order optimization (`nearest-next`) for practical trip planning
- Travel-mode-aware ETA for `car`, `bike`, and `walk`
- SVG network map with highlighted computed route
- Edge-case handling for invalid routes and impossible constraints
- Safe rendering for user-entered content (HTML escaped)

## Tech Stack
- HTML
- CSS
- Vanilla JavaScript

## Demo Scenarios
- Commute: `Old Town -> Station -> Tech Park`
- City Tour: `Downtown -> Old Town -> Harbor -> Airport`

Use these to show routing changes when toggling:
- `Optimize waypoint order`
- `Avoid toll roads`
- `Avoid highways`
- `Fastest` vs `Shortest` vs `Scenic`

## Local Development
- `npm run build`
- `npm test`
- `npm run preview`

Preview URL: `http://localhost:4175`

## Deploy On Vercel
1. Push this folder to GitHub.
2. In Vercel, click `Add New...` -> `Project`.
3. Import your repository.
4. Set Root Directory to:
   `projects/02-html-css-js-interactive-site/route-planner-ui`
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Deploy.

No environment variables are required.
