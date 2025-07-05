import { Link, Outlet, useLocation } from 'react-router-dom'
import { Users, CreditCard, FileText, Package, ArrowLeft } from 'lucide-react'

export function AdminLayout() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <Link to="/" className="text-primary-500 hover:text-primary-600 flex items-center space-x-1">
          <ArrowLeft size={20} />
          <span>Retour</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/admin"
          className={`card text-center py-4 transition-colors ${
            isActive('/admin') ? 'bg-primary-50 border-primary-200' : 'hover:bg-gray-50'
          }`}
        >
          <Users className="mx-auto mb-2 text-primary-500" size={24} />
          <span className="text-sm font-medium">Utilisateurs</span>
        </Link>

        <Link
          to="/admin/orders"
          className={`card text-center py-4 transition-colors ${
            isActive('/admin/orders') ? 'bg-primary-50 border-primary-200' : 'hover:bg-gray-50'
          }`}
        >
          <CreditCard className="mx-auto mb-2 text-primary-500" size={24} />
          <span className="text-sm font-medium">Commandes</span>
        </Link>

        <Link
          to="/admin/news"
          className={`card text-center py-4 transition-colors ${
            isActive('/admin/news') ? 'bg-primary-50 border-primary-200' : 'hover:bg-gray-50'
          }`}
        >
          <FileText className="mx-auto mb-2 text-primary-500" size={24} />
          <span className="text-sm font-medium">Actualités</span>
        </Link>

        <Link
          to="/admin/products"
          className={`card text-center py-4 transition-colors ${
            isActive('/admin/products') ? 'bg-primary-50 border-primary-200' : 'hover:bg-gray-50'
          }`}
        >
          <Package className="mx-auto mb-2 text-primary-500" size={24} />
          <span className="text-sm font-medium">Produits</span>
        </Link>
      </div>

      <Outlet />
    </div>
  )
}