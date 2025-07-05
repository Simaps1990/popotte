import React, { useEffect, useState } from 'react'
import { Plus, Minus, ShoppingCart, Package, Search, Filter } from 'lucide-react'
import { mockDatabase } from '../lib/mockDatabase'
import { useAuth } from '../contexts/AuthContext'
import type { Product } from '../lib/mockData'

interface CartItem {
  product: Product
  quantity: number
  selectedVariant?: string
}

export function Commande() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const data = await mockDatabase.getProducts(true)
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await mockDatabase.getCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const addToCart = (product: Product, variant?: string) => {
    setCart(prev => {
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
      
      return [...prev, { product, quantity: 1, selectedVariant: variant }]
    })
  }

  const removeFromCart = (productId: string, variant?: string) => {
    setCart(prev => {
      const existingItem = prev.find(item => 
        item.product.id === productId && item.selectedVariant === variant
      )
      
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(item =>
          item.product.id === productId && item.selectedVariant === variant
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      }
      
      return prev.filter(item => 
        !(item.product.id === productId && item.selectedVariant === variant)
      )
    })
  }

  const getQuantity = (productId: string, variant?: string) => {
    const item = cart.find(item => 
      item.product.id === productId && item.selectedVariant === variant
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

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0)
  }

  const submitOrder = async () => {
    if (!user || cart.length === 0) {
      if (!user) {
        alert('Vous devez être connecté pour passer une commande')
        return
      }
      return
    }

    setSubmitting(true)
    try {
      const totalAmount = getTotalAmount()
      const items = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        variant: item.selectedVariant
      }))

      await mockDatabase.createOrder({
        user_id: user.id,
        total_amount: totalAmount,
        items
      })

      setCart([])
      alert('Commande validée avec succès !')
    } catch (error) {
      console.error('Error submitting order:', error)
      alert('Erreur lors de la validation de la commande')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtrer les produits selon la recherche et la catégorie
  const filterProducts = (categoryProducts: Product[]) => {
    return categoryProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      return matchesSearch
    })
  }

  // Grouper les produits par catégorie dans l'ordre défini
  let groupedProducts = categories.reduce((acc, category) => {
    const categoryProducts = products
      .filter(p => p.category_id === category.id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    if (categoryProducts.length > 0) {
      acc[category.name] = categoryProducts
    }
    return acc
  }, {} as Record<string, Product[]>)

  // Ajouter les produits sans catégorie à la fin
  const uncategorizedProducts = products.filter(p => !p.category_id)
  if (uncategorizedProducts.length > 0) {
    groupedProducts['Sans catégorie'] = uncategorizedProducts
  }

  // Appliquer les filtres
  if (selectedCategory !== 'all') {
    // Filtrer par catégorie sélectionnée
    const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name || selectedCategory
    if (groupedProducts[selectedCategoryName]) {
      groupedProducts = { [selectedCategoryName]: filterProducts(groupedProducts[selectedCategoryName]) }
    } else {
      groupedProducts = {}
    }
  } else if (searchTerm) {
    // Appliquer la recherche à toutes les catégories
    Object.keys(groupedProducts).forEach(categoryName => {
      const filteredProducts = filterProducts(groupedProducts[categoryName])
      if (filteredProducts.length > 0) {
        groupedProducts[categoryName] = filteredProducts
      } else {
        delete groupedProducts[categoryName]
      }
    })
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
        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
          Mode démo
        </div>
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700">
          💡 Produits de démonstration. Toutes les commandes sont simulées.
        </p>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="space-y-4">
        {/* Recherche et filtre sur la même ligne */}
        <div className="flex space-x-3">
          {/* Barre de recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Menu déroulant catégorie */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="input pr-8 min-w-[140px] appearance-none bg-white"
            >
              <option value="all">Toutes catégories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
        </div>
        
        {/* Indicateur de résultats */}
        {(searchTerm || selectedCategory !== 'all') && (
          <div className="text-sm text-gray-600">
            {Object.keys(groupedProducts).length === 0 ? (
              <span className="text-red-600">Aucun produit trouvé</span>
            ) : (
              <span>
                {Object.values(groupedProducts).reduce((total, products) => total + products.length, 0)} produit(s) trouvé(s)
                {searchTerm && ` pour "${searchTerm}"`}
                {selectedCategory !== 'all' && ` dans ${categories.find(c => c.id === selectedCategory)?.name || selectedCategory}`}
              </span>
            )}
          </div>
        )}
      </div>

      {Object.keys(groupedProducts).length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-500">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Aucun produit ne correspond à vos critères de recherche.' 
              : 'Aucun produit disponible.'}
          </p>
          {(searchTerm || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
              }}
              className="mt-2 text-primary-500 hover:text-primary-600 text-sm"
            >
              Réinitialiser les filtres
            </button>
          )}
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
                        const quantity = getQuantity(product.id, variant.name)
                        const isOutOfStock = variant.quantity <= 0
                        const isLowStock = variant.quantity <= 3 && variant.quantity > 0
                        
                        return (
                          <div key={variant.name} className={`flex items-center justify-between p-3 border rounded-lg ${
                            isOutOfStock ? 'bg-gray-50 border-gray-200' : 'border-gray-300'
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
                    
                    <div className="flex items-center space-x-2 self-start">
                      <button
                        onClick={() => removeFromCart(product.id)}
                        className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors disabled:opacity-50"
                        disabled={getQuantity(product.id) === 0}
                      >
                        <Minus size={14} />
                      </button>
                      
                      <span className="w-6 text-center font-medium text-sm flex items-center justify-center">
                        {getQuantity(product.id)}
                      </span>
                      
                      <button
                        onClick={() => addToCart(product)}
                        className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-50"
                        disabled={
                          product.stock_enabled && 
                          product.stock_quantity !== undefined && 
                          (product.stock_quantity === 0 || getQuantity(product.id) >= product.stock_quantity)
                        }
                      >
                        <Plus size={14} />
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

      {cart.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={submitOrder}
            disabled={submitting}
            className="btn-primary flex items-center space-x-2 shadow-lg disabled:opacity-50"
          >
            <ShoppingCart size={20} />
            <span>Valider ({getTotalAmount().toFixed(2)} €)</span>
          </button>
        </div>
      )}
    </div>
  )
}