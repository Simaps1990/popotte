import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Home } from './pages/Home'
import { Auth } from './pages/Auth'
import { Commande } from './pages/Commande'
import { Dettes } from './pages/Dettes'
import { Parametres } from './pages/Parametres'
import { Profile } from './pages/Profile'
import { AdminLayout } from './pages/admin/AdminLayout'
import { Users } from './pages/admin/Users'
import { Orders } from './pages/admin/Orders'
import { News } from './pages/admin/News'
import { Products } from './pages/admin/Products'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route
              path="commande"
              element={
                <ProtectedRoute>
                  <Commande />
                </ProtectedRoute>
              }
            />
            <Route
              path="dettes"
              element={
                <ProtectedRoute>
                  <Dettes />
                </ProtectedRoute>
              }
            />
            <Route
              path="parametres"
              element={
                <ProtectedRoute>
                  <Parametres />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Users />} />
              <Route path="orders" element={<Orders />} />
              <Route path="news" element={<News />} />
              <Route path="products" element={<Products />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App