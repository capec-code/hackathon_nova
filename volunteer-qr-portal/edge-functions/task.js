import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, corsHeaders, logAudit } from "./_shared/utils.js";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code, title, description, org } = await req.json();
    const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';

    const supabase = createAdminClient();

    const { data: vol } = await supabase.from(`volunteers_${suffix}`).select('id').eq('unique_code', code).single();
    if (!vol) throw new Error("Invalid Code");

    const { data: task, error } = await supabase
      .from(`tasks_${suffix}`)
      .insert({
        volunteer_id: vol.id,
        unique_code: code,
        title,
        description,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    logAudit(supabase, org, 'volunteer', 'create_task', `tasks_${suffix}`, task.id, { title });

    return new Response(JSON.stringify({ success: true, data: task }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
