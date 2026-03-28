import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alberche Club',
  description: 'Gestión del club',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}