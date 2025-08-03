import localFont from 'next/font/local'
import { GeistSans } from 'geist/font/sans'

export const interFont = localFont({
  src: './Inter.ttf',
  display: 'swap',
  variable: '--font-inter',
})

export const geistFont = GeistSans