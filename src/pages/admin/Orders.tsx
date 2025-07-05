import React, { useEffect, useState } from 'react'
import { mockDatabase } from '../../lib/mockDatabase'
import type { Order } from '../../lib/mockData'

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const data = await mockDatabase.getOrders()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const confirmPayment = async (orderId: string) => {
    try {
      await mockDatabase.updateOrder(orderId, { 
        status: 'confirmed'
      })
      
      fetchOrders()
      alert('Paiement confirmé !')
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert('Erreur lors de la confirmation')
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

  const formatPaymentDate = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-red-500 bg-red-50'
      case 'payment_notified': return 'border-orange-500 bg-orange-50'
      case 'confirmed': return 'border-green-500 bg-green-50'
      case 'cancelled': return 'border-gray-500 bg-gray-50'
      default: return 'border-gray-500 bg-gray-50'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente'
      case 'payment_notified': return 'Paiement notifié'
      case 'confirmed': return 'Confirmé'
      case 'cancelled': return 'Annulé'
      default: return status
    }
  }

  // Afficher uniquement les paiements notifiés
  const notifiedOrders = orders.filter(order => order.status === 'payment_notified')

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700">
          💡 Données de démonstration - Vérification factice des paiements.
        </p>
      </div>

      <div className="card text-center">
        <div className="text-2xl font-bold text-orange-600">{notifiedOrders.length}</div>
        <div className="text-sm text-gray-600">Paiements à vérifier</div>
      </div>

      <div className="space-y-4">
        {notifiedOrders.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">Aucun paiement à vérifier.</p>
            <p className="text-xs text-gray-400 mt-2">
              Les paiements apparaîtront ici après notification par les utilisateurs
            </p>
          </div>
        ) : (
          notifiedOrders.map((order) => (
            <div key={order.id} className={`card border-l-4 ${getStatusColor(order.status)}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold">{order.profiles?.full_name}</h3>
                  <p className="text-sm text-gray-600">{order.profiles?.email}</p>
                  <p className="text-xs text-gray-500">
                    Commande: {formatDate(order.created_at)}
                  </p>
                  {order.payment_notified_at && (
                    <p className="text-xs text-orange-600">
                      Paiement notifié: {formatPaymentDate(order.payment_notified_at)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">{order.total_amount.toFixed(2)} €</div>
                  <div className="text-sm font-medium">
                    {getStatusLabel(order.status)}
                  </div>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="text-sm text-gray-600 flex justify-between">
                    <span>{item.quantity}x {item.products.name}</span>
                    <span>{item.total_price.toFixed(2)} €</span>
                  </div>
                ))}
              </div>

              {order.status === 'payment_notified' && (
                <button
                  onClick={() => confirmPayment(order.id)}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 text-sm flex items-center space-x-2"
                >
                  <span>✅ Confirmer le paiement</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}