// Script à exécuter dans la console du navigateur
// pour tester directement la requête Supabase

// 1. Récupérer le client Supabase depuis l'app
console.log('🔍 Test direct de la requête news...');

// 2. Exécuter la requête directement
const testQuery = async () => {
  try {
    console.log('🚀 Lancement test direct...');
    
    // Utiliser le client Supabase global de l'app
    const supabaseClient = window.supabase || 
      (window.React && window.React.createElement && 
       document.querySelector('[data-supabase]')?.supabase);
    
    if (!supabaseClient) {
      console.error('❌ Client Supabase non trouvé');
      return;
    }
    
    console.log('✅ Client Supabase trouvé');
    
    const { data, error } = await supabaseClient
      .from('news')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(3);
    
    console.log('📊 Résultat test direct:', {
      data: data,
      error: error,
      count: data ? data.length : 0
    });
    
    if (data && data.length > 0) {
      console.log('🎉 SUCCESS! Voici vos actualités:');
      data.forEach((news, index) => {
        console.log(`${index + 1}. "${news.title}" - ${news.excerpt || 'Pas d\'extrait'}`);
      });
    } else {
      console.log('❌ Aucune actualité trouvée');
    }
    
  } catch (err) {
    console.error('💥 Erreur test direct:', err);
  }
};

// 3. Lancer le test
testQuery();

// 4. Alternative : utiliser fetch direct
const testFetchDirect = async () => {
  try {
    console.log('🌐 Test avec fetch direct...');
    
    const response = await fetch('https://xtjzuqyvyzkzchwtjpeo.supabase.co/rest/v1/news?published=eq.true&order=created_at.desc&limit=3', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0anp1cXl2eXpremNod3RqcGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAyNzE4MTIsImV4cCI6MjAzNTg0NzgxMn0.YourAnonKeyHere',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0anp1cXl2eXpremNod3RqcGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjAyNzE4MTIsImV4cCI6MjAzNTg0NzgxMn0.YourAnonKeyHere',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('📡 Résultat fetch direct:', data);
    
  } catch (err) {
    console.error('💥 Erreur fetch direct:', err);
  }
};

console.log('📋 Pour tester avec fetch direct, tapez: testFetchDirect()');
