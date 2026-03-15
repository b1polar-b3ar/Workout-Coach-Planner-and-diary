import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/Workout-Coach-Planner-and-diary/',
  server: {
    host: true,
  },
});
