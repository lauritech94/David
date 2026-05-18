import { supabase } from '@/integrations/supabase/client';

interface ConcertData {
  date_iso: string;
  weekday_locale: string;
  festival_cycle: string;
  city: string;
  venue: string;
  capacity: number | null;
  time_local: string;
  offer_eur: number | null;
  status: string;
  format: string;
  lineup: string;
  manager: string;
  band_size_hint: string;
  logistics: string;
  ticket_link: string;
  contracts_status: string;
  notes: string;
}

const CONCERTS_2025: ConcertData[] = [
  {
    "date_iso": "2025-10-19",
    "weekday_locale": "diumenge",
    "festival_cycle": "CICLO TANDEM",
    "city": "Coruña",
    "venue": "Teatro Colón",
    "capacity": 800,
    "time_local": "21:00",
    "offer_eur": 13000,
    "status": "Confirmado",
    "format": "Quinteto",
    "lineup": "Rita Payés",
    "manager": "Marco (CityZen)",
    "band_size_hint": "10",
    "logistics": "Rider técnico. No cubren viajes, hotel ni backline. Noche compartida con Nacho Faia Lar con colaboración.",
    "ticket_link": "http://www.teatrocolon.es/es/evento/ciclo-tandem-nacho-faia-lar-rita-payes/",
    "contracts_status": "Firmado",
    "notes": ""
  },
  {
    "date_iso": "2025-10-22",
    "weekday_locale": "dimecres",
    "festival_cycle": "Druga Godba",
    "city": "Ljubljana",
    "venue": "Kino Šiška",
    "capacity": 420,
    "time_local": "20:00",
    "offer_eur": 6000,
    "status": "Confirmado",
    "format": "Trio",
    "lineup": "Rita Payés (feat. Elisabeth Roma & Pol Batlle)",
    "manager": "Marco (CityZen)",
    "band_size_hint": "10",
    "logistics": "Promotor provee PA, luces, catering, backline, transports, hotel y cena. Pago 50% un mes antes y 50% día del show. Net of taxes.",
    "ticket_link": "https://www.mojekarte.si/en/sogodbe-rita-pay-s/tickets-1203370.html",
    "contracts_status": "Firmado",
    "notes": ""
  },
  {
    "date_iso": "2025-10-24",
    "weekday_locale": "divendres",
    "festival_cycle": "GAS Territory (ventana 24–29 OCT)",
    "city": "",
    "venue": "",
    "capacity": null,
    "time_local": "",
    "offer_eur": null,
    "status": "Interest",
    "format": "Trio",
    "lineup": "Rita Payés (Elisabeth Roma & Pol Batlle)",
    "manager": "Marco (CityZen)",
    "band_size_hint": "",
    "logistics": "",
    "ticket_link": "",
    "contracts_status": "",
    "notes": "Penciled para GAS Territory del 24 al 29 OCT"
  },
  {
    "date_iso": "2025-10-24",
    "weekday_locale": "divendres",
    "festival_cycle": "Rita & Magalí & Lucía…",
    "city": "Barcelona",
    "venue": "BCN",
    "capacity": null,
    "time_local": "",
    "offer_eur": null,
    "status": "Interest",
    "format": "Otro",
    "lineup": "Rita / Magalí / Lucía",
    "manager": "Rita C.",
    "band_size_hint": "",
    "logistics": "PENCILED PARA GAS TERRITORY DEL 24 AL 29 OCT",
    "ticket_link": "",
    "contracts_status": "",
    "notes": ""
  },
  {
    "date_iso": "2025-10-25",
    "weekday_locale": "dissabte",
    "festival_cycle": "Enjoy Jazz",
    "city": "Mannheim",
    "venue": "",
    "capacity": null,
    "time_local": "",
    "offer_eur": 4250,
    "status": "Cancelado",
    "format": "Trio",
    "lineup": "Rita Payés (Elisabeth Roma & Pol Batlle)",
    "manager": "Marco (CityZen)",
    "band_size_hint": "",
    "logistics": "PA, luces, catering, transports, backline y hotel. Major festival en Mannheim/Heidelberg/Ludwigshafen.",
    "ticket_link": "",
    "contracts_status": "Firmado",
    "notes": ""
  },
  {
    "date_iso": "2025-10-26",
    "weekday_locale": "diumenge",
    "festival_cycle": "Colisseum Berlin",
    "city": "Berlin",
    "venue": "Colosseum Berlin",
    "capacity": 415,
    "time_local": "",
    "offer_eur": null,
    "status": "Cancelado",
    "format": "Trio",
    "lineup": "Rita Payés (Elisabeth Roma & Pol Batlle)",
    "manager": "Marco (CityZen)",
    "band_size_hint": "",
    "logistics": "Proveen PA, luces, catering. Artista: transporte y backline (~230€). Hotel buy-out 900€. Revenue share 50%. Potencial sold-out 5.600€.",
    "ticket_link": "",
    "contracts_status": "",
    "notes": ""
  },
  {
    "date_iso": "2025-10-27",
    "weekday_locale": "dilluns",
    "festival_cycle": "Landesmuseum Münster",
    "city": "Münster",
    "venue": "Foyer del Landesmuseum",
    "capacity": 250,
    "time_local": "",
    "offer_eur": 3400,
    "status": "Cancelado",
    "format": "Trio",
    "lineup": "Rita Payés (Elisabeth Roma & Pol Batlle)",
    "manager": "Marco (CityZen)",
    "band_size_hint": "",
    "logistics": "PA, luces, catering, transports, backline y hotel. Posible travel share (según funding IRLL). Tax net.",
    "ticket_link": "",
    "contracts_status": "",
    "notes": ""
  },
  {
    "date_iso": "2025-10-28",
    "weekday_locale": "dimarts",
    "festival_cycle": "Frankfurt",
    "city": "Frankfurt",
    "venue": "Jazz Montez o Jazzklub at Museum MAK",
    "capacity": null,
    "time_local": "",
    "offer_eur": 3400,
    "status": "Cancelado",
    "format": "Trio",
    "lineup": "Rita Payés (Elisabeth Roma & Pol Batlle)",
    "manager": "Marco",
    "band_size_hint": "",
    "logistics": "",
    "ticket_link": "",
    "contracts_status": "",
    "notes": ""
  },
  {
    "date_iso": "2025-10-29",
    "weekday_locale": "dimecres",
    "festival_cycle": "JAZZNOJAZZ",
    "city": "Zurich",
    "venue": "Gessnerallee Zürich",
    "capacity": 900,
    "time_local": "20:45",
    "offer_eur": 5600,
    "status": "Confirmado",
    "format": "Quinteto",
    "lineup": "Rita Payés",
    "manager": "Marco (CityZen)",
    "band_size_hint": "10",
    "logistics": "PA y luces del festival. Exclusividad: único concierto en Suiza en otoño 2025. Con 2×800€ bonus post-break. Withholding 12% sobre 50% fee + hotel + catering + transporte local.",
    "ticket_link": "https://www.ticketcorner.ch/event/25th-zurich-jazznojazz-festival-2025-gessnerallee-zuerich-20157168/",
    "contracts_status": "Firmado",
    "notes": "Entre Dee Dee Bridgewater y Chucho Valdés."
  },
  {
    "date_iso": "2025-10-30",
    "weekday_locale": "dijous",
    "festival_cycle": "Oslo World",
    "city": "Oslo",
    "venue": "Parkteatret",
    "capacity": 500,
    "time_local": "18:30",
    "offer_eur": 6000,
    "status": "Confirmado",
    "format": "Quinteto",
    "lineup": "Rita Payés",
    "manager": "Marco (CityZen)",
    "band_size_hint": "10",
    "logistics": "Hotel Clarion Folketeatret, transporte local, backline, FOH/Monitores/luces, catering, per diems/buy-out. Precio entrada 280 NOK. Exclusividad en Noruega hasta 10/11/2025. Cubren 15% artist tax. *NET landed, sin retención adicional.",
    "ticket_link": "https://www.ticketmaster.no/event/1266505500?brand=parkteatret",
    "contracts_status": "",
    "notes": ""
  },
  {
    "date_iso": "2025-10-31",
    "weekday_locale": "divendres",
    "festival_cycle": "Jazz Cartagena",
    "city": "Cartagena",
    "venue": "Auditorio El Batel",
    "capacity": 1500,
    "time_local": "",
    "offer_eur": 18000,
    "status": "Interest",
    "format": "Completo (Árbol)",
    "lineup": "Rita Payés",
    "manager": "Marco (CityZen)",
    "band_size_hint": "",
    "logistics": "Rider + backline + hospitality + hotel + transporte local (Alicante). Prefieren La Mar de Músicas 2026.",
    "ticket_link": "",
    "contracts_status": "",
    "notes": ""
  },
  {
    "date_iso": "2025-11-01",
    "weekday_locale": "dissabte",
    "festival_cycle": "Trømsø World",
    "city": "Trømsø",
    "venue": "Kulturhuse",
    "capacity": 600,
    "time_local": "",
    "offer_eur": 5000,
    "status": "Oferta",
    "format": "Quinteto",
    "lineup": "Rita Payés",
    "manager": "Marco (CityZen)",
    "band_size_hint": "",
    "logistics": "Hotel 2 noches (31 OCT y 1 NOV), transporte local, backline y sonido, catering, per diems/buy-out. Double bill: Leyla McCalla. 15% artist tax.",
    "ticket_link": "https://www.tromsoworld.com/",
    "contracts_status": "",
    "notes": ""
  },
  {
    "date_iso": "2025-11-06",
    "weekday_locale": "dijous",
    "festival_cycle": "The Jazz Influencers",
    "city": "Amsterdam",
    "venue": "",
    "capacity": null,
    "time_local": "",
    "offer_eur": null,
    "status": "Por hacer",
    "format": "Otro",
    "lineup": "Rita (guest)",
    "manager": "Rita",
    "band_size_hint": "",
    "logistics": "",
    "ticket_link": "",
    "contracts_status": "",
    "notes": ""
  },
  {
    "date_iso": "2025-11-13",
    "weekday_locale": "dijous",
    "festival_cycle": "Fira Trovam",
    "city": "Castelló (de la Plana)",
    "venue": "Auditori i Palau de Congressos",
    "capacity": 900,
    "time_local": "20:30",
    "offer_eur": 5000,
    "status": "Confirmado",
    "format": "Rita Payés & Lucía Fumero",
    "lineup": "Rita, Lucía, Juan B, Luara TBC, Biel",
    "manager": "Marco (CityZen)",
    "band_size_hint": "10",
    "logistics": "Hoteles + hospitalidad + rider completo. Apertura puertas ~20:00. Condiciones: 5.000€ + IVA + taquilla.",
    "ticket_link": "https://www.passline.com/eventos-plano/luciarita-el-nido-fira-trovam-2025",
    "contracts_status": "Firmado",
    "notes": ""
  },
  {
    "date_iso": "2025-11-15",
    "weekday_locale": "dissabte",
    "festival_cycle": "The Jazz Influencers",
    "city": "La Haya",
    "venue": "Amare",
    "capacity": null,
    "time_local": "20:15",
    "offer_eur": 700,
    "status": "Confirmado",
    "format": "Otro",
    "lineup": "Rita (soloist)",
    "manager": "",
    "band_size_hint": "",
    "logistics": "Vuelos, dietas, alojamiento y transporte local cubiertos por promotor.",
    "ticket_link": "https://www.amare.nl/nl/agenda/jazz-influencers-ryhg",
    "contracts_status": "Solicitar",
    "notes": "Contacto: juan.martinez@jazzorchestra.nl"
  },
  {
    "date_iso": "2025-11-16",
    "weekday_locale": "diumenge",
    "festival_cycle": "The Jazz Influencers",
    "city": "Rotterdam",
    "venue": "LantarenVenster",
    "capacity": null,
    "time_local": "",
    "offer_eur": 700,
    "status": "Confirmado",
    "format": "Otro",
    "lineup": "Rita (soloist)",
    "manager": "",
    "band_size_hint": "",
    "logistics": "Vuelos, dietas, alojamiento y transporte local.",
    "ticket_link": "",
    "contracts_status": "Solicitar",
    "notes": "Contacto: juan.martinez@jazzorchestra.nl"
  },
  {
    "date_iso": "2025-11-17",
    "weekday_locale": "dilluns",
    "festival_cycle": "The Jazz Influencers",
    "city": "Amsterdam",
    "venue": "Bimhuis",
    "capacity": null,
    "time_local": "",
    "offer_eur": 700,
    "status": "Confirmado",
    "format": "Otro",
    "lineup": "Rita (soloist)",
    "manager": "",
    "band_size_hint": "",
    "logistics": "Vuelos, dietas, alojamiento y transporte local.",
    "ticket_link": "https://www.bimhuis.nl/agenda/jazz-orchestra-of-the-concertgebouw-ft-rita-payes-en-maripepa-contreras/",
    "contracts_status": "Solicitar",
    "notes": "Contacto: juan.martinez@jazzorchestra.nl"
  },
  {
    "date_iso": "2025-11-18",
    "weekday_locale": "dimarts",
    "festival_cycle": "Linecheck Milano",
    "city": "Milano",
    "venue": "Auditorio de Milán",
    "capacity": 1200,
    "time_local": "20:00",
    "offer_eur": 7500,
    "status": "Confirmado",
    "format": "Trio",
    "lineup": "Rita Payés (Elisabeth Roma & Pol Batlle)",
    "manager": "Marco (CityZen)",
    "band_size_hint": "10",
    "logistics": "Hotel + catering + rider + transporte local. 30% WHT posible; dividir 2.000€ viajes (no sujeto) y del resto 40% fee artista / 60% producción.",
    "ticket_link": "https://www.linecheck.it/festival/artists/rita-payes/",
    "contracts_status": "Firmado",
    "notes": "Posible colaboración con LA NIÑA."
  },
  {
    "date_iso": "2025-11-19",
    "weekday_locale": "dimecres",
    "festival_cycle": "EFG London Jazz Festival",
    "city": "London",
    "venue": "Union Chapel",
    "capacity": 780,
    "time_local": "20:30",
    "offer_eur": 9158.40,
    "status": "Confirmado",
    "format": "Quinteto",
    "lineup": "Rita Payés",
    "manager": "Marco (CityZen)",
    "band_size_hint": "10",
    "logistics": "Cubren 50% vuelos + backline + £20 per diem/pers. + catering backstage + PA + luces. Info ETA/Visa UK enlazada. Apertura: Pol Batlle. Posible entrevista BBC 6 Music.",
    "ticket_link": "https://unionchapel.org.uk/whats-on/rita-pays",
    "contracts_status": "Firmado",
    "notes": ""
  },
  {
    "date_iso": "2025-11-20",
    "weekday_locale": "dijous",
    "festival_cycle": "Manchester",
    "city": "Manchester",
    "venue": "Cosmo Rodewald Concert Hall",
    "capacity": 200,
    "time_local": "",
    "offer_eur": 1946.16,
    "status": "Interest",
    "format": "Dúo",
    "lineup": "Rita Payés (duo con Elisabeth Roma)",
    "manager": "",
    "band_size_hint": "",
    "logistics": "Interesados en dúo. Cubren vuelos y gastos locales. Se puede combinar con London pidiendo aumento y buy-out de vuelos.",
    "ticket_link": "",
    "contracts_status": "Por hacer",
    "notes": "Contacto: alexander.gagatsis@manchester.ac.uk"
  },
  {
    "date_iso": "2025-11-21",
    "weekday_locale": "divendres",
    "festival_cycle": "Centro de Artes de Ovar",
    "city": "Ovar",
    "venue": "",
    "capacity": 356,
    "time_local": "",
    "offer_eur": 6500,
    "status": "Oferta",
    "format": "Quinteto",
    "lineup": "Rita Payés",
    "manager": "Marco (CityZen)",
    "band_size_hint": "",
    "logistics": "Riders + backline + hoteles + comidas.",
    "ticket_link": "",
    "contracts_status": "Por hacer",
    "notes": ""
  },
  {
    "date_iso": "2025-11-21",
    "weekday_locale": "divendres",
    "festival_cycle": "Soul de Inverno",
    "city": "Oporto / Famalicão",
    "venue": "Casa das Artes de Famalicão",
    "capacity": null,
    "time_local": "",
    "offer_eur": 7500,
    "status": "Oferta",
    "format": "Quinteto",
    "lineup": "Rita Payés",
    "manager": "Marco (CityZen)",
    "band_size_hint": "10",
    "logistics": "Venue rider + backline + hoteles + catering + transporte local vs 85%.",
    "ticket_link": "",
    "contracts_status": "Por hacer",
    "notes": "Decir a CityZen: oferta 7.500€ vs 85%."
  }
];

export async function importConcerts2025() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No user logged in');

    // Get first artist - try without filters to bypass RLS issues
    const { data: artists, error: artistError } = await supabase
      .from('artists')
      .select('id, name')
      .limit(10);

    if (artistError) {
      console.error('Error fetching artists:', artistError);
      throw new Error(`Could not fetch artists: ${artistError.message}`);
    }
    
    if (!artists || artists.length === 0) {
      throw new Error('No artists found. Please create an artist first or check RLS policies.');
    }

    // Try to find Rita Payés, otherwise use first artist
    let artist = artists.find(a => a.name && a.name.toLowerCase().includes('rita'));
    if (!artist) {
      artist = artists[0];
      console.log(`Artist "Rita Payés" not found, using "${artist.name}" instead`);
    } else {
      console.log(`Found artist: ${artist.name}`);
    }

    const artistId = artist.id;
    console.log('Using artist ID:', artistId, 'for artist:', artist.name);
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const concert of CONCERTS_2025) {
      // Build title
      const title = `${concert.festival_cycle}${concert.venue ? ' - ' + concert.venue : ''}`;
      
      // Parse date and time
      const timeStr = concert.time_local || '20:00';
      const startDate = `${concert.date_iso}T${timeStr}:00Z`;
      const endDate = `${concert.date_iso}T23:59:00Z`;

      // Build description with all metadata
      const descriptionParts = [];
      if (concert.format) descriptionParts.push(`Formato: ${concert.format}`);
      if (concert.lineup) descriptionParts.push(`Lineup: ${concert.lineup}`);
      if (concert.offer_eur) descriptionParts.push(`Oferta: €${concert.offer_eur.toLocaleString()}`);
      if (concert.capacity) descriptionParts.push(`Capacidad: ${concert.capacity}`);
      if (concert.manager) descriptionParts.push(`Manager: ${concert.manager}`);
      if (concert.band_size_hint) descriptionParts.push(`Band size: ${concert.band_size_hint}`);
      if (concert.logistics) descriptionParts.push(`Logística: ${concert.logistics}`);
      if (concert.ticket_link) descriptionParts.push(`Tickets: ${concert.ticket_link}`);
      if (concert.contracts_status) descriptionParts.push(`Contratos: ${concert.contracts_status}`);
      if (concert.notes) descriptionParts.push(`Notas: ${concert.notes}`);
      
      const description = descriptionParts.join('\n');

      // Check if event already exists (same date_iso + city + festival)
      const { data: existing, error: searchError } = await supabase
        .from('events')
        .select('id')
        .eq('artist_id', artistId)
        .ilike('title', `%${concert.festival_cycle}%`)
        .gte('start_date', `${concert.date_iso}T00:00:00Z`)
        .lte('start_date', `${concert.date_iso}T23:59:59Z`)
        .maybeSingle();

      if (searchError && searchError.code !== 'PGRST116') {
        console.error('Error searching for existing event:', searchError);
        skipped++;
        continue;
      }

      const location = [concert.city, concert.venue].filter(Boolean).join(', ');

      if (existing) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('events')
          .update({
            title,
            start_date: startDate,
            end_date: endDate,
            location,
            description,
            event_type: 'recording', // Using 'recording' as the closest event type for concerts
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating event:', updateError);
          skipped++;
        } else {
          updated++;
        }
      } else {
        // Insert new event
        console.log('Attempting to insert event with artist_id:', artistId);
        const { error: insertError } = await supabase
          .from('events')
          .insert({
            title,
            start_date: startDate,
            end_date: endDate,
            location,
            description,
            event_type: 'recording', // Using 'recording' as the closest event type for concerts
            artist_id: artistId,
            created_by: user.id
          });

        if (insertError) {
          console.error('Error inserting event for', title, ':', insertError);
          skipped++;
        } else {
          console.log('Successfully inserted event:', title);
          inserted++;
        }
      }
    }

    return { 
      success: true, 
      inserted, 
      updated, 
      skipped,
      total: CONCERTS_2025.length 
    };
  } catch (error) {
    console.error('Error importing concerts:', error);
    throw error;
  }
}