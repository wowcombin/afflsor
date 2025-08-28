import { redirect } from 'next/navigation'

export default function Home() {
  // Простой серверный редирект на логин
  redirect('/login')
}
