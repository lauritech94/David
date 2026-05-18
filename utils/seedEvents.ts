import { supabase } from '@/integrations/supabase/client';

export async function seedEvents() {
  try {
    const { data, error } = await supabase.functions.invoke('seed-events');

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error seeding events:', error);
    throw error;
  }
}
