import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    if (!userKey) {
      return new Response(JSON.stringify({ error: 'Supabase Anon/Publishable Key missing in Deno env' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      userKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Check if the user is authenticated 
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: `Unauthorized or Token Expired: ${authError?.message || 'No user'}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const { action, payload } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set')
    }

    // Optional: Credit Check here
    // const { data: profile } = await supabaseClient.from('profiles').select('credits, role').eq('id', user.id).single()
    // if (profile?.role !== 'pro' && profile?.credits < 10) { ... }

    let result;

    if (action === 'generateContent') {
      const { model, contents, generationConfig } = payload
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig })
      })
      
      result = await response.json()
    } 
    else if (action === 'generateImage') {
      const { model, instances, parameters } = payload
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${GEMINI_API_KEY}`
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances, parameters })
      })
      
      result = await response.json()
    }
    else if (action === 'listModels') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
      const response = await fetch(url)
      result = await response.json()
    }
    else {
      throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: `Proxy Crash: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
