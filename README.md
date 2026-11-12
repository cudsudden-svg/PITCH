# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Supabase setup

The home page works without Supabase credentials. To load the squad or use the admin panel, create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Restart the dev server after changing the file. These `VITE_` values are exposed to the browser, so use only the Supabase publishable key, never a secret or service-role key.

## Pitch positions

Apply `supabase/migrations/20261112000000_add_pitch_positions.sql` to the Supabase project to enable saved pitch repositioning. Until then, the squad still loads and players are arranged by playing position, but move controls stay disabled. Owners and editors can right-click a player tag (or use its **MOVE** button), then click a spot on the pitch. Other visitors can still view player tags and profiles.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
