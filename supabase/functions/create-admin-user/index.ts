
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
    
    // Parse the request body
    const body = await req.json();
    const { name, email, password } = body;
    
    console.log('Creating admin user:', { name, email });
    
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
    
    // Check if user with this email already exists
    const { data: existingUser, error: existingUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (existingUserError) {
      console.error('Error checking existing users:', existingUserError);
      return new Response(JSON.stringify({
        error: 'Failed to check existing users'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const userExists = existingUser.users.some(u => u.email === email);
    if (userExists) {
      console.log('User already exists:', email);
      return new Response(JSON.stringify({
        error: 'User with this email already exists'
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Create the admin user account
    console.log('Creating admin account for:', email);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role: 'admin'
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
    
    // Create profile record
    console.log('Creating profile for admin user:', authData.user.id);
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        name,
        email,
        role: 'admin'
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });
    
    if (profileInsertError) {
      console.error('Profile creation failed:', profileInsertError);
      
      // If profile creation fails, delete the auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.log('Auth user cleaned up successfully');
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user:', cleanupError);
      }
      
      return new Response(JSON.stringify({
        error: `Profile creation failed: ${profileInsertError.message}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log('Admin user and profile created successfully');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role: 'admin'
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
