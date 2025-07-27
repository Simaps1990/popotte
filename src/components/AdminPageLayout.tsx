import { Outlet } from 'react-router-dom'
import { BottomNavigation } from './BottomNavigation'

export function AdminPageLayout() {
  return (
    <div className="bg-white flex flex-col">
      <main className="bg-white w-full max-w-md mx-auto flex-grow pb-20">
        <div className="bg-white w-full">
          <Outlet />
        </div>
      </main>
      <div className="bg-white w-full max-w-md mx-auto">
        <BottomNavigation />
      </div>
    </div>
  )
}
