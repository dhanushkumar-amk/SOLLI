import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const isBuild = command === 'build'
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        {
          find: '@',
          replacement: path.resolve(__dirname, 'src'),
        },
        ...(isBuild
          ? [
              {
                find: /^\.\/pages\/Dev(Collect|Roundtrip)(\.jsx)?$/,
                replacement: path.resolve(__dirname, 'src/pages/DevEmpty.jsx'),
              },
            ]
          : []),
      ],
    },
    server: { proxy: { '/api': 'http://localhost:5000' } },
  }
})

