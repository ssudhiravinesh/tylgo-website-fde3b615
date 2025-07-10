import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('Admin reset password function called');

  try {
    // Create a Supabase client with admin privileges
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization')
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header')
    }

    // Create a client to verify the requesting user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            authorization: authHeader
          }
        }
      }
    )

    // Verify the requesting user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    console.log('User verification:', { user: !!user, error: userError });
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      throw new Error('Invalid authentication')
    }

    // Check if the requesting user is an admin using the admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      throw new Error('Failed to verify user role')
    }

    console.log('User role:', profile?.role);
    
    if (profile?.role !== 'admin') {
      console.error('Access denied. User role:', profile?.role);
      throw new Error('Insufficient privileges. Admin access required.')
    }

    // Parse the request body
    const { userId, newPassword } = await req.json()
    console.log('Request data:', { userId: !!userId, passwordLength: newPassword?.length });

    if (!userId || !newPassword) {
      console.error('Missing required fields:', { userId: !!userId, newPassword: !!newPassword });
      throw new Error('Missing userId or newPassword')
    }

    if (newPassword.length < 6) {
      console.error('Password too short:', newPassword.length);
      throw new Error('Password must be at least 6 characters long')
    }

    // Update the user's password using admin privileges
    console.log('Attempting to update password for user:', userId);
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (error) {
      console.error('Password update failed:', error);
      throw error
    }
    
    console.log('Password updated successfully for user:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in admin-reset-password function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})