import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const repoName = 'minesweeper-pro'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? `/${repoName}/` : '/',
})
