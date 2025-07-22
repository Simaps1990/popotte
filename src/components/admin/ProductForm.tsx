import { useState, useRef } from 'react';
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
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image du produit
          </label>
          <div className="space-y-2">
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer border-gray-300 hover:border-gray-400"
              onClick={() => fileInputRef.current?.click()}
              style={{ position: 'relative' }}
            >
              {formData.image_url && (
                <img
                  src={formData.image_url}
                  alt="Aperçu du produit"
                  className="mx-auto mb-2 rounded object-contain"
                  style={{ maxHeight: 120, maxWidth: '100%' }}
                />
              )}
              {imageUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60">
                  <span className="text-primary-600">Upload en cours...</span>
                </div>
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-2 text-gray-400"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                <circle cx="9" cy="9" r="2"></circle>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
              </svg>
              <p className="text-sm text-gray-600 mb-2">Ajouter une image du produit</p>
              <p className="text-xs text-gray-500">
                Glissez-déposez une image ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Formats acceptés: JPG, PNG, GIF (max 5MB)
              </p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageUploading(true);
                    try {
                      const { uploadProductImage } = await import('../../services/imageService');
                      const url = await uploadProductImage(file);
                      setFormData(prev => ({ ...prev, image_url: url }));
                    } catch (err) {
                      alert('Erreur lors de l\'upload de l\'image');
                      console.error(err);
                    } finally {
                      setImageUploading(false);
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

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
            className="btn-primary flex items-center space-x-2"
          >
            <Save size={20} />
            <span>{initialData?.id ? 'Mettre à jour' : 'Créer'}</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
