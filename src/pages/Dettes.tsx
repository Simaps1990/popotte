import React, { useEffect, useState } from 'react'
import { CreditCard, ExternalLink, Bell } from 'lucide-react'
import { mockDatabase } from '../lib/mockDatabase'
import { useAuth } from '../contexts/AuthContext'
import type { Order } from '../lib/mockData'

export function Dettes() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentInitiated, setPaymentInitiated] = useState(false)

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    if (!user) return

    try {
      const data = await mockDatabase.getOrders(user.id)
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentClick = () => {
    // Simuler le clic sur le lien PayPal
    setPaymentInitiated(true)
  }

  const notifyPayment = async () => {
    try {
      // Notifier le paiement pour toutes les commandes en attente
      const pendingOrderIds = pendingOrders.map(order => order.id)
      
      for (const orderId of pendingOrderIds) {
        await mockDatabase.updateOrder(orderId, { 
          status: 'payment_notified'
        })
      }
      
      setPaymentInitiated(false)
      fetchOrders()
      alert('Paiement notifié aux popottiers !')
    } catch (error) {
      console.error('Error notifying payment:', error)
      alert('Erreur lors de la notification')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const pendingOrders = orders.filter(order => order.status === 'pending')
  const notifiedOrders = orders.filter(order => order.status === 'payment_notified')
  const confirmedOrders = orders.filter(order => order.status === 'confirmed')

  const pendingTotal = pendingOrders.reduce((sum, order) => sum + order.total_amount, 0)

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mes Dettes</h1>
        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
          Mode démo
        </div>
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700">
          💡 Données de démonstration. Les paiements sont simulés.
        </p>
      </div>

      {/* Dettes non réglées */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-red-600">🔴 Dettes non réglées</h2>
        
        {pendingOrders.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">Aucune dette en attente.</p>
          </div>
        ) : (
          <>
            {pendingOrders.map((order) => (
              <div key={order.id} className="card border-l-4 border-red-500 bg-red-50">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </span>
                  <span className="font-semibold text-red-600">
                    {order.total_amount.toFixed(2)} €
                  </span>
                </div>
                
                <div className="space-y-1 mb-3">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="text-sm text-gray-600">
                      {item.quantity}x {item.products.name} - {item.total_price.toFixed(2)} €
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="card bg-red-50 border-red-200">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold">Total à régler :</span>
                <span className="text-xl font-bold text-red-600">
                  {pendingTotal.toFixed(2)} €
                </span>
              </div>
              
              <div className="space-y-3">
                <a
                  href="https://paypal.me/popotte"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handlePaymentClick}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <CreditCard size={20} />
                  <span>Régler mes dettes</span>
                  <ExternalLink size={16} />
                </a>
                
                {paymentInitiated && (
                  <button
                    onClick={notifyPayment}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <Bell size={20} />
                    <span>Notifier mon paiement aux popottiers</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dettes en attente de confirmation */}
      {notifiedOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-orange-600">🟠 Dettes en attente de confirmation</h2>
          
          {notifiedOrders.map((order) => (
            <div key={order.id} className="card border-l-4 border-orange-500 bg-orange-50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-500">
                  Commande: {formatDate(order.created_at)}
                </span>
                <span className="font-semibold text-orange-600">
                  {order.total_amount.toFixed(2)} €
                </span>
              </div>
              
              {order.payment_initiated_at && (
                <div className="text-xs text-orange-600 mb-2">
                  Paiement notifié: {formatDate(order.payment_notified_at!)}
                </div>
              )}
              
              <div className="space-y-1 mb-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="text-sm text-gray-600">
                    {item.quantity}x {item.products.name} - {item.total_price.toFixed(2)} €
                  </div>
                ))}
              </div>
              
              <div className="text-sm text-orange-700 font-medium bg-orange-100 p-2 rounded">
                ⏳ En attente de confirmation par les popottiers
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dettes réglées */}
      {confirmedOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-green-600">🟢 Dettes réglées</h2>
          
          {confirmedOrders.map((order) => (
            <div key={order.id} className="card border-l-4 border-green-500 bg-green-50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-500">
                  Commande: {formatDate(order.created_at)}
                </span>
                <span className="font-semibold text-green-600">
                  {order.total_amount.toFixed(2)} €
                </span>
              </div>
              
              {order.confirmed_at && (
                <div className="text-xs text-green-600 mb-2">
                  Confirmé: {formatDate(order.confirmed_at)}
                </div>
              )}
              
              <div className="space-y-1 mb-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="text-sm text-gray-600">
                    {item.quantity}x {item.products.name} - {item.total_price.toFixed(2)} €
                  </div>
                ))}
              </div>
              
              <div className="text-sm text-green-700 font-medium bg-green-100 p-2 rounded">
                ✅ Paiement confirmé
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}