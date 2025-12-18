import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { photoUrl, category, patientId } = await req.json();
    
    if (!photoUrl || !category || !patientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build category-specific validation prompt
    let validationPrompt = '';
    switch (category) {
      case 'gym':
        validationPrompt = `Analyze this photo and determine if it shows someone exercising at a gym, doing workout activities, or engaging in physical fitness. Look for gym equipment, workout attire, exercise poses, or fitness environments.`;
        break;
      case 'healthy_meal':
        validationPrompt = `Analyze this photo and determine if it shows a healthy meal or nutritious food. Look for vegetables, fruits, lean proteins, whole grains, salads, or balanced meal preparations.`;
        break;
      case 'medication':
        validationPrompt = `Analyze this photo and determine if it shows someone taking medication, holding medication, or medication-related items like pill bottles, insulin pens, or medical supplies.`;
        break;
    }

    const fullPrompt = `${validationPrompt}

IMPORTANT: You must respond with a JSON object in exactly this format:
{
  "isValid": true or false,
  "confidence": number between 0 and 100,
  "description": "brief description of what you see",
  "category_match": true or false,
  "detected_elements": ["list", "of", "relevant", "elements", "detected"]
}

Only return the JSON, no other text.`;

    console.log('Sending photo for AI validation:', category);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: fullPrompt },
              { type: 'image_url', image_url: { url: photoUrl } }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI validation failed:', errorText);
      throw new Error(`AI validation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', aiContent);

    // Parse the AI response
    let validationResult;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        validationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      validationResult = {
        isValid: false,
        confidence: 0,
        description: 'Could not validate photo',
        category_match: false,
        detected_elements: []
      };
    }

    // Check if patient already submitted a photo for this category today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingPhoto, error: checkError } = await supabase
      .from('health_photos')
      .select('id')
      .eq('patient_id', patientId)
      .eq('category', category)
      .eq('photo_date', today)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing photo:', checkError);
    }

    const alreadySubmittedToday = !!existingPhoto;
    
    // Determine lollipops to award
    let lollipopsToAward = 0;
    if (validationResult.isValid && validationResult.category_match && !alreadySubmittedToday) {
      // Award based on category
      switch (category) {
        case 'gym':
          lollipopsToAward = 2;
          break;
        case 'healthy_meal':
          lollipopsToAward = 1;
          break;
        case 'medication':
          lollipopsToAward = 3; // Higher reward for medication adherence
          break;
      }
    }

    return new Response(
      JSON.stringify({
        validation: validationResult,
        lollipopsToAward,
        alreadySubmittedToday,
        photoDate: today
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in validate-health-photo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
