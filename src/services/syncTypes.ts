/**
 * Types pour le service de synchronisation temps réel
 */

// Types d'événements de synchronisation
export type SyncEventType = 'product_change' | 'category_change' | 'order_change';

// Interface pour les payloads d'événements Supabase
export interface SupabaseEventPayload {
  eventType: string;
  new?: { id: string; [key: string]: any };
  old?: { id: string; [key: string]: any };
}

// Interface pour les payloads d'événements de synchronisation
export interface SyncEventPayload {
  type: string;
  id: string;
  data?: any;
}

// Interface pour les callbacks de synchronisation
export interface SyncCallback {
  (payload: SyncEventPayload): void;
}

// Interface pour les canaux Supabase
export interface SupabaseChannel {
  on: (event: string, filter: any, callback: (payload: SupabaseEventPayload) => void) => SupabaseChannel;
  subscribe: (callback?: (status: string) => void) => SupabaseChannel;
  unsubscribe: () => void;
  send?: (payload: any) => SupabaseChannel;
}
