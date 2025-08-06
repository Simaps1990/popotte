import React, { useEffect, useState } from 'react'
import { Plus, Minus, ShoppingCart, Package } from 'lucide-react'
import { getProducts, getCategories, createOrder } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Product, Category } from '../lib/mockData'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'react-hot-toast'
import { usePageReload } from '../hooks/usePageReload'

interface CartItem {
  product: Product
  quantity: number
  selectedVariant?: string
}

// Le hook personnalisé a été déplacé dans src/hooks/usePageReload.ts

export function Commande() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Array<Category & { id: string }>>([]) 
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Utiliser le hook pour forcer le rechargement à chaque visite
  const lastVisit = usePageReload()

  // Fonction pour charger toutes les données
  const fetchAllData = async () => {
    await Promise.all([
      fetchProducts(),
      fetchCategories()
    ]);
  };

  // Chargement initial et abonnements temps réel
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    // Chargement initial sans notification
    fetchAllData().then(() => {
      if (isMounted) {
        setLoading(false);
      }
    });
    
    // Abonnements temps réel pour les produits et catégories
    const productChannel = supabase.channel('commande_products_changes');
    const categoryChannel = supabase.channel('commande_categories_changes');
    
    // Abonnement aux changements de produits avec priorité élevée
    productChannel
      .on('postgres_changes', 
        { 
          event: '*',
          schema: 'public',
          table: 'products'
        }, 
        (payload: any) => {
          if (isMounted) {
            // Mise à jour instantanée des produits avec priorité
            fetchProducts();
            
            // Notification discrète pour l'utilisateur
            if (payload.eventType === 'UPDATE') {
              toast.success('Produits mis à jour', { duration: 2000 });
            }
          }
        }
      )
      .subscribe((status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => {
        if (status === 'SUBSCRIBED' && isMounted) {
          // Forcer une synchronisation immédiate après l'abonnement
          fetchProducts();
        }
      });
      
    // Abonnement aux changements de catégories
    categoryChannel
      .on('postgres_changes', 
        { 
          event: '*',
          schema: 'public',
          table: 'categories'
        }, 
        (payload: any) => {
          if (isMounted) {
            // Mise à jour instantanée des catégories
            fetchCategories();
            
            if (payload.eventType === 'UPDATE') {
              toast.success('Menu mis à jour', { duration: 2000 });
            }
          }
        }
      )
      .subscribe((status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => {
        if (status === 'SUBSCRIBED' && isMounted) {
          // Forcer une synchronisation immédiate après l'abonnement
          fetchCategories();
        }
      });
    
    // Nettoyage lors du démontage
    return () => {
      isMounted = false;
      productChannel.unsubscribe();
      categoryChannel.unsubscribe();
    };
  }, [lastVisit]) // Recharger les données à chaque visite de la page

  const fetchProducts = async () => {
    try {
      const data = await getProducts()
      setProducts(data as Product[])
    } catch (error) {
      toast.error('Erreur lors de la récupération des produits')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data as Array<Category & { id: string }>)
    } catch (error) {
      toast.error('Erreur lors de la récupération des catégories')
    }
  }

  const addToCart = (product: Product, variant?: string) => {
    setCart((prev: CartItem[]) => {
      const existingItem = prev.find(item => 
        item.product.id === product.id && item.selectedVariant === variant
      )
      
      if (existingItem) {
        // Vérifier le stock disponible
        const availableStock = getAvailableStock(product, variant)
        if (availableStock !== null && existingItem.quantity >= availableStock) {
          alert(`Stock insuffisant. Disponible: ${availableStock}`)
          return prev
        }
        
        return prev.map(item =>
          item.product.id === product.id && item.selectedVariant === variant
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      
      // Vérifier le stock pour un nouvel article
      const availableStock = getAvailableStock(product, variant)
      if (availableStock !== null && availableStock <= 0) {
        alert('Produit en rupture de stock')
        return prev
      }
      
      return [
        ...prev,
        {
          product,
          quantity: 1,
          selectedVariant: variant
        }
      ]
    })
  }

  const removeFromCart = (productId: string, variant?: string) => {
    setCart((prev: CartItem[]) => {
      const existingItem = prev.find((item: CartItem) => 
        item.product.id === productId && 
        (!variant || item.selectedVariant === variant)
      )
      
      if (existingItem && existingItem.quantity > 1) {
        return prev.map((item: CartItem) =>
          item === existingItem
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      }
      
      return prev.filter((item: CartItem) => 
        !(item.product.id === productId && 
          (!variant || item.selectedVariant === variant))
      )
    })
  }

  const getCartItemCount = (productId: string, variant?: string): number => {
    const item = cart.find(
      (item: CartItem) => item.product.id === productId && 
      (!variant || item.selectedVariant === variant)
    )
    return item ? item.quantity : 0
  }

  const getAvailableStock = (product: Product, variant?: string) => {
    if (!product.stock_enabled) return null
    
    if (product.stock_variants && variant) {
      const variantStock = product.stock_variants.find(v => v.name === variant)
      return variantStock ? variantStock.quantity : 0
    }
    
    return product.stock_quantity || 0
  }

  const getCartTotal = (): number => {
    return cart.reduce((total: number, item: CartItem) => total + (item.product.price * item.quantity), 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) return
    if (!user) {
      alert('Vous devez être connecté pour passer une commande')
      return
    }

    // Sauvegarde du panier actuel pour restauration en cas d'erreur
    const currentCart = [...cart]
    const totalAmount = getCartTotal()
    
    // Mise à jour optimiste de l'interface utilisateur
    setSubmitting(true)
    
    // Vider le panier immédiatement pour donner un retour visuel instantané
    setCart([])
    
    try {
      const items = currentCart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price
        // Le champ variant a été supprimé car il n'est pas nécessaire dans la table order_items
      }))

      // Appel au service de création de commande
      await createOrder({
        user_id: user.id,
        total_amount: totalAmount,
        items
      })

      // Notification de succès avec message personnalisé selon le montant
      let successMessage = '';
      if (totalAmount < 2) {
        successMessage = "Commande validée, t'aurais pu proposer aux copains...";
      } else if (totalAmount < 5) {
        successMessage = "Commande validée, rajoutes au moins un saucisson radin !";
      } else if (totalAmount < 20) {
        successMessage = "Commande validée, la main dessus !";
      } else {
        successMessage = "Commande validée, voilà ça c'est une vraie tournée !!";
      }
      
      toast.success(successMessage, { duration: 5000 });
    } catch (error) {
      console.error('Error submitting order:', error)
      
      // Restaurer le panier en cas d'erreur
      setCart(currentCart)
      
      alert('Une erreur est survenue lors de la validation de la commande.')
    } finally {
      setSubmitting(false)
    }
  }

  // Grouper les produits par catégorie dans l'ordre défini
  let groupedProducts = categories.reduce((acc, category) => {
    const categoryProducts = products
      .filter(p => p.category_id === category.id)
      .filter(p => p.is_available) // Filtrer les produits indisponibles dès le début
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    if (categoryProducts.length > 0) {
      acc[category.name] = categoryProducts
    }
    return acc
  }, {} as Record<string, Product[]>)

  // Ajouter les produits sans catégorie à la fin
  const uncategorizedProducts = products
    .filter(p => !p.category_id)
    .filter(p => p.is_available) // Filtrer les produits indisponibles
  if (uncategorizedProducts.length > 0) {
    groupedProducts['Sans catégorie'] = uncategorizedProducts
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Commander</h1>
      </div>

      {/* Barre de recherche et filtres */}
      {/* Interface de recherche et de filtre supprimée */}

      {Object.keys(groupedProducts).length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">Aucun produit disponible.</p>
        </div>
      ) : (
        Object.entries(groupedProducts).map(([category, categoryProducts]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">{category}</h2>
          
          <div className="space-y-3">
            {categoryProducts.map((product) => (
              <div key={product.id} className="w-full">
                {/* Produit avec gestion de stock par variantes */}
                {product.stock_enabled && product.stock_variants && product.stock_variants.length > 0 ? (
                  <div className="card">
                    <div className="flex space-x-3 mb-4">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">{product.name}</h3>
                        {product.description && (
                          <p className="text-sm text-gray-500 mb-2">{product.description}</p>
                        )}
                        <p className="text-lg font-semibold text-primary-600">{product.price.toFixed(2)} €</p>
                      </div>
                    </div>
                    
                    {/* Variantes avec stock */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                        <Package size={16} />
                        <span>Choisir une taille/variante :</span>
                      </h4>
                      
                      {product.stock_variants.map((variant) => {
                        const quantity = getCartItemCount(product.id, variant.name)
                        const isOutOfStock = variant.quantity <= 0
                        const isLowStock = variant.quantity <= 3 && variant.quantity > 0
                        
                        return (
                          <div key={variant.name} className={`flex items-center justify-between p-3 border rounded-lg ${
                            isOutOfStock ? ' border-gray-200' : 'border-gray-300'
                          }`}>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{variant.name}</span>
                                {isOutOfStock ? (
                                  <span className="text-xs text-red-600 font-medium">
                                    Rupture de stock
                                  </span>
                                ) : isLowStock ? (
                                  <span className="text-xs text-orange-600 font-medium">
                                    Plus que {variant.quantity}
                                  </span>
                                ) : (
                                  <span className="text-xs text-green-600 font-medium">
                                    {variant.quantity} disponibles
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => removeFromCart(product.id, variant.name)}
                                className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors disabled:opacity-50"
                                disabled={quantity === 0 || isOutOfStock}
                              >
                                <Minus size={14} />
                              </button>
                              
                              <span className="w-6 text-center font-medium text-sm">
                                {quantity}
                              </span>
                              
                              <button
                                onClick={() => addToCart(product, variant.name)}
                                className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-50"
                                disabled={isOutOfStock || quantity >= variant.quantity}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  /* Produit standard (avec ou sans stock simple) */
                  <div className="card flex items-center justify-between w-full">
                    <div className="flex space-x-3 flex-1">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium">{product.name}</h3>
                        </div>
                        {product.description && (
                          <p className="text-sm text-gray-500">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-semibold text-primary-600">{product.price.toFixed(2)} €</p>
                          {product.stock_enabled && (
                            <div className="ml-2">
                              {product.stock_quantity === 0 ? (
                                <span className="text-xs text-red-600 font-medium">
                                  Rupture de stock
                                </span>
                              ) : product.stock_quantity && product.stock_quantity <= 3 ? (
                                <span className="text-xs text-orange-600 font-medium">
                                  Plus que {product.stock_quantity}
                                </span>
                              ) : (
                                <span className="text-xs text-green-600 font-medium">
                                  {product.stock_quantity} en stock
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 self-start">
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors disabled:opacity-50"
                        disabled={getCartItemCount(product.id) === 0}
                      >
                        <Minus size={18} />
                      </button>
                      
                      <span className="w-8 text-center font-bold text-lg flex items-center justify-center">
                        {getCartItemCount(product.id)}
                      </span>
                      
                      <button
                        onClick={() => addToCart(product)}
                        className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-50"
                        disabled={
                          product.stock_enabled && 
                          product.stock_quantity !== undefined && 
                          (product.stock_quantity === 0 || getCartItemCount(product.id) >= product.stock_quantity)
                        }
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        ))
      )}

      {/* Ajouter un espace supplémentaire en bas de la page */}
      <div className="pb-8"></div>

      {cart.length > 0 && (
        <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={cart.length === 0 || submitting || !user}
            className="btn-primary flex items-center space-x-3 shadow-xl disabled:opacity-50 px-6 py-3 rounded-lg text-white font-medium text-lg"
            type="button"
          >
            <ShoppingCart size={24} />
            <span>
              {!user 
                ? 'Connectez-vous pour commander' 
                : submitting 
                  ? 'Validation...' 
                  : `Valider (${getCartTotal().toFixed(2)} €)`
              }
            </span>
          </button>
        </div>
      )}
    </div>
  )
}