import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Users, 
  CreditCard, 
  FileText, 
  Package, 
  Bell, 
  User, 
  LogOut,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

// Données de démonstration pour les graphiques
const salesData = [
  { name: '2022', ventes: 4000 },
  { name: '2023', ventes: 6000 },
  { name: '2024', ventes: 8000 },
];

const financialData = [
  { name: 'Jan', revenus: 4000, dépenses: 2400 },
  { name: 'Fév', revenus: 3000, dépenses: 1398 },
  { name: 'Mar', revenus: 2000, dépenses: 9800 },
  { name: 'Avr', revenus: 2780, dépenses: 3908 },
  { name: 'Mai', revenus: 1890, dépenses: 4800 },
  { name: 'Juin', revenus: 2390, dépenses: 3800 },
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    pendingPayments: 0,
    totalSales: 0,
    activeDebts: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fonction pour récupérer les statistiques
  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Récupérer les statistiques depuis Supabase
      const [
        { count: usersCount },
        { count: productsCount },
        { count: pendingPayments },
        { data: salesData, error: salesError },
        { data: debtsData, error: debtsError }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('total').eq('status', 'completed'),
        supabase.from('debts').select('amount').eq('status', 'unpaid')
      ]);

      // Définir les types pour les données de réduction
      interface Order { total?: number }
      interface Debt { amount?: number }

      const totalSales = salesData?.reduce((sum: number, order: Order) => sum + (order.total || 0), 0) || 0;
      const totalDebts = debtsData?.reduce((sum: number, debt: Debt) => sum + (debt.amount || 0), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalProducts: productsCount || 0,
        pendingPayments: pendingPayments || 0,
        totalSales,
        activeDebts: totalDebts,
      });
      
      console.log('✅ [Dashboard] Statistiques mises à jour:', {
        totalUsers: usersCount || 0,
        totalProducts: productsCount || 0,
        pendingPayments: pendingPayments || 0,
        totalSales,
        activeDebts: totalDebts,
      });
    } catch (error) {
      console.error('❌ [Dashboard] Erreur lors de la récupération des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial et abonnements temps réel
  useEffect(() => {
    let isMounted = true;
    
    // Chargement initial
    fetchStats();
    
    // Abonnements temps réel pour toutes les tables critiques
    const subscriptions = [
      // Abonnement aux changements de profils (utilisateurs)
      supabase
        .channel('dashboard_profiles_changes')
        .on('postgres_changes', 
          { 
            event: '*',
            schema: 'public',
            table: 'profiles'
          }, 
          (payload: any) => {
            console.log('📡 [Dashboard] Changement de profil détecté:', payload);
            if (isMounted) {
              setTimeout(() => fetchStats(), 500); // Délai pour éviter les conflits
            }
          }
        )
        .subscribe(),
        
      // Abonnement aux changements de produits
      supabase
        .channel('dashboard_products_changes')
        .on('postgres_changes', 
          { 
            event: '*',
            schema: 'public',
            table: 'products'
          }, 
          (payload: any) => {
            console.log('📡 [Dashboard] Changement de produit détecté:', payload);
            if (isMounted) {
              setTimeout(() => fetchStats(), 500);
            }
          }
        )
        .subscribe(),
        
      // Abonnement aux changements de paiements
      supabase
        .channel('dashboard_payments_changes')
        .on('postgres_changes', 
          { 
            event: '*',
            schema: 'public',
            table: 'payments'
          }, 
          (payload: any) => {
            console.log('📡 [Dashboard] Changement de paiement détecté:', payload);
            if (isMounted) {
              setTimeout(() => fetchStats(), 500);
            }
          }
        )
        .subscribe(),
        
      // Abonnement aux changements de commandes
      supabase
        .channel('dashboard_orders_changes')
        .on('postgres_changes', 
          { 
            event: '*',
            schema: 'public',
            table: 'orders'
          }, 
          (payload: any) => {
            console.log('📡 [Dashboard] Changement de commande détecté:', payload);
            if (isMounted) {
              setTimeout(() => fetchStats(), 500);
            }
          }
        )
        .subscribe(),
        
      // Abonnement aux changements de dettes
      supabase
        .channel('dashboard_debts_changes')
        .on('postgres_changes', 
          { 
            event: '*',
            schema: 'public',
            table: 'debts'
          }, 
          (payload: any) => {
            console.log('📡 [Dashboard] Changement de dette détecté:', payload);
            if (isMounted) {
              setTimeout(() => fetchStats(), 500);
            }
          }
        )
        .subscribe()
    ];
    
    console.log('🔔 [Dashboard] Abonnements temps réel activés pour toutes les statistiques');
    
    // Nettoyage lors du démontage
    return () => {
      console.log('🔕 [Dashboard] Désabonnement de tous les canaux temps réel');
      isMounted = false;
      subscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });
    };
  }, []);

  const navigateTo = (path: string) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Tableau de bord administrateur</h1>
      
      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <>
        {/* Utilisateurs */}
        <div 
          className="bg-blue-500 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-blue-600 transition-colors"
          onClick={() => navigateTo('/admin/users')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Utilisateurs</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <Users size={32} />
          </div>
        </div>

        {/* Paiements en attente */}
        <div 
          className="bg-orange-500 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-orange-600 transition-colors"
          onClick={() => navigateTo('/admin/payments') }
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Paiements en attente</p>
              <p className="text-2xl font-bold">{stats.pendingPayments}</p>
            </div>
            <CreditCard size={32} />
          </div>
        </div>

        {/* Dettes actives */}
        <div 
          className="bg-red-500 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-red-600 transition-colors"
          onClick={() => navigateTo('/admin/debts')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dettes actives</p>
              <p className="text-2xl font-bold">{stats.activeDebts} €</p>
            </div>
            <AlertCircle size={32} />
          </div>
        </div>

        {/* Ventes totales */}
        <div 
          className="bg-green-500 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:bg-green-600 transition-colors"
          onClick={() => navigateTo('/admin/sales')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ventes totales</p>
              <p className="text-2xl font-bold">{stats.totalSales} €</p>
            </div>
            <DollarSign size={32} />
          </div>
        </div>
        </>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Statistiques financières */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Statistiques financières</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenus" fill="#4CAF50" name="Revenus" />
                <Bar dataKey="dépenses" fill="#F44336" name="Dépenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventes sur 3 ans */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Ventes confirmées sur 3 ans</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ventes" stroke="#2196F3" name="Ventes" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => navigateTo('/admin/users')}
            className="flex items-center justify-center p-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Users className="mr-2" /> Gérer les utilisateurs
          </button>
          <button 
            onClick={() => navigateTo('/admin/orders')}
            className="flex items-center justify-center p-4 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
          >
            <FileText className="mr-2" /> Voir les commandes
          </button>
          <button 
            onClick={() => navigateTo('/admin/products')}
            className="flex items-center justify-center p-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
          >
            <Package className="mr-2" /> Gérer les produits
          </button>
          <button 
            onClick={() => signOut()}
            className="flex items-center justify-center p-4 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LogOut className="mr-2" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
