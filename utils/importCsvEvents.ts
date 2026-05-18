import { supabase } from '@/integrations/supabase/client';

export async function importCsvEvents(csvContent: string) {
  try {
    const { data, error } = await supabase.functions.invoke('import-csv-events', {
      body: { csvContent }
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error importing CSV events:', error);
    throw error;
  }
}
