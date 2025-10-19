// Netlify Scheduled Function - Supabase Keep-Alive
// Cette fonction s'exécute automatiquement tous les 3 jours pour empêcher
// Supabase de se mettre en pause après 7 jours d'inactivité.
// Cron expression: "0 0 */3 * *" = Tous les 3 jours à minuit (UTC)

import type { Config } from '@netlify/functions'

const handler = async () => {
  try {
    // Récupérer les variables d'environnement (essayer avec et sans VITE_)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

    // Vérifier que les variables sont définies
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Variables d\'environnement Supabase manquantes')
    }

    // Appeler la fonction RPC keepalive_ping
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/keepalive_ping`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({})
      }
    )

    // Vérifier la réponse
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erreur HTTP ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    // Logger le succès
    console.log('✅ Supabase keep-alive ping réussi:', {
      timestamp: new Date().toISOString(),
      pingId: data.ping_id,
      totalPings: data.total_pings,
      message: data.message
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Supabase keep-alive ping successful',
        data: data,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    // Logger l'erreur
    console.error('❌ Erreur keep-alive ping:', error)

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      })
    }
  }
}

// Configuration de la fonction scheduled
export const config: Config = {
  // Exécuter tous les 3 jours à minuit (UTC)
  schedule: '0 0 */3 * *'
}

export default handler
