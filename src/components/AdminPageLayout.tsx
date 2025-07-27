import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'

export function AdminPageLayout() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="w-full max-w-md mx-auto px-4 py-6 flex-grow pb-20">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
      <div className="w-full max-w-md mx-auto">
        <BottomNavigation />
      </div>
    </div>
  )
}
