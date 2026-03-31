/**
 * Mayar.id Webhook Handler
 * Updates user credits after successful payment.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log('[Mayar Webhook] Received:', JSON.stringify(body))

    // Handle 'payment.received' event from Mayar
    // We expect user_id to be passed in metadata from the mayar payment link
    if (body.event === 'payment.received' && body.data.status === true) {
      const userId = body.data.metadata?.user_id
      const amount = body.data.amount
      const transactionId = body.data.id

      if (!userId) {
        throw new Error('user_id missing in payment metadata')
      }

      // Determine credits to add (e.g. 5000 credits for Rp 49.000)
      let creditsToAdd = 0;
      if (amount >= 45000) { // Safety margin for fees
         creditsToAdd = 5000;
      }

      if (creditsToAdd > 0) {
        // Increment credits in profiles
        const { data: profile, error: getError } = await supabaseClient
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single()

        if (getError) throw getError

        const newCredits = (profile.credits || 0) + creditsToAdd

        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ credits: newCredits, role: 'pro', updated_at: new Date().toISOString() })
          .eq('id', userId)

        if (updateError) throw updateError

        // Log the transaction
        await supabaseClient
          .from('transactions')
          .insert({
            user_id: userId,
            type: 'topup',
            amount: creditsToAdd,
            description: `Top-up via Mayar (Rp ${amount.toLocaleString()})`,
            metadata: { transaction_id: transactionId, gateway: 'mayar' }
          })

        console.log(`[Mayar Webhook] Success: Added ${creditsToAdd} credits to user ${userId}`)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[Mayar Webhook] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
