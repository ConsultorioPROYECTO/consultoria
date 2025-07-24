import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Irina',
    short_name: 'Irina',
    description: 'Irina es una plataforma que permite a los profesionales de la salud transformar su práctica en una experiencia más interactiva y personalizada.',
    start_url: '/',
    display: 'standalone',
    background_color: 'primary',
    theme_color: 'primary',
    icons: [
      {
        src: '/img/logos/Google_G.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/img/logos/google.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/img/logos/Google__G__logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}