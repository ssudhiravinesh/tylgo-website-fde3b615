import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Password policy: min 8 chars, at least 1 letter, at least 1 number, no spaces
const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*\d)[^\s]{8,}$/;

// Username policy: 3-30 chars, alphanumeric + dots/underscores/hyphens
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;

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
    
    // Check if the requesting user is an admin and get their showroom_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, showroom_id')
      .eq('id', user.id)
      .single();
    
    console.log('Profile check:', {
      role: profile?.role,
      showroom_id: profile?.showroom_id,
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

    const adminShowroomId = profile.showroom_id;
    
    // Parse the request body
    const body = await req.json();
    const { name, email, password, username } = body;
    
    console.log('Request data:', {
      name: !!name,
      email: !!email,
      username: !!username,
      passwordLength: password?.length
    });
    
    // ── Validate required fields ──────────────────────────────────
    if (!name || !email || !password || !username) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: name, email, username, password'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // ── Validate username format ──────────────────────────────────
    if (!USERNAME_REGEX.test(username)) {
      return new Response(JSON.stringify({
        error: 'Username must be 3-30 characters and contain only letters, numbers, dots, underscores, or hyphens'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // ── Validate password strength ───────────────────────────────
    if (!PASSWORD_REGEX.test(password)) {
      return new Response(JSON.stringify({
        error: 'Password must be at least 8 characters with at least 1 letter and 1 number'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // ── Check username uniqueness (case-insensitive) ─────────────
    console.log('Checking username uniqueness:', username);
    const { data: existingUsername, error: usernameCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();
    
    if (usernameCheckError) {
      console.error('Error checking username:', usernameCheckError);
      return new Response(JSON.stringify({
        error: 'Failed to check username availability'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (existingUsername) {
      return new Response(JSON.stringify({
        error: 'This username is already taken. Please choose a different one.'
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // ── Check email uniqueness — handle orphaned auth users ────
    // An orphan is an auth.users entry with no corresponding profile row
    // (caused by previous buggy delete that only removed the profile).
    console.log('Checking if user already exists:', email);
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
    
    const matchingUser = existingUser.users.find(u => u.email === email);
    if (matchingUser) {
      // Check if this is an orphaned auth user (no profile exists)
      const { data: orphanProfile } = await supabaseAdmin
        .from('profiles').select('id').eq('id', matchingUser.id).maybeSingle();
      
      if (orphanProfile) {
        // Real active user — block creation
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
      
      // Orphaned auth user — clean it up so we can re-create
      console.log(`Cleaning up orphaned auth user ${matchingUser.id} (${email}) before re-creation`);
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(matchingUser.id);
      if (cleanupError) {
        console.error('Failed to clean up orphaned auth user:', cleanupError);
        return new Response(JSON.stringify({
          error: 'Failed to clean up stale account data. Please contact support.'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      console.log(`Orphaned auth user ${matchingUser.id} cleaned up successfully`);
    }
    
    // ── Create the worker account ────────────────────────────────
    console.log('Creating worker account for:', email, 'username:', username, 'in showroom:', adminShowroomId);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role: 'worker',
        showroom_id: adminShowroomId,
        username
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
    
    // ── Create profile record ────────────────────────────────────
    // The trigger should handle this, but we upsert to be safe
    console.log('Creating profile for user:', authData.user.id, 'with showroom:', adminShowroomId);
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        name,
        email,
        username,
        role: 'worker',
        showroom_id: adminShowroomId
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });
    
    if (profileInsertError) {
      console.error('Profile creation failed:', profileInsertError);
      // If profile creation fails, delete the auth user
      console.log('Cleaning up auth user due to profile creation failure');
      
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
    
    console.log('Profile created successfully for user:', authData.user.id);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Worker account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username,
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