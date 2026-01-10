import { createAdminClient, corsHeaders, logAudit } from "../_shared/utils.js";

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { code: rawCode, device_id, org } = await req.json();
    const suffix = org === 'ITECPEC' ? 'itecpec' : 'capec';

    if (!rawCode) throw new Error("Missing code");
    const code = rawCode.trim();

    const supabase = createAdminClient(); // Do NOT pass req. We want Service Role access (Bypass RLS).

    const { data: vol, error: volError } = await supabase
      .from(`volunteers_${suffix}`)
      .select('id, name')
      .eq('unique_code', code)
      .single();

    if (volError || !vol) {
      console.log(`Checkin Failed: Code '${code}' not found. Error: ${JSON.stringify(volError)}`);

      const { data: actualRows } = await supabase.from(`volunteers_${suffix}`).select('name, unique_code').limit(5);
      const debugInfo = actualRows ? actualRows.map((r: any) => `${r.name}=${r.unique_code}`).join(', ') : 'No data';

      // Check the OTHER table to see if it's lost there
      const otherSuffix = suffix === 'itecpec' ? 'capec' : 'itecpec';
      const { data: lostVol } = await supabase.from(`volunteers_${otherSuffix}`).select('unique_code').eq('unique_code', code).single();

      // Check the OLD LEGACY table
      const { data: oldVol } = await supabase.from('volunteers').select('unique_code').eq('unique_code', code).single();

      let lostMsg = '';
      if (lostVol) lostMsg = `(FOUND IN WRONG TABLE: volunteers_${otherSuffix}!)`;
      else if (oldVol) lostMsg = `(FOUND IN DEPRECATED 'volunteers' TABLE! Please Create New Volunteer)`;
      else lostMsg = `(Not found in any table)`;

      throw new Error(`Invalid Code: '${code}'. DB has: [${debugInfo}]. ${lostMsg}`);
    }

    const { data: openSession } = await supabase
      .from(`attendance_${suffix}`)
      .select('id')
      .eq('volunteer_id', vol.id)
      .is('exit_time', null)
      .single();

    if (openSession) {
      return new Response(JSON.stringify({ success: false, error: 'Already checked in' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: newSession, error: checkinError } = await supabase
      .from(`attendance_${suffix}`)
      .insert({
        volunteer_id: vol.id,
        unique_code: code,
        device_id: device_id || 'manual',
        entry_time: new Date().toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (checkinError) throw checkinError;

    await logAudit(supabase, org, 'system', 'check-in', `attendance_${suffix}`, newSession.id, { code });

    return new Response(JSON.stringify({ success: true, data: newSession }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
