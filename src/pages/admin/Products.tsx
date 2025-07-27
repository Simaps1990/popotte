import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronUp, ChevronDown, PenSquare, Trash2, Eye, EyeOff, ArrowLeft, FolderPlus } from 'lucide-react';
import * as productService from '../../services/productService';
import * as categoryService from '../../services/categoryService';
import { Product, Category } from '../../services/types';
import { toast } from 'react-hot-toast';
import { ProductForm } from '../../components/admin/ProductForm';

type ProductsByCategory = (Category & { products: Product[] })[];

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState<boolean>(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const productsByCategory: ProductsByCategory = categories
    .filter(category => category.is_active !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .map(category => ({
      ...category,
      products: products.filter(p => p.category_id === category.id)
        // N'affiche côté admin que les produits (disponibles ou non)
    }));

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsData, categoriesData] = await Promise.all([
          productService.getProducts(),
          categoryService.getCategories()
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Composant séparé pour les boutons d'action
  const ProductActionButtons = ({ product, index, productsInCategory }: { product: Product; index: number; productsInCategory: Product[] }) => {
    return (
      <div className="flex items-center space-x-1">
        <button
          onClick={() => toggleProductAvailability(product)}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
          title={product.is_available ? "Rendre indisponible" : "Rendre disponible"}
        >
          {product.is_available ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button
          onClick={() => handleMoveProduct(product.id, 'up')}
          disabled={index === 0}
          className={`p-2 rounded-lg transition-colors ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-blue-600 hover:bg-white'}`}
          title="Monter le produit"
        >
          <ChevronUp size={18} />
        </button>
        <button
          onClick={() => handleMoveProduct(product.id, 'down')}
          disabled={index === productsInCategory.length - 1}
          className={`p-2 rounded-lg transition-colors ${index === productsInCategory.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-blue-600 hover:bg-white'}`}
          title="Descendre le produit"
        >
          <ChevronDown size={18} />
        </button>
        <button
          onClick={() => {
            console.log('Clic sur le bouton modifier pour:', product.name, 'disponible:', product.is_available);
            handleEditProduct(product);
          }}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
          title="Modifier le produit"
        >
          <PenSquare size={18} />
        </button>
        <button
          onClick={() => handleDeleteProduct(product.id)}
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Supprimer le produit"
        >
          <Trash2 size={18} />
        </button>
      </div>
    );
  };

  // Fonction de rendu des cartes produit avec gestion spéciale pour les produits indisponibles
  const renderProductCard = (product: Product, index: number, productsInCategory: Product[]) => (
    <div
      key={product.id}
      className={`flex items-center justify-between p-3 rounded-lg shadow-sm border border-gray-200`}
      style={{ backgroundColor: 'white' }}
    >
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <h3 className={`font-medium ${product.is_available ? 'text-[#10182a]' : 'text-gray-500'}`}>
            {product.name}
          </h3>
        </div>
        <p className="text-sm text-gray-500">
          {product.price ? `${product.price.toFixed(2)} €` : 'Prix non défini'}
        </p>
      </div>
      <ProductActionButtons product={product} index={index} productsInCategory={productsInCategory} />
    </div>
  );

  // Fonction pour éditer un produit - réécrite pour éviter les problèmes avec les produits indisponibles
  const handleEditProduct = (product: Product) => {
    console.log('Début de l\'opération d\'edition du produit:', product.name, 'disponible:', product.is_available);
    // Forcer la mise à jour des états dans le bon ordre
    setEditingProduct(null); // D'abord réinitialiser
    setTimeout(() => {
      setEditingProduct(product); // Ensuite définir le produit en édition
      setTimeout(() => {
        console.log('Activation du mode création/édition pour le produit:', product.name);
        setIsCreatingProduct(true); // Enfin activer le mode création/édition
      }, 50);
    }, 50);
  };
  
  // Fonction pour tester directement la disponibilité d'un produit
  const toggleProductAvailability = async (product: Product) => {
    const newAvailability = !product.is_available;
    
    console.log('🔄 [toggleProductAvailability] Début - Produit:', product.name, 'Ancien statut:', product.is_available, 'Nouveau statut:', newAvailability);
    
    // Optimistic update - mise à jour immédiate de l'UI
    const optimisticProduct = { ...product, is_available: newAvailability };
    setProducts(prevProducts => {
      const updated = prevProducts.map(p => p.id === product.id ? optimisticProduct : p);
      console.log('✨ [toggleProductAvailability] Optimistic update appliqué');
      return updated;
    });
    
    try {
      const updatedProduct = await productService.updateProduct(product.id, {
        is_available: newAvailability
      });
      
      console.log('✅ [toggleProductAvailability] Backend mis à jour - Nouveau statut:', updatedProduct.is_available);
      
      // Mettre à jour avec les données du backend (au cas où il y aurait d'autres changements)
      setProducts(prevProducts => {
        const updated = prevProducts.map(p => p.id === product.id ? updatedProduct : p);
        console.log('🔄 [toggleProductAvailability] State synchronisé avec backend');
        return updated;
      });
      
      toast.success(`Produit ${updatedProduct.name} ${updatedProduct.is_available ? 'disponible' : 'indisponible'}`);
    } catch (error) {
      console.error('❌ [toggleProductAvailability] Erreur backend:', error);
      
      // Rollback de l'optimistic update en cas d'erreur
      setProducts(prevProducts => {
        const rollback = prevProducts.map(p => p.id === product.id ? product : p);
        console.log('🔄 [toggleProductAvailability] Rollback de l\'optimistic update');
        return rollback;
      });
      
      toast.error('Une erreur est survenue lors de la mise à jour de la disponibilité');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      try {
        await productService.deleteProduct(productId);
        setProducts(products.filter(p => p.id !== productId));
        toast.success('Produit supprimé avec succès');
      } catch (error) {
        console.error('Erreur lors de la suppression du produit:', error);
        toast.error('Une erreur est survenue lors de la suppression du produit');
      }
    }
  };

  const handleMoveProduct = async (productId: string, direction: 'up' | 'down') => {
    try {
      console.log('handleMoveProduct appelé avec:', { productId, direction });
      
      // 1. Créer une copie profonde des produits actuels
      const updatedProducts = JSON.parse(JSON.stringify(products));
      
      // 2. Trouver le produit à déplacer
      const productIndex = updatedProducts.findIndex((p: Product) => p.id === productId);
      if (productIndex === -1) {
        console.error('Produit non trouvé:', productId);
        return;
      }
      
      const product = { ...updatedProducts[productIndex] };
      if (!product.category_id) {
        console.error('Le produit n\'a pas de catégorie:', product);
        return;
      }
      
      // 3. Filtrer les produits de la même catégorie et les trier par display_order
      const categoryProducts = updatedProducts
        .filter((p: Product) => p.category_id === product.category_id)
        .sort((a: Product, b: Product) => (a.display_order || 0) - (b.display_order || 0));
      
      console.log('Produits de la catégorie avant modification:', 
        categoryProducts.map((p: Product) => ({
          id: p.id,
          name: p.name,
          display_order: p.display_order
        }))
      );
      
      // 4. Trouver l'index du produit dans la liste triée
      const currentIndex = categoryProducts.findIndex((p: Product) => p.id === productId);
      if (currentIndex === -1) {
        console.error('Produit non trouvé dans la liste triée:', productId);
        return;
      }
      
      // 5. Calculer le nouvel index en fonction de la direction
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // 6. Vérifier si le déplacement est possible
      if (newIndex < 0 || newIndex >= categoryProducts.length) {
        console.log('Déplacement impossible: hors limites');
        toast('Impossible de déplacer le produit plus loin dans cette direction');
        return;
      }
      
      // 7. Créer une nouvelle liste des produits de la catégorie avec les nouveaux ordres
      const updatedCategoryProducts = [...categoryProducts];
      
      // 8. Échanger les positions dans le tableau
      [updatedCategoryProducts[currentIndex], updatedCategoryProducts[newIndex]] = 
        [updatedCategoryProducts[newIndex], { ...updatedCategoryProducts[currentIndex] }];
      
      // 9. Mettre à jour les display_order de manière séquentielle
      updatedCategoryProducts.forEach((p: Product, index: number) => {
        p.display_order = index + 1; // Commence à 1 pour plus de lisibilité
      });
      
      console.log('Produits de la catégorie après modification:', 
        updatedCategoryProducts.map((p: Product) => ({
          id: p.id,
          name: p.name,
          display_order: p.display_order
        }))
      );
      
      // 10. Mettre à jour les produits dans le tableau principal
      const updatedProductsMap = new Map(updatedProducts.map((p: Product) => [p.id, p]));
      updatedCategoryProducts.forEach((updatedProduct: Product) => {
        updatedProductsMap.set(updatedProduct.id, { ...updatedProduct });
      });
      
      const finalProducts = Array.from(updatedProductsMap.values()) as Product[];
      
      // 11. Mettre à jour d'abord la base de données
      try {
        console.log('Mise à jour en base de données...');
        
        // Préparer les mises à jour pour tous les produits modifiés
        const updates = updatedCategoryProducts.map(p => ({
          id: p.id,
          updates: {
            display_order: p.display_order
          }
        }));
        
        console.log(`Mise à jour groupée de ${updates.length} produits...`);
        
        // Mettre à jour tous les produits en une seule requête
        await productService.updateMultipleProducts(updates);
        
        console.log('Mise à jour en base de données réussie');
        
        // Mettre à jour l'état local avec les produits mis à jour
        setProducts(finalProducts);
        
        // Afficher le message de succès
        toast.success(`Produit déplacé vers le ${direction === 'up' ? 'haut' : 'bas'}`);
        
      } catch (error) {
        console.error('Erreur dans handleMoveProduct:', error);
        toast.error('Une erreur est survenue lors du déplacement du produit');
        
        // Recharger les produits depuis la base pour revenir à un état cohérent
        const refreshedProducts = await productService.getProducts();
        if (refreshedProducts) {
          setProducts(refreshedProducts);
        }
      }
    } catch (error) {
      console.error('Erreur lors du déplacement du produit:', error);
      toast.error('Une erreur est survenue lors du déplacement du produit');
      
      // En cas d'erreur, recharger les produits pour revenir à un état cohérent
      const refreshedProducts = await productService.getProducts();
      if (refreshedProducts) {
        setProducts(refreshedProducts);
      }
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditingCategoryName(category.name);
  };

  const handleCreateCategory = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!newCategoryName.trim()) {
      toast.error('Veuillez entrer un nom de catégorie');
      return;
    }
    
    try {
      const newCategory = await categoryService.createCategory({
        name: newCategoryName.trim(),
        slug: newCategoryName.trim().toLowerCase().replace(/\s+/g, '-'),
        is_active: true,
        display_order: categories.length
      });
      
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setIsCreatingCategory(false);
      toast.success('Catégorie créée avec succès');
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      toast.error('Une erreur est survenue lors de la création de la catégorie');
    }
  };

  const handleCreateProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newProduct = await productService.createProduct(productData);
      setProducts([...products, newProduct]);
      setEditingProduct(null);
      setIsCreatingProduct(false);
      toast.success('Produit créé avec succès');
      return newProduct;
    } catch (error) {
      console.error('Erreur lors de la création du produit:', error);
      toast.error('Une erreur est survenue lors de la création du produit');
      throw error;
    }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      // Inclure is_available dans les mises à jour
      const updatedProduct = await productService.updateProduct(id, updates);
      setProducts(products.map(p => p.id === id ? updatedProduct : p));
      setEditingProduct(null);
      toast.success('Produit mis à jour avec succès');
      return updatedProduct;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      toast.error('Une erreur est survenue lors de la mise à jour du produit');
      throw error;
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCategory || !editingCategoryName.trim()) return;
    
    try {
      await categoryService.updateCategory(editingCategory.id, { 
        name: editingCategoryName.trim() 
      });
      
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, name: editingCategoryName.trim() } 
          : cat
      ));
      
      setEditingCategory(null);
      setEditingCategoryName('');
      toast.success('Catégorie mise à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la catégorie:', error);
      toast.error('Une erreur est survenue lors de la mise à jour de la catégorie');
    }
  };

  const handleCancelCategory = () => {
    setEditingCategory(null);
    setEditingCategoryName('');
  };

  const handleMoveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = categories.findIndex(c => c.id === categoryId);
      if (currentIndex === -1) return;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= categories.length) return;
      
      const newCategories = [...categories];
      const [movedCategory] = newCategories.splice(currentIndex, 1);
      newCategories.splice(newIndex, 0, movedCategory);
      
      // Mettre à jour l'ordre d'affichage
      const updatedCategories = newCategories.map((cat, index) => ({
        ...cat,
        display_order: index
      }));
      
      // Mettre à jour les catégories en base de données
      await Promise.all(
        updatedCategories.map(cat => 
          categoryService.updateCategory(cat.id, { display_order: cat.display_order })
        )
      );
      
      setCategories(updatedCategories);
      toast.success(`Catégorie déplacée vers le ${direction === 'up' ? 'haut' : 'bas'}`);
    } catch (error) {
      console.error('Erreur lors du déplacement de la catégorie:', error);
      toast.error('Une erreur est survenue lors du déplacement de la catégorie');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    console.log('handleDeleteCategory appelé avec categoryId:', categoryId);
    
    // Trouver la catégorie dans la liste des catégories
    const category = categories.find(cat => cat.id === categoryId);
    
    if (!category) {
      console.error('Catégorie non trouvée:', categoryId);
      toast.error('Catégorie introuvable');
      return;
    }
    
    // Vérifier directement dans l'état des produits
    const productsInCategory = products.filter(p => p.category_id === categoryId);
    console.log('Produits dans la catégorie:', productsInCategory);
    
    if (productsInCategory.length > 0) {
      const errorMessage = `Impossible de supprimer la catégorie "${category.name}" car elle contient ${productsInCategory.length} produit(s). Veuillez d'abord supprimer ou déplacer ces produits.`;
      console.log('Affichage du message d\'erreur:', errorMessage);
      toast.error(errorMessage);
      return;
    }
    
    // Si la catégorie est vide, demander confirmation
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
      try {
        const { error } = await categoryService.deleteCategory(categoryId);
        
        if (!error) {
          // Mettre à jour la liste des catégories
          setCategories(categories.filter(cat => cat.id !== categoryId));
          toast.success('Catégorie supprimée avec succès');
        } else {
          throw error;
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de la catégorie:', error);
        toast.error('Une erreur est survenue lors de la suppression de la catégorie');
      }
    }
  };

  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="container mx-auto px-4 py-6 max-w-md">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#10182a]">Gestion des produits</h1>
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-[#10182a] hover:text-blue-700 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Retour</span>
            </button>
          </div>
          
          <div className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    setIsCreatingProduct(true);
                    setIsCreatingCategory(false);
                  }}
                  className="btn-primary flex items-center space-x-2"
                  disabled={isCreatingCategory || isCreatingProduct}
                >
                  <Plus size={20} />
                  <span>Nouveau produit</span>
                </button>
                <button 
                  onClick={() => {
                    setIsCreatingCategory(true);
                    setIsCreatingProduct(false);
                  }}
                  className="btn-secondary flex items-center space-x-2"
                  disabled={isCreatingCategory || isCreatingProduct}
                >
                  <FolderPlus size={20} />
                  <span>Nouvelle catégorie</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Formulaire de création de catégorie */}
              {isCreatingCategory && (
                <div className="card mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Nouvelle catégorie</h3>
                    <button 
                      onClick={() => setIsCreatingCategory(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                      </svg>
                    </button>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateCategory();
                  }} className="space-y-4">
                    <div>
                      <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700">
                        Nom de la catégorie
                      </label>
                      <input 
                        id="categoryName" 
                        type="text" 
                        className="input mt-1 w-full" 
                        required 
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button type="submit" className="btn-primary flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                          <polyline points="17 21 17 13 7 13 7 21"></polyline>
                          <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        <span>Créer</span>
                      </button>
                      <button 
                        type="button" 
                        className="btn-secondary"
                        onClick={() => {
                          setIsCreatingCategory(false);
                          setNewCategoryName('');
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Formulaire de création ou modification de produit */}
              {isCreatingProduct && (
                <div className="mb-6">
                  <ProductForm
                    categories={categories}
                    onCancel={() => {
                      setIsCreatingProduct(false);
                      setEditingProduct(null);
                    }}
                    onSubmit={async (data) => {
                      if (editingProduct) {
                        await handleUpdateProduct(editingProduct.id, data);
                      } else {
                        await handleCreateProduct(data);
                      }
                      setIsCreatingProduct(false);
                    }}
                    initialData={editingProduct || undefined}
                  />
                </div>
              )}
            
            {loading ? (
              <div>Chargement des produits...</div>
            ) : (
                productsByCategory.map((category) => (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center space-x-2 group bg-white p-3 rounded-lg">
                      {editingCategory?.id === category.id ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="input text-lg font-semibold flex-1"
                            autoFocus
                          />
                          <button 
                            onClick={handleSaveCategory}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Enregistrer les modifications"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </button>
                          <button 
                            onClick={() => setEditingCategory(null)}
                            className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors"
                            title="Annuler"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                              <path d="M18 6 6 18"></path>
                              <path d="m6 6 12 12"></path>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <>
                          <h2 
                            className="text-lg font-semibold text-gray-800 flex-1 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => {
                              setEditingCategory(category);
                              setEditingCategoryName(category.name);
                            }}
                          >
                            {category.name}
                          </h2>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleMoveCategory(category.id, 'up')}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                              title="Monter la catégorie"
                            >
                              <ChevronUp size={18} />
                            </button>
                            <button
                              onClick={() => handleMoveCategory(category.id, 'down')}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                              title="Descendre la catégorie"
                            >
                              <ChevronDown size={18} />
                            </button>
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                              title="Modifier la catégorie"
                            >
                              <PenSquare size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer la catégorie"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          <span className="px-2 py-1 text-xs bg-white border border-gray-200 text-gray-600 rounded-full">
                            {category.products.length} produit{category.products.length !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="space-y-3">
                      {category.products
                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                        .map((product, index, productsArray) => 
                          renderProductCard(product, index, productsArray)
                        )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
