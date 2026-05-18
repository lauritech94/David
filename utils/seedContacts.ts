import { supabase } from '@/integrations/supabase/client';

export async function seedContacts() {
  try {
    const { data, error } = await supabase.functions.invoke('seed-contacts');

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error seeding contacts:', error);
    throw error;
  }
}
