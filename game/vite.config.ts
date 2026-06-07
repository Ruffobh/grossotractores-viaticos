import { defineConfig } from "vite";

// Base relativa ("./") para que el build estático funcione servido desde
// cualquier subcarpeta (GitHub Pages, una ruta /game, etc.) sin reconfigurar.
export default defineConfig({
  base: "./",
  server: {
    host: true, // expone el dev server en la red local para probar en el celular
  },
  build: {
    target: "es2020",
    outDir: "dist",
  },
});
