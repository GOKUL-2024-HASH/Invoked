
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Injects the API key into the build. 
      // For production, this is set in the Vercel/Netlify dashboard.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Optional: Backend URL if you move Gemini logic to Node.js
      'process.env.VITE_BACKEND_URL': JSON.stringify(env.VITE_BACKEND_URL),
    },
    server: {
      port: 5173,
      strictPort: true,
      // Enable hosting for mobile testing
      host: true,
    }
  };
});
