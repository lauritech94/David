import { supabase } from '@/integrations/supabase/client';

interface MarketingEvent {
  title: string;
  date: string;
  time?: string;
  event_type: string;
}

const MARKETING_EVENTS_2025_2026: MarketingEvent[] = [
  { title: "Anuncio: new album & tour 2026", date: "2025-11-28", event_type: "marketing" },
  { title: "Teaser letra (S01)", date: "2025-12-11", event_type: "marketing" },
  { title: "Teaser letra (S01)", date: "2026-01-11", event_type: "marketing" },
  { title: "Mensaje hogar: tenemos disco", date: "2026-01-12", event_type: "marketing" },
  { title: "Concepto del disco", date: "2026-02-13", event_type: "marketing" },
  { title: "Trailer Single 01 (fecha 21/02)", date: "2026-02-16", event_type: "marketing" },
  { title: "Release Single 01 + videoclip", date: "2026-02-21", event_type: "marketing" },
  { title: "Anuncio nuevas fechas (tour)", date: "2026-03-04", event_type: "marketing" },
  { title: "Celebrando recibida S01", date: "2026-03-09", event_type: "marketing" },
  { title: "Teaser letra (S02)", date: "2026-03-24", event_type: "marketing" },
  { title: "Aviso S02 (mañana OUT)", date: "2026-03-26", event_type: "marketing" },
  { title: "Trailer Single 02 (visualiser)", date: "2026-03-28", event_type: "marketing" },
  { title: "Anuncio fecha álbum 16/05/2026", date: "2026-04-02", event_type: "marketing" },
  { title: "Portada & contraportada álbum", date: "2026-04-03", event_type: "marketing" },
  { title: "Anuncio Single 03 (sale 00:00)", date: "2026-04-10", time: "00:00", event_type: "marketing" },
  { title: "Corte Single 03 (Lucía & Rita)", date: "2026-04-11", event_type: "marketing" },
  { title: "Calentando tour (1ª fecha 28/05)", date: "2026-04-20", event_type: "marketing" },
  { title: "Single 04 (visualiser)", date: "2026-04-29", event_type: "marketing" },
  { title: "Cuenta atrás gira (1 semana)", date: "2026-05-09", event_type: "marketing" },
  { title: "Último single (S05) — 18:00", date: "2026-05-13", time: "18:00", event_type: "marketing" },
  { title: "Corte Single 05", date: "2026-05-14", event_type: "marketing" },
  { title: "ÁLBUM FUERA — Tracklist", date: "2026-05-16", event_type: "marketing" },
  { title: "Anuncio show México", date: "2026-05-19", event_type: "marketing" },
  { title: "Release sesión en vídeo", date: "2026-06-02", event_type: "marketing" },
  { title: "Portada revista tipo DUST", date: "2026-06-09", event_type: "marketing" },
  { title: "Anuncio gira internacional", date: "2026-09-30", event_type: "marketing" },
];

export async function importMarketingEvents() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    // Get user's profile to get artist_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profileError) throw profileError;

    // Get first artist (or you can modify to select specific artist)
    const { data: artists, error: artistError } = await supabase
      .from('artists')
      .select('id')
      .limit(1)
      .single();

    if (artistError || !artists) {
      throw new Error('No artist found. Please create an artist first.');
    }

    const artistId = artists.id;

    // Prepare events for insertion
    const eventsToInsert = MARKETING_EVENTS_2025_2026.map(event => {
      const startDate = event.time 
        ? `${event.date}T${event.time}:00Z`
        : `${event.date}T12:00:00Z`;
      
      const endDate = event.time
        ? `${event.date}T${event.time}:00Z`
        : `${event.date}T13:00:00Z`;

      return {
        title: event.title,
        start_date: startDate,
        end_date: endDate,
        event_type: event.event_type,
        artist_id: artistId,
        created_by: user.id,
      };
    });

    // Insert events
    const { data, error } = await supabase
      .from('events')
      .insert(eventsToInsert)
      .select();

    if (error) throw error;

    return { success: true, count: data.length };
  } catch (error) {
    console.error('Error importing marketing events:', error);
    throw error;
  }
}
