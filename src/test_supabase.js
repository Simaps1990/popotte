// Script de test pour diagnostiquer les timeouts Supabase
import { supabase } from './lib/supabase';

// Test 1: Requête simple COUNT sur la table news
async function testNewsCount() {
  console.log('🧪 Test 1: COUNT sur la table news...');
  const startTime = Date.now();
  
  try {
    const { data, error, count } = await supabase
      .from('news')
      .select('*', { count: 'exact', head: true })
      .timeout(30000); // timeout de 30 secondes
    
    const endTime = Date.now();
    console.log(`⏱️ Durée: ${endTime - startTime}ms`);
    
    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }
    
    console.log('✅ Succès! Nombre d\'enregistrements:', count);
  } catch (e) {
    const endTime = Date.now();
    console.error(`❌ Exception après ${endTime - startTime}ms:`, e);
  }
}

// Test 2: Requête simple sur la table test_news
async function testTemporaryTable() {
  console.log('🧪 Test 2: SELECT sur la table test_news...');
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase
      .from('test_news')
      .select('*')
      .timeout(30000); // timeout de 30 secondes
    
    const endTime = Date.now();
    console.log(`⏱️ Durée: ${endTime - startTime}ms`);
    
    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }
    
    console.log('✅ Succès! Données:', data);
  } catch (e) {
    const endTime = Date.now();
    console.error(`❌ Exception après ${endTime - startTime}ms:`, e);
  }
}

// Test 3: Requête directe via fetch sur l'endpoint REST
async function testDirectFetch() {
  console.log('🧪 Test 3: Requête directe via fetch...');
  const startTime = Date.now();
  
  // Récupérer l'URL et la clé anonyme de Supabase depuis l'environnement
  const supabaseUrl = supabase.supabaseUrl;
  const supabaseKey = supabase.supabaseKey;
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/news?select=count`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      },
      signal: AbortSignal.timeout(30000) // timeout de 30 secondes
    });
    
    const endTime = Date.now();
    console.log(`⏱️ Durée: ${endTime - startTime}ms`);
    
    if (!response.ok) {
      console.error('❌ Erreur HTTP:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Détails:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Succès! Réponse:', data);
  } catch (e) {
    const endTime = Date.now();
    console.error(`❌ Exception après ${endTime - startTime}ms:`, e);
  }
}

// Exécuter les tests
async function runTests() {
  console.log('🚀 Démarrage des tests de diagnostic Supabase...');
  
  await testNewsCount();
  console.log('\n-----------------------------------\n');
  
  await testTemporaryTable();
  console.log('\n-----------------------------------\n');
  
  await testDirectFetch();
  console.log('\n-----------------------------------\n');
  
  console.log('✅ Tests terminés!');
}

runTests();
