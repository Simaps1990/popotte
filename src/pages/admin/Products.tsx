import React, { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Save, X, FolderPlus, Check, ChevronUp, ChevronDown } from 'lucide-react'
import { mockDatabase } from '../../lib/mockDatabase'
import { ImageUpload } from '../../components/ImageUpload'
import type { Product, Category } from '../../lib/mockData'

export function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [productFormData, setProductFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    is_available: true,
    stock_enabled: false,
    stock_quantity: '',
    stock_variants: [] as Array<{ name: string; quantity: number }>
  })
  const [categoryFormData, setCategoryFormData] = useState({
    name: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const data = await mockDatabase.getProducts()
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

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const productData = {
        name: productFormData.name,
        description: productFormData.description || null,
        price: parseFloat(productFormData.price),
        category_id: productFormData.category_id || null,
        image_url: productFormData.image_url || null,
        is_available: productFormData.is_available,
        stock_enabled: productFormData.stock_enabled,
        stock_quantity: productFormData.stock_enabled && !productFormData.stock_variants.length 
          ? parseInt(productFormData.stock_quantity) || 0 
          : undefined,
        stock_variants: productFormData.stock_enabled && productFormData.stock_variants.length > 0 
          ? productFormData.stock_variants 
          : undefined
      }

      if (editingProduct) {
        await mockDatabase.updateProduct(editingProduct.id, productData)
      } else {
        await mockDatabase.createProduct(productData)
      }

      setProductFormData({
        name: '',
        description: '',
        price: '',
        category_id: '',
        image_url: '',
        is_available: true,
        stock_enabled: false,
        stock_quantity: '',
        stock_variants: []
      })
      setEditingProduct(null)
      setIsCreatingProduct(false)
      fetchProducts()
      alert(editingProduct ? 'Produit modifié !' : 'Produit créé !')
    } catch (error: any) {
      alert('Erreur : ' + error.message)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await mockDatabase.createCategory({
        name: categoryFormData.name
      })

      setCategoryFormData({ name: '' })
      setIsCreatingCategory(false)
      fetchCategories()
      alert('Catégorie créée !')
    } catch (error: any) {
      alert('Erreur : ' + error.message)
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category.id)
    setEditingCategoryName(category.name)
  }

  const handleSaveCategory = async (categoryId: string) => {
    try {
      await mockDatabase.updateCategory(categoryId, { name: editingCategoryName })
      setEditingCategory(null)
      setEditingCategoryName('')
      fetchCategories()
      fetchProducts() // Rafraîchir les produits pour mettre à jour les noms de catégories
      alert('Catégorie modifiée !')
    } catch (error: any) {
      alert('Erreur : ' + error.message)
    }
  }

  const handleCancelCategoryEdit = () => {
    setEditingCategory(null)
    setEditingCategoryName('')
  }

  const moveCategoryUp = async (categoryId: string) => {
    try {
      await mockDatabase.moveCategoryUp(categoryId)
      fetchCategories()
      fetchProducts()
    } catch (error: any) {
      alert('Erreur : ' + error.message)
    }
  }

  const moveCategoryDown = async (categoryId: string) => {
    try {
      await mockDatabase.moveCategoryDown(categoryId)
      fetchCategories()
      fetchProducts()
    } catch (error: any) {
      alert('Erreur : ' + error.message)
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category_id: product.category_id || '',
      image_url: product.image_url || '',
      is_available: product.is_available,
      stock_enabled: product.stock_enabled,
      stock_quantity: product.stock_quantity?.toString() || '',
      stock_variants: product.stock_variants || []
    })
    setIsCreatingProduct(true)
    
    // Scroll vers le haut du formulaire
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return

    try {
      await mockDatabase.deleteProduct(productId)
      fetchProducts()
      alert('Produit supprimé !')
    } catch (error: any) {
      alert('Erreur : ' + error.message)
    }
  }

  const handleCancelProduct = () => {
    setProductFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      image_url: '',
      is_available: true,
      stock_enabled: false,
      stock_quantity: '',
      stock_variants: []
    })
    setEditingProduct(null)
    setIsCreatingProduct(false)
  }

  const handleCancelCategory = () => {
    setCategoryFormData({ name: '' })
    setIsCreatingCategory(false)
  }

  const addStockVariant = () => {
    setProductFormData({
      ...productFormData,
      stock_variants: [...productFormData.stock_variants, { name: '', quantity: 0 }]
    })
  }

  const updateStockVariant = (index: number, field: 'name' | 'quantity', value: string | number) => {
    const updatedVariants = [...productFormData.stock_variants]
    updatedVariants[index] = { ...updatedVariants[index], [field]: value }
    setProductFormData({ ...productFormData, stock_variants: updatedVariants })
  }

  const removeStockVariant = (index: number) => {
    const updatedVariants = productFormData.stock_variants.filter((_, i) => i !== index)
    setProductFormData({ ...productFormData, stock_variants: updatedVariants })
  }

  // Grouper les produits par catégorie
  const groupedProducts = categories.reduce((acc, category) => {
    const categoryProducts = products.filter(p => p.category_id === category.id)
    if (categoryProducts.length > 0) {
      acc[category.name] = categoryProducts
    }
    return acc
  }, {} as Record<string, Product[]>)

  // Ajouter les produits sans catégorie à la fin
  const uncategorizedProducts = products
    .filter(p => !p.category_id)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
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
      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-700">
          💡 Mode démonstration - Les produits et catégories sont stockés temporairement.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {!isCreatingProduct && !isCreatingCategory && (
            <>
              <button
                onClick={() => setIsCreatingProduct(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Nouveau produit</span>
              </button>
              <button
                onClick={() => setIsCreatingCategory(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <FolderPlus size={20} />
                <span>Nouvelle catégorie</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Formulaire de création/modification de catégorie */}
      {isCreatingCategory && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Nouvelle catégorie</h3>
            <button
              onClick={handleCancelCategory}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div>
              <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">
                Nom de la catégorie
              </label>
              <input
                id="categoryName"
                type="text"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ name: e.target.value })}
                className="input mt-1"
                required
              />
            </div>

            <div className="flex space-x-2">
              <button type="submit" className="btn-primary flex items-center space-x-2">
                <Save size={20} />
                <span>Créer</span>
              </button>
              <button
                type="button"
                onClick={handleCancelCategory}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Formulaire de création/modification de produit */}
      {isCreatingProduct && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </h3>
            <button
              onClick={handleCancelProduct}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nom du produit
              </label>
              <input
                id="name"
                type="text"
                value={productFormData.name}
                onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                className="input mt-1"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (optionnel)
              </label>
              <textarea
                id="description"
                value={productFormData.description}
                onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                className="input mt-1 h-20 resize-none"
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Prix (€)
              </label>
              <input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={productFormData.price}
                onChange={(e) => setProductFormData({ ...productFormData, price: e.target.value })}
                className="input mt-1"
                required
              />
            </div>

            <div>
              <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                Catégorie
              </label>
              <select
                id="category_id"
                value={productFormData.category_id}
                onChange={(e) => setProductFormData({ ...productFormData, category_id: e.target.value })}
                className="input mt-1"
              >
                <option value="">Aucune catégorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image du produit
              </label>
              <ImageUpload
                value={productFormData.image_url}
                onChange={(imageData) => setProductFormData({ ...productFormData, image_url: imageData || '' })}
                placeholder="Ajouter une image du produit"
              />
            </div>

            <div className="flex items-center">
              <input
                id="is_available"
                type="checkbox"
                checked={productFormData.is_available}
                onChange={(e) => setProductFormData({ ...productFormData, is_available: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900">
                Produit disponible
              </label>
            </div>

            {/* Gestion du stock */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center">
                <input
                  id="stock_enabled"
                  type="checkbox"
                  checked={productFormData.stock_enabled}
                  onChange={(e) => setProductFormData({ 
                    ...productFormData, 
                    stock_enabled: e.target.checked,
                    stock_quantity: '',
                    stock_variants: []
                  })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="stock_enabled" className="ml-2 block text-sm text-gray-900">
                  Activer la gestion de stock
                </label>
              </div>

              {productFormData.stock_enabled && (
                <div className="space-y-4 ml-6 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Type de stock
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="stockType"
                          checked={productFormData.stock_variants.length === 0}
                          onChange={() => setProductFormData({ ...productFormData, stock_variants: [] })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">Stock simple (quantité unique)</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="stockType"
                          checked={productFormData.stock_variants.length > 0}
                          onChange={() => {
                            if (productFormData.stock_variants.length === 0) {
                              addStockVariant()
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-900">Stock par taille/variante</span>
                      </label>
                    </div>
                  </div>

                  {productFormData.stock_variants.length === 0 ? (
                    <div>
                      <label htmlFor="stock_quantity" className="block text-sm font-medium text-gray-700">
                        Quantité en stock
                      </label>
                      <input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        value={productFormData.stock_quantity}
                        onChange={(e) => setProductFormData({ ...productFormData, stock_quantity: e.target.value })}
                        className="input mt-1"
                        placeholder="Ex: 10"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          Variantes et stock
                        </label>
                        <button
                          type="button"
                          onClick={addStockVariant}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          + Ajouter une variante
                        </button>
                      </div>
                      
                      {productFormData.stock_variants.map((variant, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => updateStockVariant(index, 'name', e.target.value)}
                            className="input flex-1"
                            placeholder="Ex: Taille M"
                          />
                          <input
                            type="number"
                            min="0"
                            value={variant.quantity}
                            onChange={(e) => updateStockVariant(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="input w-20"
                            placeholder="Qté"
                          />
                          <button
                            type="button"
                            onClick={() => removeStockVariant(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <button type="submit" className="btn-primary flex items-center space-x-2">
                <Save size={20} />
                <span>{editingProduct ? 'Modifier' : 'Créer'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelProduct}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des produits groupés par catégorie */}
      <div className="space-y-6">
        {Object.keys(groupedProducts).length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-500">Aucun produit trouvé.</p>
          </div>
        ) : (
          Object.entries(groupedProducts).map(([categoryName, categoryProducts]) => (
            <div key={categoryName} className="space-y-4">
              <div className="flex items-center space-x-2 group bg-gray-50 p-3 rounded-lg">
                {editingCategory === categories.find(c => c.name === categoryName)?.id ? (
                  <div className="flex items-center space-x-2 flex-1">
                    <input
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="input text-lg font-semibold flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const categoryId = categories.find(c => c.name === categoryName)?.id
                          if (categoryId) handleSaveCategory(categoryId)
                        }
                        if (e.key === 'Escape') {
                          handleCancelCategoryEdit()
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        const categoryId = categories.find(c => c.name === categoryName)?.id
                        if (categoryId) handleSaveCategory(categoryId)
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={handleCancelCategoryEdit}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 
                      className="text-lg font-semibold text-gray-800 flex-1 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => {
                        const category = categories.find(c => c.name === categoryName)
                        if (category && categoryName !== 'Sans catégorie') handleEditCategory(category)
                      }}
                    >
                      {categoryName}
                    </h2>
                    {categoryName !== 'Sans catégorie' && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            const category = categories.find(c => c.name === categoryName)
                            if (category) moveCategoryUp(category.id)
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Monter la catégorie"
                        >
                          <ChevronUp size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const category = categories.find(c => c.name === categoryName)
                            if (category) moveCategoryDown(category.id)
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Descendre la catégorie"
                        >
                          <ChevronDown size={18} />
                        </button>
                        <button
                          onClick={() => {
                            const category = categories.find(c => c.name === categoryName)
                            if (category) handleEditCategory(category)
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier la catégorie"
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    )}
                  </>
                )}
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {categoryProducts.length} produit{categoryProducts.length > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="space-y-3 ml-4">
                {categoryProducts.map((product) => (
                  <div key={product.id} className="card">
                    <div className="flex justify-between items-start">
                      <div className="flex space-x-4 flex-1">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium">{product.name}</h3>
                            {!product.is_available && (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                Indisponible
                              </span>
                            )}
                          </div>
                          
                          {product.description && (
                            <p className="text-gray-600 mb-2">{product.description}</p>
                          )}
                          
                          <div className="text-lg font-semibold text-primary-600">
                            {product.price.toFixed(2)} €
                          </div>
                         
                         {/* Affichage du stock */}
                         {product.stock_enabled && (
                           <div className="mt-2">
                             {product.stock_variants && product.stock_variants.length > 0 ? (
                               <div className="space-y-1">
                                 <p className="text-xs font-medium text-gray-600">Stock par variante :</p>
                                 {product.stock_variants.map((variant, index) => (
                                   <div key={index} className="text-xs text-gray-500 flex justify-between">
                                     <span>{variant.name}</span>
                                     <span className={variant.quantity === 0 ? 'text-red-600 font-medium' : variant.quantity <= 3 ? 'text-orange-600 font-medium' : 'text-green-600'}>
                                       {variant.quantity === 0 ? 'Rupture' : `${variant.quantity} dispo`}
                                     </span>
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <p className={`text-xs ${
                                 product.stock_quantity === 0 ? 'text-red-600 font-medium' : 
                                 (product.stock_quantity || 0) <= 3 ? 'text-orange-600 font-medium' : 
                                 'text-green-600'
                               }`}>
                                 Stock: {product.stock_quantity === 0 ? 'Rupture' : `${product.stock_quantity} disponibles`}
                               </p>
                             )}
                           </div>
                         )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}