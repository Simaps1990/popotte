import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { Product } from '../../services/types';

interface ProductFormProps {
  initialData?: Partial<Product>;
  categories: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onSubmit: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

export const ProductForm = ({ initialData, categories, onCancel, onSubmit }: ProductFormProps) => {
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'created_at' | 'updated_at'>>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    category_id: initialData?.category_id || '',
    is_available: initialData?.is_available ?? true,
    stock_enabled: false, // Désactivé par défaut
    stock_quantity: 0, // Valeur par défaut
    stock_variants: [], // Valeur par défaut
    image_url: initialData?.image_url || '',
    display_order: initialData?.display_order || 0,
  });
  // Fonctionnalité d'upload d'image supprimée comme demandé

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting product:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : 
              type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              value
    }));
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {initialData?.id ? 'Modifier le produit' : 'Nouveau produit'}
        </h3>
        <button 
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
          type="button"
        >
          <X size={20} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nom du produit
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="input mt-1 w-full"
            required
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description (optionnel)
          </label>
          <textarea
            id="description"
            name="description"
            className="input mt-1 w-full h-20 resize-none"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Prix (€)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            className="input mt-1 w-full"
            required
            value={formData.price}
            onChange={handleChange}
          />
        </div>

        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
            Catégorie
          </label>
          <select
            id="category_id"
            name="category_id"
            className="input mt-1 w-full"
            value={formData.category_id || ''}
            onChange={handleChange}
          >
            <option value="">Aucune catégorie</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section d'upload d'image supprimée comme demandé */}

        <div className="flex items-center">
          <input
            id="is_available"
            name="is_available"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            checked={formData.is_available}
            onChange={handleChange}
          />
          <label htmlFor="is_available" className="ml-2 block text-sm text-gray-900">
            Produit disponible
          </label>
        </div>

        {/* Section de gestion de stock temporairement retirée */}

        <div className="flex space-x-2 pt-4">
          <button
            type="submit"
            className="flex items-center space-x-2 px-4 py-2 rounded-md bg-gradient-to-r from-[#10182a] to-[#2a4365] text-white hover:opacity-90 transition-opacity"
          >
            <Save size={20} />
            <span>{initialData?.id ? 'Mettre à jour' : 'Créer'}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center px-4 py-2 rounded-md bg-gradient-to-r from-gray-300 to-gray-200 text-gray-700 hover:opacity-90 transition-opacity"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
