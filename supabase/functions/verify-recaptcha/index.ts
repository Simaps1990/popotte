// Configuration du serveur Edge
// Note: Les fonctions Edge de Supabase s'exécutent dans un environnement similaire à Deno

// Interface pour la requête
interface RecaptchaRequest {
  token: string;
}

// Interface pour la réponse de l'API reCAPTCHA
interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  score?: number;
  action?: string;
}

// Fonction principale
export default async (req: Request) => {
  try {
    // Vérifier que la méthode est POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Méthode non autorisée' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer la clé secrète depuis les variables d'environnement
    const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';
    if (!RECAPTCHA_SECRET_KEY) {
      console.error('RECAPTCHA_SECRET_KEY non définie');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parser le corps de la requête
    const requestData: RecaptchaRequest = await req.json();
    
    if (!requestData.token) {
      return new Response(
        JSON.stringify({ error: 'Token manquant' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le token avec l'API reCAPTCHA
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${requestData.token}`;
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    const data: RecaptchaResponse = await response.json();

    // Vérifier la réponse de reCAPTCHA
    if (!data.success) {
      const errorDetails = data['error-codes'] || ['unknown_error'];
      console.error('Échec de la vérification reCAPTCHA:', errorDetails);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Échec de la vérification reCAPTCHA', 
          details: errorDetails 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          } 
        }
      );
    }

    // Vérifier le score (optionnel, pour reCAPTCHA v3)
    if (data.score && data.score < 0.5) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Activité suspecte détectée',
          score: data.score
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Si tout est bon, retourner un succès
    return new Response(
      JSON.stringify({ 
        success: true, 
        score: data.score || 1.0, // Valeur par défaut si non fournie
        challenge_ts: data.challenge_ts,
        hostname: data.hostname,
        action: data.action
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        } 
      }
    );

  } catch (error) {
    console.error('Erreur lors de la vérification reCAPTCHA:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        } 
      }
    );
  }
};
