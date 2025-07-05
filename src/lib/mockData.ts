// Données factices pour l'application
export interface User {
  id: string
  email: string
  full_name: string
  username: string
  role: 'user' | 'admin'
  created_at: string
}

export interface NewsPost {
  id: string
  title: string
  content: string
  excerpt: string | null
  image_url: string | null
  published: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  display_order: number
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  image_url: string | null
  is_available: boolean
  display_order: number
  stock_enabled: boolean
  stock_quantity?: number
  stock_variants?: Array<{
    name: string
    quantity: number
  }>
  categories?: {
    name: string
  }
}

export interface Order {
  id: string
  user_id: string
  total_amount: number
  status: 'pending' | 'payment_notified' | 'confirmed' | 'cancelled'
  payment_initiated_at: string | null
  payment_initiated_at: string | null
  payment_notified_at: string | null
  confirmed_at: string | null
  created_at: string
  order_items: OrderItem[]
  profiles?: {
    full_name: string
    email: string
  }
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  products: {
    name: string
  }
}

// Utilisateurs factices
export const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    email: 'admin@popotte.fr',
    full_name: 'Administrateur Popotte',
    username: 'admin',
    role: 'admin',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user-2',
    email: 'marie.dupont@email.fr',
    full_name: 'Marie Dupont',
    username: 'marie',
    role: 'user',
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'user-3',
    email: 'jean.martin@email.fr',
    full_name: 'Jean Martin',
    username: 'jean',
    role: 'user',
    created_at: '2024-02-01T00:00:00Z'
  },
  {
    id: 'user-4',
    email: 'sophie.bernard@email.fr',
    full_name: 'Sophie Bernard',
    username: 'sophie',
    role: 'user',
    created_at: '2024-02-15T00:00:00Z'
  }
]

// Actualités factices
export const MOCK_NEWS: NewsPost[] = [
  {
    id: 'news-1',
    title: 'Bienvenue à la Popotte Association !',
    content: `Nous sommes ravis de vous accueillir dans notre nouvelle application de commande en ligne.

Vous pouvez désormais :
- Consulter notre menu complet
- Passer vos commandes facilement
- Suivre vos dettes et paiements
- Rester informés de nos actualités

Notre association continue de vous proposer des plats traditionnels marocains préparés avec amour et des ingrédients de qualité.

N'hésitez pas à nous faire part de vos retours pour améliorer votre expérience !`,
    excerpt: 'Découvrez notre nouvelle application de commande en ligne',
    image_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    published: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'news-2',
    title: 'Nouveau menu de printemps',
    content: `Nous avons le plaisir de vous annoncer l'arrivée de notre nouveau menu de printemps !

Au programme :
- Des salades fraîches de saison
- De nouveaux tajines aux légumes printaniers
- Des desserts légers et parfumés

Tous nos plats sont préparés avec des produits frais et de saison, dans le respect de nos traditions culinaires.

Venez découvrir ces nouvelles saveurs dès maintenant !`,
    excerpt: 'Découvrez nos nouveaux plats de saison',
    image_url: 'https://images.pexels.com/photos/5949888/pexels-photo-5949888.jpeg',
    published: true,
    created_at: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'news-3',
    title: 'Horaires d\'ouverture mis à jour',
    content: `Nous vous informons que nos horaires d'ouverture ont été légèrement modifiés pour mieux vous servir :

Lundi - Vendredi : 11h30 - 14h30 et 18h30 - 22h00
Samedi - Dimanche : 12h00 - 15h00 et 19h00 - 22h30

Les commandes en ligne restent disponibles 24h/24 avec récupération selon nos horaires d'ouverture.

Merci de votre compréhension !`,
    excerpt: 'Nouveaux horaires pour mieux vous servir',
    image_url: 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg',
    published: true,
    created_at: new Date(Date.now() - 172800000).toISOString()
  }
]

// Catégories factices
export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'BOISSONS', slug: 'boissons', display_order: 1 },
  { id: 'cat-2', name: 'EN CAS SALE', slug: 'en-cas-sale', display_order: 2 },
  { id: 'cat-3', name: 'EN CAS SUCRE', slug: 'en-cas-sucre', display_order: 3 },
  { id: 'cat-4', name: 'PLATS PRINCIPAUX', slug: 'plats-principaux', display_order: 4 },
  { id: 'cat-5', name: 'ENTREES', slug: 'entrees', display_order: 5 },
  { id: 'cat-6', name: 'DESSERTS', slug: 'desserts', display_order: 6 }
]

// Produits factices
export const MOCK_PRODUCTS: Product[] = [
  // BOISSONS
  {
    id: 'prod-1',
    name: 'Bières haut de gamme',
    description: 'Sélection de bières premium',
    price: 0.50,
    category_id: 'cat-1',
    image_url: 'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg',
    is_available: true,
    display_order: 1,
    stock_enabled: false,
    categories: { name: 'BOISSONS' }
  },
  {
    id: 'prod-2',
    name: 'Bières basiques',
    description: 'Bières classiques',
    price: 0.50,
    category_id: 'cat-1',
    image_url: 'https://images.pexels.com/photos/1552630/pexels-photo-1552630.jpeg',
    is_available: true,
    display_order: 2,
    stock_enabled: false,
    categories: { name: 'BOISSONS' }
  },
  {
    id: 'prod-3',
    name: 'Soft',
    description: 'Boissons sans alcool',
    price: 0.50,
    category_id: 'cat-1',
    image_url: 'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg',
    is_available: true,
    display_order: 3,
    stock_enabled: false,
    categories: { name: 'BOISSONS' }
  },
  {
    id: 'prod-4',
    name: 'Thé à la menthe',
    description: 'Thé traditionnel marocain à la menthe fraîche',
    price: 2.50,
    category_id: 'cat-1',
    image_url: 'https://images.pexels.com/photos/230477/pexels-photo-230477.jpeg',
    is_available: true,
    display_order: 4,
    stock_enabled: false,
    categories: { name: 'BOISSONS' }
  },

  // EN CAS SALE
  {
    id: 'prod-5',
    name: 'Chips',
    description: 'Chips croustillantes',
    price: 0.50,
    category_id: 'cat-2',
    image_url: 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg',
    is_available: true,
    display_order: 1,
    stock_enabled: false,
    categories: { name: 'EN CAS SALE' }
  },
  {
    id: 'prod-6',
    name: 'Saucisson',
    description: 'Saucisson sec de qualité',
    price: 0.50,
    category_id: 'cat-2',
    image_url: 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg',
    is_available: true,
    display_order: 2,
    stock_enabled: false,
    categories: { name: 'EN CAS SALE' }
  },

  // EN CAS SUCRE
  {
    id: 'prod-7',
    name: 'Bonbons',
    description: 'Assortiment de bonbons',
    price: 0.50,
    category_id: 'cat-3',
    image_url: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg',
    is_available: true,
    display_order: 1,
    stock_enabled: false,
    categories: { name: 'EN CAS SUCRE' }
  },
  {
    id: 'prod-8',
    name: 'Chewing-gum',
    description: 'Chewing-gum parfum menthe',
    price: 0.50,
    category_id: 'cat-3',
    image_url: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg',
    is_available: true,
    display_order: 2,
    stock_enabled: false,
    categories: { name: 'EN CAS SUCRE' }
  },

  // PLATS PRINCIPAUX
  {
    id: 'prod-9',
    name: 'Couscous royal',
    description: 'Couscous traditionnel avec merguez, agneau et légumes',
    price: 12.50,
    category_id: 'cat-4',
    image_url: 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg',
    is_available: true,
    display_order: 1,
    stock_enabled: false,
    categories: { name: 'PLATS PRINCIPAUX' }
  },
  {
    id: 'prod-10',
    name: 'Tajine de poulet',
    description: 'Tajine de poulet aux olives et citrons confits',
    price: 11.00,
    category_id: 'cat-4',
    image_url: 'https://images.pexels.com/photos/5949888/pexels-photo-5949888.jpeg',
    is_available: true,
    display_order: 2,
    stock_enabled: false,
    categories: { name: 'PLATS PRINCIPAUX' }
  },
  {
    id: 'prod-11',
    name: 'Pastilla au poisson',
    description: 'Pastilla traditionnelle au poisson et aux épices',
    price: 9.50,
    category_id: 'cat-4',
    image_url: 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg',
    is_available: true,
    display_order: 3,
    stock_enabled: true,
    stock_variants: [
      { name: 'Taille S', quantity: 5 },
      { name: 'Taille M', quantity: 3 },
      { name: 'Taille L', quantity: 0 }
    ],
    categories: { name: 'PLATS PRINCIPAUX' }
  },

  // ENTREES
  {
    id: 'prod-12',
    name: 'Harira',
    description: 'Soupe traditionnelle marocaine aux lentilles',
    price: 4.50,
    category_id: 'cat-5',
    image_url: 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg',
    is_available: true,
    display_order: 1,
    stock_enabled: true,
    stock_quantity: 8,
    categories: { name: 'ENTREES' }
  },
  {
    id: 'prod-13',
    name: 'Salade marocaine',
    description: 'Salade fraîche aux tomates, concombres et herbes',
    price: 5.00,
    category_id: 'cat-5',
    image_url: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg',
    is_available: true,
    display_order: 2,
    stock_enabled: true,
    stock_quantity: 2,
    categories: { name: 'ENTREES' }
  },

  // DESSERTS
  {
    id: 'prod-14',
    name: 'Cornes de gazelle',
    description: 'Pâtisseries traditionnelles aux amandes',
    price: 6.00,
    category_id: 'cat-6',
    image_url: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg',
    is_available: true,
    display_order: 1,
    stock_enabled: true,
    stock_quantity: 0,
    categories: { name: 'DESSERTS' }
  },
  {
    id: 'prod-15',
    name: 'Chebakia',
    description: 'Pâtisseries au miel et graines de sésame',
    price: 5.50,
    category_id: 'cat-6',
    image_url: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg',
    is_available: true,
    display_order: 2,
    stock_enabled: false,
    categories: { name: 'DESSERTS' }
  }
]

// Commandes factices
export const MOCK_ORDERS: Order[] = [
  {
    id: 'order-1',
    user_id: 'user-2',
    total_amount: 23.50,
    status: 'pending',
    payment_initiated_at: null,
    payment_notified_at: null,
    confirmed_at: null,
    created_at: new Date().toISOString(),
    profiles: {
      full_name: 'Marie Dupont',
      email: 'marie.dupont@email.fr'
    },
    order_items: [
      {
        id: 'item-1',
        order_id: 'order-1',
        product_id: 'prod-9',
        quantity: 1,
        unit_price: 12.50,
        total_price: 12.50,
        products: { name: 'Couscous royal' }
      },
      {
        id: 'item-2',
        order_id: 'order-1',
        product_id: 'prod-15',
        quantity: 2,
        unit_price: 5.50,
        total_price: 11.00,
        products: { name: 'Chebakia' }
      }
    ]
  },
  {
    id: 'order-2',
    user_id: 'user-3',
    total_amount: 15.50,
    status: 'payment_notified',
    payment_initiated_at: new Date(Date.now() - 3600000).toISOString(), // Il y a 1h
    payment_notified_at: new Date(Date.now() - 3600000).toISOString(),
    confirmed_at: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    profiles: {
      full_name: 'Jean Martin',
      email: 'jean.martin@email.fr'
    },
    order_items: [
      {
        id: 'item-3',
        order_id: 'order-2',
        product_id: 'prod-10',
        quantity: 1,
        unit_price: 11.00,
        total_price: 11.00,
        products: { name: 'Tajine de poulet' }
      },
      {
        id: 'item-4',
        order_id: 'order-2',
        product_id: 'prod-12',
        quantity: 1,
        unit_price: 4.50,
        total_price: 4.50,
        products: { name: 'Harira' }
      }
    ]
  },
  {
    id: 'order-3',
    user_id: 'user-4',
    total_amount: 18.00,
    status: 'confirmed',
    payment_initiated_at: new Date(Date.now() - 259200000).toISOString(), // Il y a 3 jours
    payment_notified_at: new Date(Date.now() - 259200000).toISOString(),
    confirmed_at: new Date(Date.now() - 172800000).toISOString(), // Il y a 2 jours
    created_at: new Date(Date.now() - 172800000).toISOString(),
    profiles: {
      full_name: 'Sophie Bernard',
      email: 'sophie.bernard@email.fr'
    },
    order_items: [
      {
        id: 'item-5',
        order_id: 'order-3',
        product_id: 'prod-9',
        quantity: 1,
        unit_price: 12.50,
        total_price: 12.50,
        products: { name: 'Couscous royal' }
      },
      {
        id: 'item-6',
        order_id: 'order-3',
        product_id: 'prod-13',
        quantity: 1,
        unit_price: 5.50,
        total_price: 5.50,
        products: { name: 'Salade marocaine' }
      }
    ]
  }
]

// Utilisateur connecté par défaut (admin)
export const DEFAULT_USER = MOCK_USERS[0]