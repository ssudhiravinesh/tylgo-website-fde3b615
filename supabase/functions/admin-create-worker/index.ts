import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  console.log(`${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Create a Supabase client with service role (admin) privileges
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'No authorization header provided'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Extract the JWT token from the authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token using the admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    console.log('User verification:', {
      userId: user?.id,
      error: userError?.message
    });
    
    if (userError || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid authentication'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Check if the requesting user is an admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    console.log('Profile check:', {
      role: profile?.role,
      error: profileError?.message
    });
    
    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Parse the request body
    const body = await req.json();
    const { name, email, password } = body;
    
    console.log('Request data:', {
      name: !!name,
      email: !!email,
      passwordLength: password?.length
    });
    
    if (!name || !email || !password) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: name, email, password'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (password.length < 6) {
      return new Response(JSON.stringify({
        error: 'Password must be at least 6 characters long'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
    });
    
    if (authError) {
      console.error('Auth user creation failed:', authError);
      return new Response(JSON.stringify({
        error: authError.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!authData.user) {
      return new Response(JSON.stringify({
        error: 'Failed to create user account'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
      });
    
    if (profileInsertError) {
      console.error('Profile creation failed:', profileInsertError);
      // If profile creation fails, delete the auth user
      console.log('Cleaning up auth user due to profile creation failure');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return new Response(JSON.stringify({
        error: profileInsertError.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log('Profile created successfully for user:', authData.user.id);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Worker account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});