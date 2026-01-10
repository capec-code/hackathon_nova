import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, corsHeaders, logAudit } from "./_shared/utils.js";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { id, type, status, note, org, approved_by } = await req.json();
    const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';
    
    const table = type === 'task' ? `tasks_${suffix}` : `attendance_${suffix}`;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(table)
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    logAudit(supabase, org, approved_by, 'approve', table, id, { status, note });

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
