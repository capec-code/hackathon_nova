import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, corsHeaders } from "./_shared/utils.js";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const org = url.searchParams.get('org'); 
    
    if (!code || !org) throw new Error("Missing code or org param");

    const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';
    const supabase = createAdminClient();

    const { data: vol, error } = await supabase
      .from(`volunteers_${suffix}`)
      .select('*')
      .eq('unique_code', code)
      .single();

    if (error || !vol) throw new Error("Volunteer not found");

    const [att, tasks] = await Promise.all([
        supabase.from(`attendance_${suffix}`).select('*').eq('volunteer_id', vol.id).order('entry_time', {ascending: false}).limit(10),
        supabase.from(`tasks_${suffix}`).select('*').eq('volunteer_id', vol.id).order('created_at', {ascending: false}).limit(10)
    ]);

    return new Response(JSON.stringify({
        success: true,
        data: {
            volunteer: vol,
            attendance: att.data,
            tasks: tasks.data
        }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
