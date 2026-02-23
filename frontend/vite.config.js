import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default ({ mode }) => {
  // loadEnv will read .env, .env.local, .env.[mode], etc.
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.VITE_API_PORT || "5001";

  return defineConfig({
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true
        }
      }
    }
  });
};
