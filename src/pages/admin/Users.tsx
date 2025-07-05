import React, { useEffect, useState } from 'react'
import { Shield, Search } from 'lucide-react'
import { mockDatabase } from '../../lib/mockDatabase'
import type { User, Order } from '../../lib/mockData'

export function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userOrders, setUserOrders] = useState<Order[]>([])
  const [userDebts, setUserDebts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [addDebtAmount, setAddDebtAmount] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debtFilter, setDebtFilter] = useState<'all' | 'debt' | 'clear'>('all')

  useEffect(() => {
    fetchUsers()
    calculateUserDebts()
  }, [])

  const fetchUsers = async () => {
    try {
      const data = await mockDatabase.getUsers()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateUserDebts = async () => {
    try {
      const allOrders = await mockDatabase.getOrders()
      const debts: Record<string, number> = {}
      
      // Calculer les dettes pour chaque utilisateur
      allOrders.forEach(order => {
        if (order.status === 'pending') {
          debts[order.user_id] = (debts[order.user_id] || 0) + order.total_amount
        }
      })
      
      setUserDebts(debts)
    } catch (error) {
      console.error('Error calculating user debts:', error)
    }
  }

  const fetchUserOrders = async (userId: string) => {
    try {
      const data = await mockDatabase.getUserOrders(userId)
      setUserOrders(data)
    } catch (error) {
      console.error('Error fetching user orders:', error)
    }
  }

  const confirmPayment = async (orderId: string) => {
    try {
      await mockDatabase.updateOrder(orderId, { 
        status: 'confirmed'
      })
      if (selectedUser) {
        fetchUserOrders(selectedUser.id)
        calculateUserDebts() // Recalculer les dettes après confirmation
      }
      alert('Paiement confirmé !')
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert('Erreur lors de la confirmation')
    }
  }

  const addDebt = async () => {
    if (!selectedUser || !addDebtAmount) return

    try {
      await mockDatabase.createOrder({
        user_id: selectedUser.id,
        total_amount: parseFloat(addDebtAmount),
        items: []
      })

      setAddDebtAmount('')
      fetchUserOrders(selectedUser.id)
      calculateUserDebts() // Recalculer les dettes après ajout
      alert('Dette ajoutée avec succès !')
    } catch (error) {
      console.error('Error adding debt:', error)
      alert('Erreur lors de l\'ajout de la dette')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-red-600'
      case 'payment_notified': return 'text-orange-600'
      case 'confirmed': return 'text-green-600'
      case 'cancelled': return 'text-gray-600'
      default: return 'text-gray-600'
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

  // Filtrer et rechercher les utilisateurs
  const filteredUsers = users.filter(user => {
    // Filtre par nom
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Filtre par statut de dette
    const userDebt = userDebts[user.id] || 0
    let matchesDebtFilter = true
    
    if (debtFilter === 'debt') {
      matchesDebtFilter = userDebt > 0
    } else if (debtFilter === 'clear') {
      matchesDebtFilter = userDebt === 0
    }
    
    return matchesSearch && matchesDebtFilter
  })

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (selectedUser) {
    const pendingTotal = userOrders
      .filter(order => order.status === 'pending')
      .reduce((sum, order) => sum + order.total_amount, 0)

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Gestion de {selectedUser.full_name}
          </h2>
          <button
            onClick={() => setSelectedUser(null)}
            className="btn-secondary"
          >
            Retour
          </button>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-semibold">
                {selectedUser.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold">{selectedUser.full_name}</h3>
              {selectedUser.role === 'admin' && (
                <div className="flex items-center space-x-1 mt-1">
                  <Shield size={14} className="text-primary-500" />
                  <span className="text-xs text-primary-600">Admin</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Total des dettes en attente :</p>
            <p className="text-xl font-bold text-red-600">{pendingTotal.toFixed(2)} €</p>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Ajouter une dette</h3>
          <div className="space-y-3">
            <input
              type="number"
              step="0.01"
              placeholder="Montant (€)"
              value={addDebtAmount}
              onChange={(e) => setAddDebtAmount(e.target.value)}
              className="input"
            />
            <button
              onClick={addDebt}
              className="btn-primary"
              disabled={!addDebtAmount}
            >
              Ajouter la dette
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Historique des commandes</h3>
          
          {userOrders.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">Aucune commande trouvée.</p>
            </div>
          ) : (
            userOrders.map((order) => (
              <div key={order.id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </span>
                  <div className="text-right">
                    <div className="font-semibold">{order.total_amount.toFixed(2)} €</div>
                    <div className={`text-sm ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </div>
                  </div>
                </div>
                
                {order.status === 'payment_notified' && (
                  <button
                    onClick={() => confirmPayment(order.id)}
                    className="mt-2 btn-primary text-sm"
                  >
                    Confirmer le paiement
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700">
          💡 Données de démonstration - Gestion factice des utilisateurs.
        </p>
      </div>
      
      {/* Barre de recherche et filtres */}
      <div className="space-y-4">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        
        {/* Filtres par statut de dette */}
        <div className="flex space-x-2">
          <button
            onClick={() => setDebtFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              debtFilter === 'all' 
                ? 'bg-primary-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tous ({users.length})
          </button>
          <button
            onClick={() => setDebtFilter('debt')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              debtFilter === 'debt' 
                ? 'bg-red-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Endettés ({users.filter(u => (userDebts[u.id] || 0) > 0).length})
          </button>
          <button
            onClick={() => setDebtFilter('clear')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              debtFilter === 'clear' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            À jour ({users.filter(u => (userDebts[u.id] || 0) === 0).length})
          </button>
        </div>
      </div>
      
      {filteredUsers.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">
            {searchTerm || debtFilter !== 'all' 
              ? 'Aucun utilisateur ne correspond aux critères de recherche.' 
              : 'Aucun utilisateur trouvé.'}
          </p>
        </div>
      ) : (
        filteredUsers.map((user) => {
          const userDebt = userDebts[user.id] || 0
          return (
            <div
              key={user.id}
              className="card hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => {
                setSelectedUser(user)
                fetchUserOrders(user.id)
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium">{user.full_name}</h3>
                    <div className="flex items-center space-x-2">
                      {userDebt > 0 ? (
                        <span className="text-sm font-medium text-red-600">
                          Dette: {userDebt.toFixed(2)} €
                        </span>
                      ) : (
                        <span className="text-sm text-green-600">
                          Compte à jour
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {user.role === 'admin' && (
                    <Shield size={16} className="text-primary-500" />
                  )}
                  <span className="text-gray-400">→</span>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}