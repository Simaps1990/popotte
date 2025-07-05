import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <main className="container mx-auto px-4 py-6 max-w-md">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  )
}