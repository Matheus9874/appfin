import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RumoFin",
    short_name: "RumoFin",
    description: "Controle financeiro pessoal simples e inteligente",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0d",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
