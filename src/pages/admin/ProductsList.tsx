import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, ChevronUp, ChevronDown, PenSquare, Trash2, FolderPlus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Product, 
  Category, 
  ProductFormData, 
  CategoryFormData,
  StockVariant
} from '../../services/types';

interface CategoryWithProducts extends Category {
  products: Product[];
}



export function ProductsList() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Fonction pour basculer l'état d'expansion d'une catégorie
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };
  const [loading, setLoading] = useState(true);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '0',
    category_id: '',
    image_url: '',
    stock_enabled: false,
    stock_quantity: 0,
    is_available: true
  });
  
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    image_url: '',
    display_order: 0,
    slug: '',
    is_active: true
  } as CategoryFormData & { display_order: number });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Récupérer les catégories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (categoriesError) throw categoriesError;
      
      // Récupérer les produits
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (productsError) throw productsError;
      
      // Grouper les produits par catégorie
      const categoriesWithProducts = (categoriesData || []).map((category: Category) => ({
        ...category,
        products: (productsData || []).filter((p: Product) => p.category_id === category.id)
      }));
      
      setCategories(categoriesWithProducts);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: newProduct.name,
        description: newProduct.description || null,
        price: parseFloat(newProduct.price) || 0,
        category_id: newProduct.category_id || null,
        image_url: newProduct.image_url || null,
        stock_enabled: newProduct.stock_enabled || false,
        stock_quantity: newProduct.stock_enabled ? (newProduct.stock_quantity || 0) : 0,
        is_available: newProduct.is_available !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (editingProduct) {
        // Mise à jour d'un produit existant
        const { error } = await supabase
          .from('products')
          .update({
            ...productData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
        
        setShowNewProductForm(false);
        setEditingProduct(null);
        setNewProduct({
          name: '',
          description: '',
          price: '0',
          category_id: '',
          image_url: '',
          stock_enabled: false,
          stock_quantity: 0,
          is_available: true
        });
      } 
      // Sinon, c'est un nouvel ajout
      else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        
        setShowNewProductForm(false);
        setNewProduct({
          name: '',
          description: '',
          price: '0',
          category_id: '',
          image_url: '',
          stock_enabled: false,
          stock_quantity: 0,
          is_available: true
        });
      }
      
      await loadData();
      
    } catch (error) {
      console.error('Erreur lors de l\'ajout du produit:', error);
      alert('Erreur lors de l\'ajout du produit');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let displayOrder = newCategory.display_order;
      
      if (!editingCategory) {
        // Pour une nouvelle catégorie, trouver l'ordre d'affichage maximum actuel
        const { data: maxOrderData, error: maxOrderError } = await supabase
          .from('categories')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1);
        
        if (maxOrderError) throw maxOrderError;
        
        displayOrder = maxOrderData && maxOrderData.length > 0 
          ? maxOrderData[0].display_order + 1 
          : 1;
      }
      
      const categoryData = {
        name: newCategory.name,
        description: newCategory.description || null,
        image_url: newCategory.image_url || null,
        display_order: displayOrder,
        updated_at: new Date().toISOString()
      };
      
      if (editingCategory) {
        // Mise à jour d'une catégorie existante
        const { error } = await supabase
          .from('categories')
          .update({
            ...categoryData,
            created_at: undefined // Ne pas mettre à jour la date de création
          })
          .eq('id', editingCategory.id);
        
        if (error) throw error;
      } else {
        // Création d'une nouvelle catégorie
        const { error } = await supabase
          .from('categories')
          .insert([{
            ...categoryData,
            created_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
      }
      
      // Réinitialiser le formulaire
      setNewCategory({
        name: '',
        description: '',
        image_url: '',
        display_order: 0,
        slug: '',
        is_active: true
      } as CategoryFormData & { display_order: number });
      
      setShowNewCategoryForm(false);
      setEditingCategory(null);
      await loadData();
      
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la catégorie:', error);
      alert('Erreur lors de l\'ajout de la catégorie');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);
        
        if (error) throw error;
        
        await loadData();
      } catch (error) {
        console.error('Erreur lors de la suppression du produit:', error);
        alert('Erreur lors de la suppression du produit');
      }
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Tous les produits associés seront également supprimés.')) {
      try {
        // Supprimer d'abord les produits de cette catégorie
        const { error: productError } = await supabase
          .from('products')
          .delete()
          .eq('category_id', categoryId);
        
        if (productError) throw productError;
        
        // Puis supprimer la catégorie
        const { error: categoryError } = await supabase
          .from('categories')
          .delete()
          .eq('id', categoryId);
        
        if (categoryError) throw categoryError;
        
        await loadData();
      } catch (error) {
        console.error('Erreur lors de la suppression de la catégorie:', error);
        alert('Erreur lors de la suppression de la catégorie');
      }
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <main className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          {/* En-tête avec titre et bouton retour */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des produits</h1>
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-primary-500 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour</span>
            </button>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowNewProductForm(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau produit</span>
              </button>
              <button 
                onClick={() => setShowNewCategoryForm(true)}
                className="btn-secondary flex items-center space-x-2"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Nouvelle catégorie</span>
              </button>
            </div>
          </div>

          {/* Liste des catégories et produits */}
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category.id} className="space-y-4">
                {/* En-tête de catégorie */}
                <div className="flex items-center space-x-2 group bg-gray-50 p-3 rounded-lg">
                  <h2 className="text-lg font-semibold text-gray-800 flex-1 cursor-pointer hover:text-blue-600 transition-colors">
                    {category.name.toUpperCase()}
                  </h2>
                  <div className="flex items-center space-x-1">
                    <button 
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Monter la catégorie"
                    >
                      <ChevronUp 
                      className="w-4 h-4"
                      onClick={async () => {
                        try {
                          // Logique pour monter la catégorie
                          const currentIndex = categories.findIndex(c => c.id === category.id);
                          if (currentIndex > 0) {
                            const prevCategory = categories[currentIndex - 1];
                            const currentOrder = category.display_order;
                            const prevOrder = prevCategory.display_order;
                            
                            // Échanger les ordres d'affichage
                            await supabase
                              .from('categories')
                              .update({ display_order: prevOrder })
                              .eq('id', category.id);
                              
                            await supabase
                              .from('categories')
                              .update({ display_order: currentOrder })
                              .eq('id', prevCategory.id);
                              
                            await loadData();
                          }
                        } catch (error) {
                          console.error('Erreur lors du déplacement de la catégorie:', error);
                        }
                      }}
                    />
                    </button>
                    <button 
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Descendre la catégorie"
                      onClick={async () => {
                        try {
                          // Logique pour descendre la catégorie
                          const currentIndex = categories.findIndex(c => c.id === category.id);
                          if (currentIndex < categories.length - 1) {
                            const nextCategory = categories[currentIndex + 1];
                            const currentOrder = category.display_order;
                            const nextOrder = nextCategory.display_order;
                            
                            // Échanger les ordres d'affichage
                            await supabase
                              .from('categories')
                              .update({ display_order: nextOrder })
                              .eq('id', category.id);
                              
                            await supabase
                              .from('categories')
                              .update({ display_order: currentOrder })
                              .eq('id', nextCategory.id);
                              
                            await loadData();
                          }
                        } catch (error) {
                          console.error('Erreur lors du déplacement de la catégorie:', error);
                        }
                      }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier la catégorie"
                      onClick={() => {
                        setEditingCategory(category);
                        setNewCategory({
                          name: category.name,
                          description: category.description || '',
                          image_url: category.image_url || '',
                          display_order: category.display_order,
                          slug: category.slug,
                          is_active: category.is_active
                        } as CategoryFormData & { display_order: number });
                        setShowNewCategoryForm(true);
                      }}
                    >
                      <PenSquare className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => toggleCategory(category.id)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      {expandedCategories[category.id] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {category.products.length} {category.products.length > 1 ? 'produits' : 'produit'}
                  </span>
                </div>

                {/* Liste des produits de la catégorie */}
                <div className={`mt-2 space-y-2 ${expandedCategories[category.id] ? 'block' : 'hidden'}`}>
                  {category.products.map((product: Product) => (
                    <div key={product.id} className="bg-white rounded-lg shadow p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex space-x-4 flex-1">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                              <span>Pas d'image</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="font-medium">{product.name}</h3>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">
                              {product.description || 'Aucune description'}
                            </p>
                            <div className="text-lg font-semibold text-blue-600">
                              {typeof product.price === 'number' 
                                ? product.price.toFixed(2) 
                                : parseFloat(product.price).toFixed(2)} €
                            </div>
                            
                            {/* Affichage du stock si activé */}
                            {product.stock_enabled && (
                              <div className="mt-2">
                                {product.stock_variants?.length > 0 ? (
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-600">Stock par variante :</p>
                                    {product.stock_variants.map((variant: any, index: number) => (
                                      <div key={index} className="text-xs text-gray-500 flex justify-between">
                                        <span>{variant.name}</span>
                                        <span className={`${
                                          variant.quantity > 5 ? 'text-green-600' : 
                                          variant.quantity > 0 ? 'text-orange-600 font-medium' : 
                                          'text-red-600 font-medium'
                                        }`}>
                                          {variant.quantity > 0 ? `${variant.quantity} dispo` : 'Rupture'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : product.stock_quantity !== null ? (
                                  <p className={`text-xs ${
                                    (product.stock_quantity || 0) > 5 ? 'text-green-600' : 
                                    (product.stock_quantity || 0) > 0 ? 'text-orange-600 font-medium' : 
                                    'text-red-600 font-medium'
                                  }`}>
                                    Stock: {product.stock_quantity} disponible{product.stock_quantity !== 1 ? 's' : ''}
                                  </p>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            onClick={() => console.log('Modifier le produit:', product.id)}
                          >
                            <PenSquare 
                              className="w-4 h-4" 
                              onClick={() => {
                                setEditingProduct(product);
                                setNewProduct({
                                  name: product.name,
                                  description: product.description || '',
                                  price: product.price.toString(),
                                  is_available: product.is_available,
                                  category_id: product.category_id || '',
                                  image_url: product.image_url || '',
                                  stock_enabled: product.stock_enabled || false,
                                  stock_quantity: product.stock_quantity || 0
                                });
                                setShowNewProductForm(true);
                              }}
                            />
                          </button>
                          <button 
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 
                              className="w-4 h-4" 
                              onClick={() => handleDeleteCategory(category.id)}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal Produit */}
      {(showNewProductForm || editingProduct) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingProduct ? 'Mettre à jour' : 'Nouveau produit'}
              </h2>
              <button 
                onClick={() => setShowNewProductForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du produit *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prix *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                    />
                    <span className="absolute right-3 top-2 text-gray-500">€</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={newProduct.category_id}
                    onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de l'image
                  </label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image.jpg"
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({...newProduct, image_url: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewProductForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {editingProduct ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Catégorie */}
      {(showNewCategoryForm || editingCategory) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
              </h2>
              <button 
                onClick={() => setShowNewCategoryForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la catégorie *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL de l'image
                  </label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/image.jpg"
                    value={newCategory.image_url}
                    onChange={(e) => setNewCategory({...newCategory, image_url: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowNewCategoryForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Créer la catégorie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductsList;
