import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { MapPin, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  venue?: string;
  city?: string;
  country?: string;
  placeholder?: string;
  className?: string;
}

interface Prediction {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  venue = "",
  city = "",
  country = "",
  placeholder = "Buscar dirección...",
  className = "",
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const lastContextRef = useRef<string>("");

  const debouncedInput = useDebounce(inputValue, 300);
  const debouncedVenue = useDebounce(venue, 500);
  const debouncedCity = useDebounce(city, 500);
  const debouncedCountry = useDebounce(country, 500);

  const searchAddresses = useCallback(async (query: string, isContextSearch = false) => {
    // For context search, we need venue + city at minimum
    if (isContextSearch && (!debouncedVenue || !debouncedCity)) {
      return;
    }
    
    // For manual search, we need at least 2 characters or context
    if (!isContextSearch && !query && !debouncedVenue && !debouncedCity) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places-autocomplete', {
        body: {
          query,
          venue: debouncedVenue,
          city: debouncedCity,
          country: debouncedCountry,
        },
      });

      if (error) throw error;

      setPredictions(data.predictions || []);
      if (data.predictions?.length > 0 && isContextSearch) {
        // Don't auto-open, just show the suggestion button
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedVenue, debouncedCity, debouncedCountry]);

  // Auto-search when venue + city + country are filled and value is empty
  useEffect(() => {
    const contextKey = `${debouncedVenue}|${debouncedCity}|${debouncedCountry}`;
    
    // Only auto-search if context changed and we have venue + city
    if (contextKey !== lastContextRef.current && debouncedVenue && debouncedCity && !value) {
      lastContextRef.current = contextKey;
      searchAddresses('', true);
    }
  }, [debouncedVenue, debouncedCity, debouncedCountry, value, searchAddresses]);

  // Search when input changes
  useEffect(() => {
    if (debouncedInput.length >= 2 || (debouncedVenue && debouncedCity)) {
      searchAddresses(debouncedInput);
    } else {
      setPredictions([]);
    }
  }, [debouncedInput, searchAddresses]);

  // Update input when value prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleSelect = (prediction: Prediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setOpen(false);
    setPredictions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Keep this input controlled by propagating changes up immediately
    onChange(newValue);

    // Show dropdown when user starts typing
    if (newValue.length >= 2) {
      setOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Small delay to allow click on suggestion
    setTimeout(() => {
      if (inputValue !== value) {
        onChange(inputValue);
      }
      setOpen(false);
    }, 200);
  };

  // Show suggestion button when we have predictions from context but no value yet
  const showSuggestionButton = predictions.length > 0 && !value && venue && city;

  const handleAutoFill = () => {
    if (predictions.length > 0) {
      handleSelect(predictions[0]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => predictions.length > 0 && setOpen(true)}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className={`pl-10 ${showSuggestionButton ? 'pr-24' : ''} ${className}`}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {showSuggestionButton && !isLoading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAutoFill}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs text-primary hover:text-primary"
            >
              <Sparkles className="mr-1 h-3 w-3" />
              Sugerir
            </Button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
            <Command>
              <CommandList>
                {predictions.length === 0 && !isLoading && (
                  <CommandEmpty>
                    {inputValue.length >= 2
                      ? "No se encontraron direcciones"
                      : "Escribe para buscar direcciones..."}
                  </CommandEmpty>
                )}
                <CommandGroup>
                  {predictions.map((prediction) => (
                    <CommandItem
                      key={prediction.placeId}
                      value={prediction.description}
                      onSelect={() => handleSelect(prediction)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{prediction.mainText}</span>
                        <span className="text-xs text-muted-foreground">{prediction.secondaryText}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>

      {/* Show suggestion preview below input */}
      {showSuggestionButton && predictions[0] && (
        <div 
          onClick={handleAutoFill}
          className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors"
        >
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Dirección sugerida:</p>
            <p className="text-sm font-medium truncate">{predictions[0].description}</p>
          </div>
          <Button type="button" variant="secondary" size="sm" className="flex-shrink-0">
            Usar
          </Button>
        </div>
      )}
    </div>
  );
}
