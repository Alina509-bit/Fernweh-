import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // HTTPS für den Dev-Server optional (VITE_HTTPS=true), vgl. Vorlesung "Von http zu https"
  const https = env.VITE_HTTPS === "true";

  return {
    plugins: [vue(), ...(https ? [basicSsl()] : [])],
    server: { port: 5173, strictPort: true },
    css: {
      preprocessorOptions: {
        scss: {
          // Bootstrap 5.3 nutzt noch @import & globale Sass-Funktionen
          quietDeps: true,
          silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"],
        },
      },
    },
  };
});
