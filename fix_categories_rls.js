// Script pour corriger les politiques RLS de la table categories
// À exécuter dans la console du navigateur ou via Node.js avec le client Supabase

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xtjzuqyvyzkzchwtjpeo.supabase.co'
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY' // Remplacer par la clé service role

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixCategoriesRLS() {
  console.log('🔧 Correction des politiques RLS pour la table categories...')
  
  try {
    // Vérifier les politiques actuelles
    console.log('📋 Vérification des politiques actuelles...')
    const { data: currentPolicies, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'categories';
      `
    })
    
    if (checkError) {
      console.error('❌ Erreur lors de la vérification des politiques:', checkError)
    } else {
      console.log('📋 Politiques actuelles:', currentPolicies)
    }

    // Supprimer les anciennes politiques
    console.log('🗑️ Suppression des anciennes politiques...')
    const dropPolicies = [
      'DROP POLICY IF EXISTS "categories_select_policy" ON categories;',
      'DROP POLICY IF EXISTS "categories_insert_policy" ON categories;',
      'DROP POLICY IF EXISTS "categories_update_policy" ON categories;',
      'DROP POLICY IF EXISTS "categories_delete_policy" ON categories;'
    ]

    for (const sql of dropPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) console.error('⚠️ Erreur lors de la suppression:', error)
    }

    // Créer les nouvelles politiques
    console.log('✨ Création des nouvelles politiques...')
    const newPolicies = [
      // SELECT - Accessible à tous
      `CREATE POLICY "categories_select_policy" ON categories
        FOR SELECT
        USING (true);`,
      
      // INSERT - Admins seulement
      `CREATE POLICY "categories_insert_policy" ON categories
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
              auth.users.raw_app_meta_data->>'roles' @> '["admin"]'
              OR auth.users.raw_user_meta_data->>'role' = 'admin'
              OR auth.users.app_metadata->>'roles' @> '["admin"]'
              OR auth.users.user_metadata->>'role' = 'admin'
            )
          )
        );`,
      
      // UPDATE - Admins seulement
      `CREATE POLICY "categories_update_policy" ON categories
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
              auth.users.raw_app_meta_data->>'roles' @> '["admin"]'
              OR auth.users.raw_user_meta_data->>'role' = 'admin'
              OR auth.users.app_metadata->>'roles' @> '["admin"]'
              OR auth.users.user_metadata->>'role' = 'admin'
            )
          )
        );`,
      
      // DELETE - Admins seulement
      `CREATE POLICY "categories_delete_policy" ON categories
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND (
              auth.users.raw_app_meta_data->>'roles' @> '["admin"]'
              OR auth.users.raw_user_meta_data->>'role' = 'admin'
              OR auth.users.app_metadata->>'roles' @> '["admin"]'
              OR auth.users.user_metadata->>'role' = 'admin'
            )
          )
        );`
    ]

    for (const sql of newPolicies) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        console.error('❌ Erreur lors de la création de politique:', error)
      } else {
        console.log('✅ Politique créée avec succès')
      }
    }

    // Vérifier les nouvelles politiques
    console.log('🔍 Vérification des nouvelles politiques...')
    const { data: newPoliciesData, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'categories';
      `
    })
    
    if (verifyError) {
      console.error('❌ Erreur lors de la vérification:', verifyError)
    } else {
      console.log('✅ Nouvelles politiques:', newPoliciesData)
    }

    console.log('🎉 Correction des politiques RLS terminée !')
    
  } catch (error) {
    console.error('❌ Erreur générale:', error)
  }
}

// Exécuter la correction
fixCategoriesRLS()

// Alternative: Commandes SQL directes à exécuter dans l'interface Supabase
console.log(`
📋 COMMANDES SQL À EXÉCUTER DANS L'INTERFACE SUPABASE :

-- 1. Supprimer les anciennes politiques
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- 2. Créer les nouvelles politiques
CREATE POLICY "categories_select_policy" ON categories
  FOR SELECT
  USING (true);

CREATE POLICY "categories_insert_policy" ON categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_app_meta_data->>'roles' @> '["admin"]'
        OR auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.app_metadata->>'roles' @> '["admin"]'
        OR auth.users.user_metadata->>'role' = 'admin'
      )
    )
  );

CREATE POLICY "categories_update_policy" ON categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_app_meta_data->>'roles' @> '["admin"]'
        OR auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.app_metadata->>'roles' @> '["admin"]'
        OR auth.users.user_metadata->>'role' = 'admin'
      )
    )
  );

CREATE POLICY "categories_delete_policy" ON categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND (
        auth.users.raw_app_meta_data->>'roles' @> '["admin"]'
        OR auth.users.raw_user_meta_data->>'role' = 'admin'
        OR auth.users.app_metadata->>'roles' @> '["admin"]'
        OR auth.users.user_metadata->>'role' = 'admin'
      )
    )
  );
`)
