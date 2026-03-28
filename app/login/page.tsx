'use client'

import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white p-8 text-black">
      <h1 className="text-3xl font-bold">Login</h1>
      <p className="mt-4">La ruta /login está funcionando.</p>
    </main>
  )
}