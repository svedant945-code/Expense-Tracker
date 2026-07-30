# Expense Tracker

A premium, production-quality expense tracker built with HTML, CSS, and vanilla JavaScript. Features a modern glassmorphism UI with light/dark mode, interactive charts, budget tracking, and full CRUD operations for transactions.

## Features

### Dashboard
- Total Balance, Income, and Expense summary cards with animated counters
- Color-coded cards: Purple (Balance), Green (Income), Red (Expense)

### Transaction Management
- Add transactions with name, amount, category, type (income/expense), and date
- Edit and delete existing transactions
- Inline validation with error messages
- Negative expense amounts automatically converted to positive

### Filter & Search
- Search transactions by name
- Filter by type (All / Income / Expense)
- Filter by category
- Filter by period (Today / This Week / This Month)
- Sort by date or amount (ascending / descending)

### Charts & Analytics
- Pie chart showing expense breakdown by category (Chart.js)
- Bar chart comparing monthly income vs. expenses (6-month view)
- Budget progress bar with configurable monthly spending limit

### Data Persistence
- All transactions saved to Local Storage
- Theme preference persisted across sessions

### Export
- Export transactions as CSV
- Export transactions as PDF (via jsPDF)

### UI/UX
- Glassmorphism design with backdrop blur
- Light and dark mode with toggle
- Smooth animations (fade, slide, ripple)
- Toast notifications instead of alerts
- Delete confirmation modal
- Responsive mobile-first layout
- Accessible (ARIA labels, semantic HTML, reduced-motion support)

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, Flexbox, Grid, Glassmorphism, Animations, Media queries
- **Vanilla JS** (ES6+) — Local Storage, Chart.js, jsPDF, Event delegation
- **Font Awesome 6** — Icons
- **Google Fonts (Inter)** — Typography

## Getting Started

1. Clone or download the repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. No build tools or server required — it works directly from the file system.

### CDN Dependencies

Loaded from CDN (internet required on first load):
- [Chart.js](https://www.chartjs.org/) — Charts
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export
- [Font Awesome](https://fontawesome.com/) — Icons
- [Google Fonts (Inter)](https://fonts.google.com/specimen/Inter) — Typography

## File Structure

```
expense-tracker/
├── index.html      # Main HTML with all sections and modals
├── style.css       # Complete stylesheet (light/dark themes, responsive)
├── script.js       # Application logic (CRUD, charts, export, filters)
└── README.md       # This file
```

## Screenshots

*(Add screenshots here)*

## License

MIT
