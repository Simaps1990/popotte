import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowLeft, Printer, Mail, Package, CreditCard, User, MapPin, Calendar } from 'lucide-react';

type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'shipped' | 'delivered';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  date: string;
  amount: number;
  status: OrderStatus;
  items: OrderItem[];
  shippingAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
  notes?: string;
}

export function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        // Simulation de chargement des données
        // En production, remplacer par un appel API réel
        // const response = await fetch(`/api/orders/${orderId}`);
        // const data = await response.json();
        
        // Données de démonstration
        const mockOrder: Order = {
          id: orderId || '1',
          orderNumber: `CMD-2023-${orderId?.padStart(3, '0') || '001'}`,
          customerName: 'Jean Dupont',
          customerEmail: 'jean.dupont@example.com',
          date: '2023-06-15T10:30:00',
          amount: 45.99,
          status: 'pending',
          paymentMethod: 'Carte bancaire',
          shippingAddress: {
            street: '123 Rue de la Paix',
            city: 'Paris',
            postalCode: '75001',
            country: 'France'
          },
          notes: 'Livrer avant 18h',
          items: [
            { id: '1', name: 'Produit 1', quantity: 2, price: 20 },
            { id: '2', name: 'Produit 2', quantity: 1, price: 5.99 }
          ]
        };
        
        setOrder(mockOrder);
      } catch (error) {
        console.error('Erreur lors du chargement de la commande', error);
        setError('Impossible de charger les détails de la commande');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" /> Payée
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <Package className="w-4 h-4 mr-1" /> Expédiée
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
            <CheckCircle className="w-4 h-4 mr-1" /> Livrée
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" /> Annulée
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" /> En attente
          </span>
        );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    // Logique pour envoyer un email
    alert('Fonctionnalité d\'envoi d\'email à implémenter');
  };

  const handleStatusChange = async (newStatus: OrderStatus) => {
    try {
      // Ici, vous devriez faire un appel API pour mettre à jour le statut
      // await fetch(`/api/orders/${orderId}/status`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: newStatus })
      // });
      
      // Mise à jour locale pour l'exemple
      if (order) {
        setOrder({ ...order, status: newStatus });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              {error || 'Commande introuvable'}
            </p>
            <button
              onClick={() => navigate(-1)}
              className="mt-2 text-sm text-red-600 hover:text-red-500 font-medium"
            >
              ← Retour à la liste des commandes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:p-0">
      {/* En-tête avec boutons d'action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour aux commandes
        </button>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Printer className="w-4 h-4 mr-2" /> Imprimer
          </button>
          <button
            onClick={handleSendEmail}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Mail className="w-4 h-4 mr-2" /> Envoyer par email
          </button>
          
          {order.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusChange('cancelled')}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Annuler la commande
              </button>
              <button
                onClick={() => handleStatusChange('paid')}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Marquer comme payée
              </button>
            </div>
          )}
          
          {order.status === 'paid' && (
            <button
              onClick={() => handleStatusChange('shipped')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Marquer comme expédiée
            </button>
          )}
          
          {order.status === 'shipped' && (
            <button
              onClick={() => handleStatusChange('delivered')}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              Marquer comme livrée
            </button>
          )}
        </div>
      </div>

      {/* Carte principale */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg print:shadow-none">
        {/* En-tête de la commande */}
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Commande #{order.orderNumber}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Passée le {new Date(order.date).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              {getStatusBadge(order.status)}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <dl>
            {/* Informations client */}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Client</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-gray-500">{order.customerEmail}</p>
                  </div>
                </div>
              </dd>
            </div>

            {/* Adresse de livraison */}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Adresse de livraison</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{order.shippingAddress.street}</p>
                    <p>{order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </div>
              </dd>
            </div>

            {/* Méthode de paiement */}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Paiement</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 text-gray-400 mr-2" />
                  <span>{order.paymentMethod}</span>
                </div>
              </dd>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <p className="italic">{order.notes}</p>
                </dd>
              </div>
            )}

            {/* Articles commandés */}
            <div className="bg-gray-50 px-4 py-5 sm:px-6">
              <h4 className="text-sm font-medium text-gray-500 mb-4">ARTICLES COMMANDÉS</h4>
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Article
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prix unitaire
                      </th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantité
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {item.image ? (
                              <div className="flex-shrink-0 h-10 w-10">
                                <img className="h-10 w-10 rounded-md" src={item.image} alt={item.name} />
                              </div>
                            ) : (
                              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center text-gray-400">
                                <Package className="w-5 h-5" />
                              </div>
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">#{index + 1}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {item.price.toFixed(2)} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {(item.quantity * item.price).toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <th colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Sous-total
                      </th>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        {order.amount.toFixed(2)} €
                      </td>
                    </tr>
                    <tr>
                      <th colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Livraison
                      </th>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                        {order.amount > 50 ? 'Gratuite' : '5.00 €'}
                      </td>
                    </tr>
                    <tr>
                      <th colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-900 uppercase tracking-wider border-t border-gray-200">
                        Total
                      </th>
                      <td className="px-6 py-3 text-right text-base font-bold text-gray-900 border-t border-gray-200">
                        {(order.amount > 50 ? order.amount : order.amount + 5).toFixed(2)} €
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </dl>
        </div>
      </div>
      
      {/* Pied de page pour l'impression */}
      <div className="hidden print:block mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>Merci pour votre confiance !</p>
        <p className="mt-1">Pour toute question concernant votre commande, veuillez contacter notre service client.</p>
      </div>
    </div>
  );
}

export default OrderDetail;
