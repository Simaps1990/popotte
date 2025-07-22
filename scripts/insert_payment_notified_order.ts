// Script d'insertion d'une commande 'payment_notified' pour test Supabase
import { createOrder } from '../src/lib/supabase';
import { supabase } from '../src/lib/supabaseClient';

async function main() {
  // Récupérer un utilisateur existant (admin ou user réel)
  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)
    .single();
  if (!user) throw new Error('Aucun utilisateur trouvé dans la table profiles');

  // Récupérer un produit existant
  const { data: product } = await supabase
    .from('products')
    .select('id, price')
    .eq('is_available', true)
    .limit(1)
    .single();
  if (!product) throw new Error('Aucun produit disponible trouvé');

  // Créer la commande
  const orderData = {
    user_id: user.id,
    items: [{
      product_id: product.id,
      quantity: 2,
      unit_price: product.price,
    }],
    total_amount: product.price * 2,
    status: 'payment_notified',
  };

  const order = await createOrder(orderData);
  console.log('Commande créée:', order);
}

main().catch(err => {
  console.error('Erreur lors de la création de la commande de test:', err);
  process.exit(1);
});
