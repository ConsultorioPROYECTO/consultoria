import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Irina - Plataforma de Salud',
    short_name: 'Irina',
    description: 'Irina es una plataforma que permite a los profesionales de la salud transformar su práctica en una experiencia más interactiva y personalizada.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#3B82F6',
    categories: ['medical', 'health', 'productivity'],
    lang: 'es',
    icons: [
      {
        src: '/icon-192x192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}