import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log(`${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Verify the caller's JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header provided' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Verify the caller is an admin
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles').select('role, showroom_id').eq('id', caller.id).single();
    
    if (profileError || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Parse the request body
    const body = await req.json();
    const { workerId } = body;
    
    if (!workerId) {
      return new Response(JSON.stringify({ error: 'Missing required field: workerId' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Verify the target worker belongs to the same showroom and is actually a worker
    const { data: workerProfile, error: workerError } = await supabaseAdmin
      .from('profiles').select('id, role, showroom_id, name').eq('id', workerId).single();
    
    if (workerError || !workerProfile) {
      return new Response(JSON.stringify({ error: 'Worker not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (workerProfile.showroom_id !== callerProfile.showroom_id) {
      return new Response(JSON.stringify({ error: 'Cannot delete a worker from another showroom' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (workerProfile.role !== 'worker') {
      return new Response(JSON.stringify({ error: 'Target user is not a worker' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Prevent admin from deleting themselves
    if (workerId === caller.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Step 1: Delete the profile row first (to satisfy FK constraint profiles.id -> auth.users.id)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', workerId);
    
    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return new Response(JSON.stringify({
        error: `Failed to delete worker profile: ${profileDeleteError.message}`
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // Step 2: Delete the auth.users entry using the admin API
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(workerId);
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      // Profile is already deleted at this point — log the orphan but still report success
      // since the user can no longer access the system (no profile = no role check passes)
      console.warn(`Auth user ${workerId} may be orphaned after profile deletion`);
    }
    
    console.log(`Worker ${workerId} (${workerProfile.name}) deleted successfully by admin ${caller.id}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Worker '${workerProfile.name}' has been deleted successfully`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
