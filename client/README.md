# Re:UseNet Client Application

## Overview

This is the React frontend for the Re:UseNet community-based waste exchange platform.

## Technology Stack

- **React 19** with TypeScript
- **React Router 7** for navigation
- **Tailwind CSS** for styling
- **Vite** for build tooling

## Project Structure

```
src/
├── components/
│   └── layout/
│       ├── Header.tsx       # Main navigation header
│       ├── Footer.tsx       # Site footer with links
│       └── Layout.tsx       # Main layout wrapper with Outlet
├── pages/
│   ├── Home.tsx            # Landing page
│   ├── Items.tsx           # Browse items (placeholder)
│   ├── PostItem.tsx        # Post new item (placeholder)
│   ├── Exchanges.tsx       # Exchange management (placeholder)
│   ├── Dashboard.tsx       # Gamification dashboard (placeholder)
│   ├── Login.tsx           # Login page (placeholder)
│   └── Register.tsx        # Registration page (placeholder)
├── App.tsx                 # Main app with routing
├── main.tsx               # Application entry point
└── index.css              # Global styles with Tailwind
```

## Setup Instructions

### Install Dependencies

```bash
cd client
npm install
```

The following dependencies are configured in package.json:
- `react-router-dom` - Client-side routing
- `tailwindcss`, `postcss`, `autoprefixer` - Styling framework

### Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Features Implemented (Task 7.1)

✅ React application with TypeScript configuration
✅ React Router setup with multiple routes
✅ Tailwind CSS configuration and styling
✅ Responsive layout with header, navigation, and footer
✅ Home page with hero section and feature cards
✅ Placeholder pages for all main routes
✅ Vite proxy configuration for API calls

## Routes

- `/` - Home page
- `/items` - Browse items
- `/post-item` - Post a new item
- `/exchanges` - View and manage exchanges
- `/dashboard` - Gamification dashboard
- `/login` - User login
- `/register` - User registration

## Next Steps

The following tasks will implement the remaining functionality:

- **Task 7.2**: Authentication components and flows
- **Task 7.3**: Item management interface
- **Task 7.4**: Exchange management interface
- **Task 7.5**: Gamification dashboard

## API Integration

The Vite dev server is configured to proxy API requests to `http://localhost:3000`. All requests to `/api/*` will be forwarded to the backend server.

## Styling

The application uses Tailwind CSS with a custom color palette:
- Primary color: Green (eco-friendly theme)
- Custom utility classes defined in `index.css`
- Responsive design with mobile-first approach

## Notes

- The layout uses a flex column approach to ensure the footer stays at the bottom
- All pages use consistent max-width containers for content
- Navigation links are functional and use React Router's Link component
- The header includes both desktop and mobile-friendly navigation (mobile menu to be implemented)
