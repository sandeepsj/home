import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works whether deployed at the root
// (username.github.io) or in a subpath (username.github.io/home/).
export default defineConfig({
  base: './',
  plugins: [react()],
})
