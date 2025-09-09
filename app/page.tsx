import { redirect } from 'next/navigation'

export default function HomePage() {
  // Автоматический редирект на страницу входа
  redirect('/auth/login')
}
