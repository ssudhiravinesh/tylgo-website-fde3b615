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
    if (!authHeader) {
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
    if (userError || !user) {
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

    if (profile.role !== 'admin') {
      throw new Error('Insufficient privileges. Admin access required.')
    }

    // Parse the request body
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      throw new Error('Missing required fields: name, email, password')
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long')
    }

    // Create the worker account using admin privileges
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
      throw new Error('Failed to create user account')
    }

    // Create profile record using admin client
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
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileInsertError
    }

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