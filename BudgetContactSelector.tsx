import { useEffect, useMemo, useState, useRef } from "react";
import { Check, ChevronsUpDown, Loader2, Mail, MessageSquare, Music, Phone, Plus, Trash2, User, UserCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  iban?: string | null;
  artist_id?: string | null;
  field_config?: any | null;
  type: "contact";
}

interface ArtistOption {
  artistId: string;
  name: string;
  legal_name?: string | null;
  iban?: string | null;
  contactId?: string | null;
  type: "artist";
}

type SelectedOption =
  | {
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      iban?: string | null;
      role?: string | null;
      company?: string | null;
      type: "contact" | "artist";
    }
  | undefined;

export interface ContactPrefill {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  phone?: string | null;
  legal_name?: string | null;
  address?: string | null;
  iban?: string | null;
  tax_id?: string | null;
  website?: string | null;
}

interface BudgetContactSelectorProps {
  value?: string;
  onValueChange: (value: string | null) => void;
  className?: string;
  compact?: boolean;
  /** Pre-fill the inline "create new contact" form with these values (e.g. extracted from an invoice). */
  prefill?: ContactPrefill | null;
  /** When true and prefill is provided, automatically open in "create new" mode. */
  autoStartCreateWithPrefill?: boolean;
}

export function BudgetContactSelector({
  value,
  onValueChange,
  className,
  compact = false,
  prefill = null,
  autoStartCreateWithPrefill = false,
}: BudgetContactSelectorProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"info" | "search">("search");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingArtistId, setSavingArtistId] = useState<string | null>(null);

  // Inline create state
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLegalName, setNewLegalName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newIban, setNewIban] = useState("");
  const [newTaxId, setNewTaxId] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [showExtraCreate, setShowExtraCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef("");

  const hasPrefill = !!prefill && Object.values(prefill).some((v) => typeof v === "string" && v.trim() !== "");

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    if (open) {
      void fetchData();
    }
  }, [open]);

  const selected: SelectedOption = useMemo(() => {
    if (!value) return undefined;
    const selectedContact = contacts.find((c) => c.id === value);
    if (selectedContact) {
      return {
        id: selectedContact.id,
        name: selectedContact.name,
        email: selectedContact.email,
        phone: selectedContact.phone,
        iban: selectedContact.iban,
        role: selectedContact.role,
        company: selectedContact.company,
        type: "contact",
      };
    }

    const selectedArtist = artists.find((a) => a.contactId === value);
    if (selectedArtist) {
      return {
        id: selectedArtist.contactId || value,
        name: selectedArtist.name,
        iban: selectedArtist.iban,
        role: "Artista",
        type: "artist",
      };
    }

    return undefined;
  }, [artists, contacts, value]);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) {
      setViewMode(selected ? "info" : "search");
    } else {
      handleCancelCreate();
      setViewMode("search");
    }
  };

  const initials = (name?: string) =>
    (name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("") || "?";

  const InfoCard = () => {
    if (!selected) return null;
    return (
      <div className="p-3 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {initials(selected.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight truncate">{selected.name}</p>
            {selected.role && (
              <p className="text-xs text-muted-foreground truncate">{selected.role}</p>
            )}
          </div>
        </div>

        {(selected.email || selected.phone || selected.iban) && (
          <div className="space-y-1.5 text-xs">
            {selected.email && (
              <a
                href={`mailto:${selected.email}`}
                className="flex items-center gap-2 text-foreground hover:text-primary truncate"
              >
                <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{selected.email}</span>
              </a>
            )}
            {selected.phone && (
              <a
                href={`tel:${selected.phone}`}
                className="flex items-center gap-2 text-foreground hover:text-primary truncate"
              >
                <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{selected.phone}</span>
              </a>
            )}
            {selected.iban && (
              <p className="text-muted-foreground truncate">IBAN: {selected.iban}</p>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1 border-t">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs flex-1"
            onClick={() => {
              setOpen(false);
              navigate("/correo");
            }}
          >
            <MessageSquare className="w-3 h-3 mr-1" /> Contactar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={() => {
              onValueChange(null);
              setOpen(false);
              toast.success("Contacto desasignado");
            }}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Eliminar
          </Button>
        </div>
      </div>
    );
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("id, name, email, phone, company, role, iban, artist_id, field_config")
        .order("name");

      if (contactsError) throw contactsError;
      const allContacts: Contact[] = (contactsData || []).map((c) => ({
        ...c,
        type: "contact" as const,
      }));
      // Deduplicate by name (case-insensitive), keep first occurrence
      const seenNames = new Set<string>();
      const mappedContacts = allContacts.filter((c) => {
        const key = (c.name || "").toLowerCase().trim();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
      });
      setContacts(mappedContacts);

      const artistContactMap = new Map<string, string>();
      for (const c of mappedContacts) {
        const rosterArtistId =
          c.field_config && typeof c.field_config === "object"
            ? (c.field_config as any).roster_artist_id
            : null;
        if (rosterArtistId) artistContactMap.set(rosterArtistId, c.id);
      }

      const { data: artistsData, error: artistsError } = await supabase
        .from("artists")
        .select("id, name, stage_name, legal_name, iban")
        .order("name");

      if (artistsError) throw artistsError;

      setArtists(
        (artistsData || []).map((a) => ({
          artistId: a.id,
          name: a.stage_name || a.name,
          legal_name: a.legal_name,
          iban: a.iban,
          contactId: artistContactMap.get(a.id) ?? null,
          type: "artist" as const,
        }))
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("No se pudieron cargar los contactos");
    } finally {
      setLoading(false);
    }
  };

  const ensureMirrorContactForArtist = async (artist: ArtistOption) => {
    if (artist.contactId) return artist.contactId;

    const { data: newId, error } = await supabase.rpc('create_artist_mirror_contact', {
      _artist_id: artist.artistId,
    });
    if (error) throw error;
    if (!newId) throw new Error('No id returned');

    const { data: full } = await supabase
      .from('contacts')
      .select('id, name, email, phone, company, role, iban, artist_id, field_config')
      .eq('id', newId as string)
      .maybeSingle();

    setArtists((prev) =>
      prev.map((a) =>
        a.artistId === artist.artistId ? { ...a, contactId: newId as string } : a
      )
    );
    if (full) {
      setContacts((prev) =>
        prev.find((c) => c.id === full.id)
          ? prev
          : [...prev, { ...(full as any), type: 'contact' as const }].sort((a, b) =>
              (a.name || '').localeCompare(b.name || '')
            )
      );
    }

    return newId as string;
  };

  const handleSelectArtist = async (artist: ArtistOption) => {
    try {
      if (savingArtistId) return;
      setSavingArtistId(artist.artistId);

      const contactId = await ensureMirrorContactForArtist(artist);
      if (contactId) {
        onValueChange(contactId);
        setOpen(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("No se pudo asignar el artista");
    } finally {
      setSavingArtistId(null);
    }
  };

  const handleStartCreate = () => {
    setNewName((prefill?.name?.trim() || searchRef.current || ""));
    setNewEmail(prefill?.email?.trim() || "");
    setNewRole(prefill?.role?.trim() || "");
    setNewPhone(prefill?.phone?.trim() || "");
    setNewLegalName(prefill?.legal_name?.trim() || "");
    setNewAddress(prefill?.address?.trim() || "");
    setNewIban(prefill?.iban?.trim() || "");
    setNewTaxId(prefill?.tax_id?.trim() || "");
    setNewWebsite(prefill?.website?.trim() || "");
    setShowExtraCreate(
      !!(prefill?.phone || prefill?.legal_name || prefill?.address || prefill?.iban || prefill?.tax_id || prefill?.website)
    );
    setCreatingNew(true);
  };

  const handleCancelCreate = () => {
    setCreatingNew(false);
    setNewName("");
    setNewEmail("");
    setNewRole("");
    setNewPhone("");
    setNewLegalName("");
    setNewAddress("");
    setNewIban("");
    setNewTaxId("");
    setNewWebsite("");
    setShowExtraCreate(false);
  };

  // Auto-open in create mode when caller provides prefill data
  useEffect(() => {
    if (autoStartCreateWithPrefill && hasPrefill && open && !creatingNew) {
      handleStartCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoStartCreateWithPrefill, hasPrefill]);

  const handleCreateContact = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { data: newId, error } = await supabase.rpc('create_personal_contact', {
        _name: newName.trim(),
        _email: newEmail.trim() || null,
        _role: newRole.trim() || null,
        _phone: newPhone.trim() || null,
        _legal_name: newLegalName.trim() || null,
        _address: newAddress.trim() || null,
        _iban: newIban.trim() || null,
        _tax_id: newTaxId.trim() || null,
        _website: newWebsite.trim() || null,
      } as any);
      if (error) throw error;
      if (!newId) throw new Error('No id returned');

      // Refetch the full row so the local list shows complete info
      const { data: full } = await supabase
        .from('contacts')
        .select('id, name, email, phone, company, role, iban, artist_id, field_config')
        .eq('id', newId as string)
        .maybeSingle();

      if (full) {
        setContacts((prev) =>
          prev.find((c) => c.id === full.id)
            ? prev
            : [...prev, { ...(full as any), type: 'contact' as const }].sort((a, b) =>
                (a.name || '').localeCompare(b.name || '')
              )
        );
      }

      onValueChange(newId as string);
      handleCancelCreate();
      setOpen(false);
      toast.success(`Contacto "${newName.trim()}" guardado y asignado`);
    } catch (e: any) {
      console.error('[create_personal_contact]', e);
      if (e?.code === '42501' || e?.code === '28000') {
        toast.error('Tu sesión está desincronizada. Recarga la página e inténtalo de nuevo.');
      } else {
        toast.error(e?.message || 'Error al crear contacto');
      }
    } finally {
      setSaving(false);
    }
  };

  const createButton = (
    <CommandItem
      value="__create_new__"
      onSelect={handleStartCreate}
      className="text-primary"
    >
      <Plus className="mr-2 h-4 w-4" />
      <span className="text-sm font-medium">Crear contacto nuevo</span>
    </CommandItem>
  );

  const inlineCreateForm = (
    <div className="p-3 space-y-2 border-t max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Nuevo contacto</p>
        {hasPrefill && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            Detectado en la factura
          </span>
        )}
      </div>
      <Input
        placeholder="Nombre *"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        className="h-8 text-sm"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateContact(); } }}
      />
      <Input
        placeholder="Email (opcional)"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        className="h-8 text-sm"
        type="email"
      />
      <Input
        placeholder="Rol (opcional)"
        value={newRole}
        onChange={(e) => setNewRole(e.target.value)}
        className="h-8 text-sm"
      />
      {showExtraCreate ? (
        <>
          <Input
            placeholder="Razón social / Legal name"
            value={newLegalName}
            onChange={(e) => setNewLegalName(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="NIF / CIF / Tax ID"
            value={newTaxId}
            onChange={(e) => setNewTaxId(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Teléfono"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Dirección"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="IBAN"
            value={newIban}
            onChange={(e) => setNewIban(e.target.value)}
            className="h-8 text-sm font-mono"
          />
          <Input
            placeholder="Web"
            value={newWebsite}
            onChange={(e) => setNewWebsite(e.target.value)}
            className="h-8 text-sm"
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowExtraCreate(true)}
          className="text-[11px] text-primary hover:underline"
        >
          + Añadir más datos fiscales (NIF, IBAN, dirección…)
        </button>
      )}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs flex-1"
          onClick={handleCancelCreate}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={handleCreateContact}
          disabled={!newName.trim() || saving}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Crear
        </Button>
      </div>
    </div>
  );

  const popoverContentClass =
    "z-50 w-[250px] p-0 bg-popover text-popover-foreground border border-border shadow-md";

  if (compact) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-8 justify-start text-left font-normal px-2 hover:bg-muted",
              selected ? "text-foreground" : "text-muted-foreground",
              className
            )}
          >
            {selected ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate max-w-[100px] font-medium">
                        {selected.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{selected.name}</p>
                      {selected.email && (
                        <p className="text-xs flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {selected.email}
                        </p>
                      )}
                      {selected.phone && (
                        <p className="text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {selected.phone}
                        </p>
                      )}
                      {selected.iban && <p className="text-xs">IBAN: {selected.iban}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-xs">Asignar</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className={popoverContentClass} align="start">
          {viewMode === "info" && selected ? (
            <InfoCard />
          ) : creatingNew ? (
            inlineCreateForm
          ) : (
            <Command>
              <CommandInput
                placeholder="Buscar contacto..."
                onValueChange={(v) => { searchRef.current = v; }}
              />
              <CommandList>
                <CommandEmpty>
                  {loading ? "Cargando..." : (
                    <div className="space-y-2 py-2">
                      <p className="text-sm text-muted-foreground">No se encontraron contactos</p>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleStartCreate}>
                        <Plus className="h-3 w-3 mr-1" /> Crear contacto
                      </Button>
                    </div>
                  )}
                </CommandEmpty>

                {artists.length > 0 && (
                  <CommandGroup heading="Artistas del roster">
                    {artists.map((artist) => (
                      <CommandItem
                        key={`artist-${artist.artistId}`}
                        value={`${artist.name} artista`}
                        disabled={savingArtistId === artist.artistId}
                        onSelect={() => {
                          void handleSelectArtist(artist);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value && artist.contactId && value === artist.contactId
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <Music className="w-3 h-3 text-primary" />
                          <span className="text-sm font-medium">{artist.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                <CommandGroup heading="Contactos">
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onValueChange(null);
                      setOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    <span className="text-sm">Sin asignar</span>
                  </CommandItem>

                  {contacts.map((contact) => (
                    <CommandItem
                      key={`contact-${contact.id}`}
                      value={contact.name}
                      onSelect={() => {
                        onValueChange(contact.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === contact.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{contact.name}</span>
                        {(contact.role || contact.company) && (
                          <span className="text-xs text-muted-foreground">
                            {contact.role}
                            {contact.role && contact.company && " • "}
                            {contact.company}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}

                  {createButton}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selected ? (
            <div className="flex items-center gap-2 truncate">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selected.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Seleccionar contacto...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          "z-50 w-[300px] p-0 bg-popover text-popover-foreground border border-border shadow-md",
          className
        )}
        align="start"
      >
        {viewMode === "info" && selected ? (
          <InfoCard />
        ) : creatingNew ? (
          inlineCreateForm
        ) : (
          <Command>
            <CommandInput
              placeholder="Buscar contacto..."
              onValueChange={(v) => { searchRef.current = v; }}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? "Cargando..." : (
                  <div className="space-y-2 py-2">
                    <p className="text-sm text-muted-foreground">No se encontraron contactos</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleStartCreate}>
                      <Plus className="h-3 w-3 mr-1" /> Crear contacto
                    </Button>
                  </div>
                )}
              </CommandEmpty>

              {artists.length > 0 && (
                <CommandGroup heading="Artistas del roster">
                  {artists.map((artist) => (
                    <CommandItem
                      key={`artist-${artist.artistId}`}
                      value={`${artist.name} artista`}
                      disabled={savingArtistId === artist.artistId}
                      onSelect={() => {
                        void handleSelectArtist(artist);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value && artist.contactId && value === artist.contactId
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-primary" />
                        <span className="font-medium">{artist.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandGroup heading="Contactos">
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onValueChange(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  <span>Sin asignar</span>
                </CommandItem>

                {contacts.map((contact) => (
                  <CommandItem
                    key={`contact-${contact.id}`}
                    value={contact.name}
                    onSelect={() => {
                      onValueChange(contact.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === contact.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{contact.name}</span>
                      <div className="text-xs text-muted-foreground">
                        {contact.email && <span>{contact.email}</span>}
                        {contact.role && <span className="ml-2">• {contact.role}</span>}
                      </div>
                    </div>
                  </CommandItem>
                ))}

                {createButton}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

