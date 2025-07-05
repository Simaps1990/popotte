// Base de données factice
import { 
  MOCK_NEWS, 
  MOCK_PRODUCTS, 
  MOCK_CATEGORIES, 
  MOCK_ORDERS, 
  MOCK_USERS,
  type NewsPost, 
  type Product, 
  type Category, 
  type Order, 
  type OrderItem,
  type User 
} from './mockData'

class MockDatabase {
  private news: NewsPost[] = [...MOCK_NEWS]
  private products: Product[] = [...MOCK_PRODUCTS]
  private categories: Category[] = [...MOCK_CATEGORIES]
  private orders: Order[] = [...MOCK_ORDERS]
  private users: User[] = [...MOCK_USERS]

  // NEWS
  async getNews(published?: boolean): Promise<NewsPost[]> {
    await this.delay()
    return this.news
      .filter(post => published === undefined || post.published === published)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async createNews(data: Omit<NewsPost, 'id' | 'created_at'>): Promise<NewsPost> {
    await this.delay()
    const newPost: NewsPost = {
      ...data,
      id: `news-${Date.now()}`,
      created_at: new Date().toISOString()
    }
    this.news.push(newPost)
    return newPost
  }

  async updateNews(id: string, data: Partial<NewsPost>): Promise<NewsPost> {
    await this.delay()
    const index = this.news.findIndex(post => post.id === id)
    if (index === -1) throw new Error('Article non trouvé')
    
    this.news[index] = { ...this.news[index], ...data }
    return this.news[index]
  }

  async deleteNews(id: string): Promise<void> {
    await this.delay()
    const index = this.news.findIndex(post => post.id === id)
    if (index === -1) throw new Error('Article non trouvé')
    
    this.news.splice(index, 1)
  }

  // PRODUCTS
  async getProducts(available?: boolean): Promise<Product[]> {
    await this.delay()
    return this.products
      .filter(product => available === undefined || product.is_available === available)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async createProduct(data: Omit<Product, 'id'>): Promise<Product> {
    await this.delay()
    const category = this.categories.find(c => c.id === data.category_id)
    
    // Calculer le display_order pour le nouveau produit
    const categoryProducts = this.products.filter(p => p.category_id === data.category_id)
    const maxOrder = Math.max(...categoryProducts.map(p => p.display_order || 0), -1)
    
    const newProduct: Product = {
      ...data,
      id: `prod-${Date.now()}`,
      display_order: data.display_order ?? maxOrder + 1,
      stock_enabled: data.stock_enabled || false,
      stock_quantity: data.stock_quantity,
      stock_variants: data.stock_variants,
      categories: category ? { name: category.name } : undefined
    }
    this.products.push(newProduct)
    return newProduct
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    await this.delay()
    const index = this.products.findIndex(product => product.id === id)
    if (index === -1) throw new Error('Produit non trouvé')
    
    this.products[index] = { ...this.products[index], ...data }
    
    // Mettre à jour la catégorie si nécessaire
    if (data.category_id) {
      const category = this.categories.find(c => c.id === data.category_id)
      this.products[index].categories = category ? { name: category.name } : undefined
    }
    
    return this.products[index]
  }

  async deleteProduct(id: string): Promise<void> {
    await this.delay()
    const index = this.products.findIndex(product => product.id === id)
    if (index === -1) throw new Error('Produit non trouvé')
    
    this.products.splice(index, 1)
  }

  // CATEGORIES
  async getCategories(): Promise<Category[]> {
    await this.delay()
    return this.categories.sort((a, b) => a.display_order - b.display_order)
  }

  async createCategory(data: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    await this.delay()
    const maxOrder = Math.max(...this.categories.map(c => c.display_order), -1)
    const newCategory: Category = {
      ...data,
      id: `cat-${Date.now()}`,
      display_order: data.display_order ?? maxOrder + 1,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      created_at: new Date().toISOString()
    }
    this.categories.push(newCategory)
    return newCategory
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    await this.delay()
    const index = this.categories.findIndex(category => category.id === id)
    if (index === -1) throw new Error('Catégorie non trouvée')
    
    this.categories[index] = { ...this.categories[index], ...data }
    
    // Mettre à jour le slug si le nom a changé
    if (data.name) {
      this.categories[index].slug = data.name.toLowerCase().replace(/\s+/g, '-')
    }
    
    return this.categories[index]
  }

  async moveCategoryUp(id: string): Promise<void> {
    await this.delay()
    const index = this.categories.findIndex(category => category.id === id)
    if (index === -1) throw new Error('Catégorie non trouvée')
    if (index === 0) return // Déjà en première position
    
    // Échanger avec la catégorie précédente
    const temp = this.categories[index - 1].display_order
    this.categories[index - 1].display_order = this.categories[index].display_order
    this.categories[index].display_order = temp
    
    // Réorganiser le tableau
    this.categories.sort((a, b) => a.display_order - b.display_order)
  }

  async moveCategoryDown(id: string): Promise<void> {
    await this.delay()
    const index = this.categories.findIndex(category => category.id === id)
    if (index === -1) throw new Error('Catégorie non trouvée')
    if (index === this.categories.length - 1) return // Déjà en dernière position
    
    // Échanger avec la catégorie suivante
    const temp = this.categories[index + 1].display_order
    this.categories[index + 1].display_order = this.categories[index].display_order
    this.categories[index].display_order = temp
    
    // Réorganiser le tableau
    this.categories.sort((a, b) => a.display_order - b.display_order)
  }

  // ORDERS
  async getOrders(userId?: string): Promise<Order[]> {
    await this.delay()
    return this.orders
      .filter(order => !userId || order.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async createOrder(data: { user_id: string; total_amount: number; items: Array<{ product_id: string; quantity: number; unit_price: number; variant?: string }> }): Promise<Order> {
    await this.delay()
    
    const orderId = `order-${Date.now()}`
    const orderItems: OrderItem[] = data.items.map((item, index) => {
      const product = this.products.find(p => p.id === item.product_id)
      return {
        id: `item-${Date.now()}-${index}`,
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        variant: item.variant,
        products: { name: product?.name || 'Produit inconnu' }
      }
    })

    const user = this.users.find(u => u.id === data.user_id)
    const newOrder: Order = {
      id: orderId,
      user_id: data.user_id,
      total_amount: data.total_amount,
      status: 'pending',
      payment_initiated_at: null,
      payment_notified_at: null,
      confirmed_at: null,
      created_at: new Date().toISOString(),
      order_items: orderItems,
      profiles: user ? { full_name: user.full_name, email: user.email } : undefined
    }

    this.orders.push(newOrder)
    
    // Réduire le stock après confirmation de commande (simulé ici pour la démo)
    // En production, cela se ferait uniquement lors de la confirmation par l'admin
    this.updateStock(data.items)
    
    return newOrder
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    await this.delay()
    const index = this.orders.findIndex(order => order.id === id)
    if (index === -1) throw new Error('Commande non trouvée')
    
    // Mettre à jour les timestamps selon le statut
    const updatedOrder = { ...this.orders[index], ...data }
    
    if (data.status === 'payment_notified' && !updatedOrder.payment_notified_at) {
      updatedOrder.payment_notified_at = new Date().toISOString()
    }
    
    if (data.status === 'confirmed' && !updatedOrder.confirmed_at) {
      updatedOrder.confirmed_at = new Date().toISOString()
    }
    
    this.orders[index] = updatedOrder
    return this.orders[index]
  }

  private updateStock(items: Array<{ product_id: string; quantity: number; variant?: string }>) {
    items.forEach(item => {
      const productIndex = this.products.findIndex(p => p.id === item.product_id)
      if (productIndex === -1) return
      
      const product = this.products[productIndex]
      if (!product.stock_enabled) return
      
      if (product.stock_variants && item.variant) {
        // Réduire le stock de la variante
        const variantIndex = product.stock_variants.findIndex(v => v.name === item.variant)
        if (variantIndex !== -1) {
          product.stock_variants[variantIndex].quantity = Math.max(0, product.stock_variants[variantIndex].quantity - item.quantity)
        }
      } else if (product.stock_quantity !== undefined) {
        // Réduire le stock simple
        product.stock_quantity = Math.max(0, product.stock_quantity - item.quantity)
      }
      
      this.products[productIndex] = product
    })
  }

  // USERS
  async getUsers(): Promise<User[]> {
    await this.delay()
    return this.users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return this.getOrders(userId)
  }

  private delay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const mockDatabase = new MockDatabase()