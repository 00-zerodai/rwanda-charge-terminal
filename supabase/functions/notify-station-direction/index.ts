import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) return jsonResponse({ error: "Authentication required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    console.error("Supabase function environment is incomplete");
    return jsonResponse({ error: "Notification service is not configured" }, 500);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: "Invalid authentication" }, 401);
  }

  let stationId: string;
  try {
    const body: unknown = await request.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("stationId" in body) ||
      typeof body.stationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.stationId)
    ) {
      return jsonResponse({ error: "A valid stationId is required" }, 400);
    }
    stationId = body.stationId;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { data: directionResult, error: directionError } = await userClient
    .rpc("record_station_direction_request", { p_station_id: stationId });
  if (directionError) {
    console.error("Could not record station direction request", directionError.message);
    return jsonResponse({ error: "Could not record direction request" }, 500);
  }

  const result = directionResult?.[0];
  if (!result?.owner_notified) {
    return jsonResponse({ recorded: result?.event_recorded ?? false, ownerNotified: false });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: station, error: stationError } = await adminClient
    .from("community_stations")
    .select("name, owner_id")
    .eq("id", stationId)
    .maybeSingle();
  if (stationError || !station) {
    console.error("Could not load station for owner email", stationError?.message);
    return jsonResponse({ error: "Direction was recorded, but the owner email could not be prepared" }, 500);
  }

  const { data: ownerData, error: ownerError } = await adminClient.auth.admin.getUserById(station.owner_id);
  const ownerEmail = ownerData.user?.email;
  if (ownerError || !ownerEmail) {
    console.error("Could not load station owner email", ownerError?.message);
    return jsonResponse({ error: "Direction was recorded, but the owner email is unavailable" }, 500);
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendApiKey || !emailFrom) {
    console.error("Resend email environment is incomplete");
    return jsonResponse({ error: "Direction was recorded, but email is not configured" }, 503);
  }

  const ownerPortalUrl = `${Deno.env.get("SITE_URL") ?? "https://voltarw.com"}/owner`;
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: [ownerEmail],
      subject: "A Volta driver requested directions to your station",
      text: [
        `Hello,`,
        ``,
        `A Volta user just requested directions to ${station.name}. This is a sign of driver interest, but it does not confirm arrival or charging.`,
        ``,
        `You can manage your station, update available slots, and choose a plan in your owner portal:`,
        ownerPortalUrl,
        ``,
        `Starter — 20,000 RWF/month: Verified pin and direct phone/WhatsApp button`,
        `Pro Host — 145,000 RWF/month: Live availability, photos, and top map placement`,
        `Network — from 300,000 RWF/month: Multi-charger management and monthly driver analytics`,
        ``,
        `Plan payments through Volta are coming soon. Selecting a plan does not charge you or activate paid features yet.`,
        ``,
        `The Volta team`,
      ].join("\n"),
    }),
  });

  if (!emailResponse.ok) {
    const responseText = await emailResponse.text();
    console.error("Resend rejected station owner email", emailResponse.status, responseText);
    return jsonResponse({ error: "Direction was recorded, but the owner email could not be sent" }, 502);
  }

  return jsonResponse({ recorded: true, ownerNotified: true, emailSent: true });
});
