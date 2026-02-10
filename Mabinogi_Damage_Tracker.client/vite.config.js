import { defineConfig } from 'vite'
import react from '@vitejs/react-swc'

export default defineConfig({
  plugins: [react()],
  base: './', // これが「自分自身の場所からの相対パス」で探す魔法の言葉
  build: {
    outDir: 'build'
  }
})