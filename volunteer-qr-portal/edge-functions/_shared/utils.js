import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, device-api-key',
}

export function createAdminClient(req) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization') } } }
  )
}

export function createAnonClient(req) {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization') } } }
      )
}

export async function logAudit(supabase, { actor, actor_id, action, target_type, target_id, payload }) {
    await supabase.from('audit_log').insert({
        actor,
        actor_id,
        action,
        target_type,
        target_id,
        payload
    })
}
