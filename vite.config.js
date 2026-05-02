import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import fs from "fs";
import path from "path";

// defineConfig en forma funcional para poder leer .env con loadEnv
export default defineConfig(({ mode }) => {
  // loadEnv lee el archivo .env y hace las variables disponibles aquí
  const env = loadEnv(mode, process.cwd(), "");
  const ngrokHost = env.VITE_NGROK_HOST;

  return {
    server: {
      allowedHosts: [".ngrok-free.dev"],
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
      // HMR por ngrok: solo se activa si VITE_NGROK_HOST está definido en .env
      ...(ngrokHost
        ? {
            hmr: {
              protocol: "wss",
              host: ngrokHost,
              // Puerto 443: ngrok siempre expone HTTPS/WSS en el puerto estándar
              clientPort: 443,
            },
          }
        : {}),
    },
    plugins: [
      react(),
      tailwindcss(),
      // Plugin para servir manifest y SW con los Content-Type correctos
      {
        name: "pwa-static-files",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === "/manifest.webmanifest") {
              const filePath = path.join(process.cwd(), "public/manifest.webmanifest");
              const manifest = fs.readFileSync(filePath, "utf-8");
              res.setHeader("Content-Type", "application/manifest+json");
              res.setHeader("Cache-Control", "no-cache");
              res.end(manifest);
              return;
            }
            if (req.url === "/sw.js") {
              const filePath = path.join(process.cwd(), "public/sw.js");
              const sw = fs.readFileSync(filePath, "utf-8");
              res.setHeader("Content-Type", "application/javascript");
              res.setHeader("Service-Worker-Allowed", "/");
              res.setHeader("Cache-Control", "no-cache");
              res.end(sw);
              return;
            }
            next();
          });
        },
      },
    ],
  };
});


