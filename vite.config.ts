import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// Sanitize Supabase URL if dashboard URL was accidentally passed into process.env
const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || '';
let resolvedSupabaseUrl = rawSupabaseUrl;
const dashboardMatch = rawSupabaseUrl.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
if (dashboardMatch && dashboardMatch[1]) {
  resolvedSupabaseUrl = `https://${dashboardMatch[1]}.supabase.co`;
  process.env.VITE_SUPABASE_URL = resolvedSupabaseUrl;
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        resolvedSupabaseUrl && resolvedSupabaseUrl.includes('.supabase.co')
          ? resolvedSupabaseUrl
          : 'https://xivkkvknkygpmibczhvh.supabase.co'
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
