import { useState, useMemo, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ChevronsUpDown, Music } from 'lucide-react';
import { cn } from '@/lib/utils';


interface Genre {
  label: string;
  family: string;
  aliases: string[];
}

const GENRES: Genre[] = [
  // Pop
  { label: 'Pop', family: 'pop', aliases: ['pop music'] },
  { label: 'Indie Pop', family: 'pop', aliases: ['indie'] },
  { label: 'Synth Pop', family: 'pop', aliases: ['synthpop', 'synth'] },
  { label: 'Dream Pop', family: 'pop', aliases: ['dreamy'] },
  { label: 'Art Pop', family: 'pop', aliases: [] },
  { label: 'K-Pop', family: 'pop', aliases: ['kpop', 'korean pop'] },
  { label: 'J-Pop', family: 'pop', aliases: ['jpop', 'japanese pop'] },
  { label: 'Bubblegum Pop', family: 'pop', aliases: ['bubblegum'] },
  { label: 'Chamber Pop', family: 'pop', aliases: [] },
  { label: 'Electropop', family: 'pop', aliases: ['electro pop'] },
  { label: 'Dance Pop', family: 'pop', aliases: [] },
  { label: 'Power Pop', family: 'pop', aliases: [] },
  { label: 'Teen Pop', family: 'pop', aliases: [] },
  { label: 'Sophisti-Pop', family: 'pop', aliases: ['sophisticated pop'] },

  // Rock
  { label: 'Rock', family: 'rock', aliases: ['rock music'] },
  { label: 'Rock Alternativo', family: 'rock', aliases: ['alternative rock', 'alt rock'] },
  { label: 'Indie Rock', family: 'rock', aliases: ['indie'] },
  { label: 'Post-Rock', family: 'rock', aliases: ['postrock'] },
  { label: 'Garage Rock', family: 'rock', aliases: ['garage'] },
  { label: 'Punk Rock', family: 'rock', aliases: ['punk'] },
  { label: 'Hard Rock', family: 'rock', aliases: [] },
  { label: 'Soft Rock', family: 'rock', aliases: [] },
  { label: 'Progressive Rock', family: 'rock', aliases: ['prog rock', 'progresivo'] },
  { label: 'Psychedelic Rock', family: 'rock', aliases: ['psicodelico', 'psych rock'] },
  { label: 'Grunge', family: 'rock', aliases: [] },
  { label: 'Shoegaze', family: 'rock', aliases: [] },
  { label: 'Brit Pop', family: 'rock', aliases: ['britpop'] },
  { label: 'Emo', family: 'rock', aliases: ['emo rock'] },
  { label: 'Post-Punk', family: 'rock', aliases: ['postpunk'] },
  { label: 'Math Rock', family: 'rock', aliases: [] },
  { label: 'Stoner Rock', family: 'rock', aliases: ['stoner'] },
  { label: 'Blues Rock', family: 'rock', aliases: [] },
  { label: 'Surf Rock', family: 'rock', aliases: ['surf'] },
  { label: 'Noise Rock', family: 'rock', aliases: [] },
  { label: 'Space Rock', family: 'rock', aliases: [] },
  { label: 'Krautrock', family: 'rock', aliases: ['kraut'] },

  // Electrónica
  { label: 'Electrónica', family: 'electronica', aliases: ['electronic', 'electronica', 'electro'] },
  { label: 'House', family: 'electronica', aliases: [] },
  { label: 'Techno', family: 'electronica', aliases: [] },
  { label: 'Minimal', family: 'electronica', aliases: ['minimal techno'] },
  { label: 'Deep House', family: 'electronica', aliases: [] },
  { label: 'Tech House', family: 'electronica', aliases: [] },
  { label: 'Trance', family: 'electronica', aliases: [] },
  { label: 'Drum & Bass', family: 'electronica', aliases: ['dnb', 'drum and bass'] },
  { label: 'Dubstep', family: 'electronica', aliases: [] },
  { label: 'Ambient', family: 'electronica', aliases: [] },
  { label: 'IDM', family: 'electronica', aliases: ['intelligent dance music'] },
  { label: 'Electro', family: 'electronica', aliases: [] },
  { label: 'Downtempo', family: 'electronica', aliases: ['chill'] },
  { label: 'Electrofunk', family: 'electronica', aliases: ['electro funk'] },
  { label: 'Future Bass', family: 'electronica', aliases: [] },
  { label: 'Synthwave', family: 'electronica', aliases: ['retrowave', 'outrun'] },
  { label: 'Lo-Fi', family: 'electronica', aliases: ['lofi'] },
  { label: 'Chillwave', family: 'electronica', aliases: [] },
  { label: 'Breakbeat', family: 'electronica', aliases: ['breaks'] },
  { label: 'Hardstyle', family: 'electronica', aliases: [] },
  { label: 'Jungle', family: 'electronica', aliases: [] },
  { label: 'UK Garage', family: 'electronica', aliases: ['ukg', '2-step'] },
  { label: 'Progressive House', family: 'electronica', aliases: ['prog house'] },
  { label: 'Acid House', family: 'electronica', aliases: ['acid'] },
  { label: 'Disco', family: 'electronica', aliases: ['nu disco', 'nu-disco'] },
  { label: 'EBM', family: 'electronica', aliases: ['electronic body music'] },
  { label: 'Gabber', family: 'electronica', aliases: ['hardcore'] },
  { label: 'Melodic Techno', family: 'electronica', aliases: [] },

  // Hip-Hop / Rap
  { label: 'Hip-Hop', family: 'hiphop', aliases: ['hip hop', 'hiphop'] },
  { label: 'Rap', family: 'hiphop', aliases: [] },
  { label: 'Trap', family: 'hiphop', aliases: [] },
  { label: 'Boom Bap', family: 'hiphop', aliases: [] },
  { label: 'Lo-Fi Hip-Hop', family: 'hiphop', aliases: ['lofi hip hop', 'chillhop'] },
  { label: 'Conscious Rap', family: 'hiphop', aliases: [] },
  { label: 'Drill', family: 'hiphop', aliases: [] },
  { label: 'Grime', family: 'hiphop', aliases: [] },
  { label: 'Cloud Rap', family: 'hiphop', aliases: [] },
  { label: 'Phonk', family: 'hiphop', aliases: [] },
  { label: 'Old School Hip-Hop', family: 'hiphop', aliases: ['old school'] },

  // R&B / Soul
  { label: 'R&B', family: 'rnb', aliases: ['rnb', 'rhythm and blues'] },
  { label: 'Neo-Soul', family: 'rnb', aliases: ['neosoul'] },
  { label: 'Soul', family: 'rnb', aliases: [] },
  { label: 'Funk', family: 'rnb', aliases: [] },
  { label: 'Motown', family: 'rnb', aliases: [] },
  { label: 'Quiet Storm', family: 'rnb', aliases: [] },
  { label: 'Contemporary R&B', family: 'rnb', aliases: [] },

  // Latin
  { label: 'Reggaeton', family: 'latin', aliases: ['reggaetón', 'regueton'] },
  { label: 'Latin Pop', family: 'latin', aliases: [] },
  { label: 'Salsa', family: 'latin', aliases: [] },
  { label: 'Cumbia', family: 'latin', aliases: [] },
  { label: 'Bachata', family: 'latin', aliases: [] },
  { label: 'Merengue', family: 'latin', aliases: [] },
  { label: 'Dembow', family: 'latin', aliases: [] },
  { label: 'Latin Trap', family: 'latin', aliases: [] },
  { label: 'Corridos Tumbados', family: 'latin', aliases: ['corridos'] },
  { label: 'Regional Mexicano', family: 'latin', aliases: ['regional'] },
  { label: 'Norteño', family: 'latin', aliases: ['norteña'] },
  { label: 'Banda', family: 'latin', aliases: [] },
  { label: 'Bossa Nova', family: 'latin', aliases: ['bossanova'] },
  { label: 'MPB', family: 'latin', aliases: ['musica popular brasileira'] },
  { label: 'Samba', family: 'latin', aliases: [] },
  { label: 'Tango', family: 'latin', aliases: [] },
  { label: 'Vallenato', family: 'latin', aliases: [] },
  { label: 'Son Cubano', family: 'latin', aliases: ['son'] },
  { label: 'Bolero', family: 'latin', aliases: [] },
  { label: 'Ranchera', family: 'latin', aliases: [] },
  { label: 'Mariachi', family: 'latin', aliases: [] },

  // Jazz
  { label: 'Jazz', family: 'jazz', aliases: [] },
  { label: 'Jazz Fusion', family: 'jazz', aliases: ['fusion'] },
  { label: 'Smooth Jazz', family: 'jazz', aliases: [] },
  { label: 'Bebop', family: 'jazz', aliases: [] },
  { label: 'Free Jazz', family: 'jazz', aliases: [] },
  { label: 'Latin Jazz', family: 'jazz', aliases: [] },
  { label: 'Acid Jazz', family: 'jazz', aliases: [] },
  { label: 'Nu Jazz', family: 'jazz', aliases: [] },
  { label: 'Swing', family: 'jazz', aliases: [] },
  { label: 'Cool Jazz', family: 'jazz', aliases: [] },
  { label: 'Modal Jazz', family: 'jazz', aliases: [] },
  { label: 'Gypsy Jazz', family: 'jazz', aliases: ['manouche'] },

  // Clásica
  { label: 'Clásica', family: 'clasica', aliases: ['classical', 'musica clasica'] },
  { label: 'Ópera', family: 'clasica', aliases: ['opera'] },
  { label: 'Barroco', family: 'clasica', aliases: ['baroque'] },
  { label: 'Romanticismo', family: 'clasica', aliases: [] },
  { label: 'Contemporánea', family: 'clasica', aliases: ['contemporary classical'] },
  { label: 'Neoclásica', family: 'clasica', aliases: ['neoclassical'] },
  { label: 'Música de Cámara', family: 'clasica', aliases: ['chamber music'] },
  { label: 'Orquestal', family: 'clasica', aliases: ['orchestral'] },
  { label: 'Minimalismo', family: 'clasica', aliases: ['minimal classical'] },

  // Folk / Acústico
  { label: 'Folk', family: 'folk', aliases: [] },
  { label: 'Folk Rock', family: 'folk', aliases: [] },
  { label: 'Americana', family: 'folk', aliases: [] },
  { label: 'Bluegrass', family: 'folk', aliases: [] },
  { label: 'Country', family: 'folk', aliases: [] },
  { label: 'Singer-Songwriter', family: 'folk', aliases: ['cantautor', 'songwriter'] },
  { label: 'Acústico', family: 'folk', aliases: ['acoustic'] },
  { label: 'Celtic', family: 'folk', aliases: ['celta'] },
  { label: 'Flamenco', family: 'folk', aliases: [] },
  { label: 'Fado', family: 'folk', aliases: [] },
  { label: 'Cantautor', family: 'folk', aliases: ['singer songwriter'] },
  { label: 'Country Folk', family: 'folk', aliases: [] },
  { label: 'Neofolk', family: 'folk', aliases: ['neo-folk'] },

  // Metal
  { label: 'Metal', family: 'metal', aliases: ['heavy'] },
  { label: 'Heavy Metal', family: 'metal', aliases: [] },
  { label: 'Thrash Metal', family: 'metal', aliases: ['thrash'] },
  { label: 'Death Metal', family: 'metal', aliases: [] },
  { label: 'Black Metal', family: 'metal', aliases: [] },
  { label: 'Doom Metal', family: 'metal', aliases: ['doom'] },
  { label: 'Power Metal', family: 'metal', aliases: [] },
  { label: 'Metalcore', family: 'metal', aliases: [] },
  { label: 'Nu Metal', family: 'metal', aliases: ['numetal'] },
  { label: 'Symphonic Metal', family: 'metal', aliases: [] },
  { label: 'Progressive Metal', family: 'metal', aliases: ['prog metal'] },
  { label: 'Sludge Metal', family: 'metal', aliases: ['sludge'] },
  { label: 'Deathcore', family: 'metal', aliases: [] },
  { label: 'Djent', family: 'metal', aliases: [] },

  // Reggae / Ska
  { label: 'Reggae', family: 'reggae', aliases: [] },
  { label: 'Ska', family: 'reggae', aliases: [] },
  { label: 'Dub', family: 'reggae', aliases: [] },
  { label: 'Dancehall', family: 'reggae', aliases: [] },
  { label: 'Rocksteady', family: 'reggae', aliases: [] },

  // Urbano / Africano
  { label: 'Afrobeats', family: 'urbano', aliases: ['afrobeat'] },
  { label: 'Amapiano', family: 'urbano', aliases: [] },
  { label: 'Kuduro', family: 'urbano', aliases: [] },
  { label: 'Kizomba', family: 'urbano', aliases: [] },
  { label: 'Afro House', family: 'urbano', aliases: [] },
  { label: 'Dancehall', family: 'urbano', aliases: [] },

  // Experimental
  { label: 'Experimental', family: 'experimental', aliases: [] },
  { label: 'Noise', family: 'experimental', aliases: [] },
  { label: 'Avant-Garde', family: 'experimental', aliases: ['vanguardia'] },
  { label: 'Industrial', family: 'experimental', aliases: [] },
  { label: 'Glitch', family: 'experimental', aliases: [] },
  { label: 'Musique Concrète', family: 'experimental', aliases: ['musique concrete'] },
  { label: 'Drone', family: 'experimental', aliases: [] },

  // Otros
  { label: 'World Music', family: 'world', aliases: ['musica del mundo'] },
  { label: 'New Age', family: 'world', aliases: [] },
  { label: 'Gospel', family: 'world', aliases: [] },
  { label: 'Blues', family: 'world', aliases: [] },
  { label: 'Música Infantil', family: 'world', aliases: ['children', 'kids'] },
  { label: 'Banda Sonora', family: 'world', aliases: ['soundtrack', 'ost', 'bso'] },
  { label: 'Música Cinematica', family: 'world', aliases: ['cinematic', 'film score'] },
  { label: 'Spoken Word', family: 'world', aliases: ['poetry'] },
  { label: 'Chiptune', family: 'world', aliases: ['8-bit', '8bit'] },
];

function normalize(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function searchGenres(query: string): Genre[] {
  if (!query.trim()) return GENRES.slice(0, 20);

  const q = normalize(query);
  const scored: { genre: Genre; score: number }[] = [];
  const matchedFamilies = new Set<string>();

  for (const genre of GENRES) {
    const labelN = normalize(genre.label);
    const familyN = normalize(genre.family);
    const aliasesN = genre.aliases.map(normalize);

    let score = 0;

    // Priority 1: starts with query
    if (labelN.startsWith(q)) {
      score = 100;
    } else if (aliasesN.some(a => a.startsWith(q))) {
      score = 90;
    }
    // Priority 2: contains query
    else if (labelN.includes(q)) {
      score = 70;
    } else if (aliasesN.some(a => a.includes(q))) {
      score = 60;
    }
    // Priority 3: family match
    else if (familyN.startsWith(q) || familyN.includes(q)) {
      score = 20;
    }

    if (score > 0) {
      scored.push({ genre, score });
      if (score >= 60) matchedFamilies.add(genre.family);
    }
  }

  // Add family-related genres with low priority
  if (matchedFamilies.size > 0) {
    for (const genre of GENRES) {
      if (matchedFamilies.has(genre.family) && !scored.some(s => s.genre.label === genre.label)) {
        scored.push({ genre, score: 10 });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 25).map(s => s.genre);
}

interface GenreComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function GenreCombobox({ value, onValueChange, placeholder = 'Buscar género...' }: GenreComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => value.split(',').map(s => s.trim()).filter(Boolean),
    [value]
  );

  const results = useMemo(() => {
    const genres = searchGenres(search);
    if (!search.trim()) {
      const selectedSet = new Set(selected);
      const sel = genres.filter(g => selectedSet.has(g.label));
      const rest = genres.filter(g => !selectedSet.has(g.label));
      return [...sel, ...rest];
    }
    return genres;
  }, [search, selected]);

  const toggleGenre = (label: string) => {
    const next = selected.includes(label)
      ? selected.filter(g => g !== label)
      : [...selected, label];
    onValueChange(next.join(', '));
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selected.length > 0 ? selected.join(', ') : 'Seleccionar géneros...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <div className="p-2">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto overscroll-contain p-1" onWheel={(e) => e.stopPropagation()}>
            {results.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No se encontraron géneros
              </div>
            ) : (
              results.map((genre) => {
                const isSelected = selected.includes(genre.label);
                return (
                  <button
                    key={genre.label}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer',
                      isSelected && 'bg-accent'
                    )}
                    onClick={() => toggleGenre(genre.label)}
                  >
                    <Check className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                    <span>{genre.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground capitalize">{genre.family}</span>
                  </button>
                );
              })
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
