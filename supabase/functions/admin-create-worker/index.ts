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

  console.log('Admin create worker function called');

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
    const { name, email, password } = await req.json()
    console.log('Request data:', { name: !!name, email: !!email, passwordLength: password?.length });

    if (!name || !email || !password) {
      console.error('Missing required fields:', { name: !!name, email: !!email, password: !!password });
      throw new Error('Missing required fields: name, email, password')
    }

    if (password.length < 6) {
      console.error('Password too short:', password.length);
      throw new Error('Password must be at least 6 characters long')
    }

    // Create the worker account using admin privileges
    console.log('Creating worker account for:', email);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role: 'worker'
      },
      email_confirm: true // Auto-confirm email
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      throw authError
    }

    if (!authData.user) {
      console.error('No user data returned from auth creation');
      throw new Error('Failed to create user account')
    }
    
    console.log('User created successfully:', authData.user.id);

    // Create profile record using admin client
    console.log('Creating profile for user:', authData.user.id);
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        name,
        email,
        role: 'worker'
      })

    if (profileInsertError) {
      console.error('Error creating profile:', profileInsertError)
      // If profile creation fails, delete the auth user
      console.log('Cleaning up auth user due to profile creation failure');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileInsertError
    }
    
    console.log('Profile created successfully for user:', authData.user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Worker account created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in admin-create-worker function:', error)
    
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