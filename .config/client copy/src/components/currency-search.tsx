import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { currencies, popularCurrencies } from "@shared/currencies";

interface CurrencySearchProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function CurrencySearch({ value, onValueChange, placeholder = "Select currency..." }: CurrencySearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Lazy filtering - only filter when search query changes
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery) {
      // Show popular currencies first when no search
      const popular = currencies.filter(c => popularCurrencies.includes(c.code));
      const others = currencies.filter(c => !popularCurrencies.includes(c.code));
      return { popular, others };
    }

    // Filter based on search query
    const query = searchQuery.toLowerCase();
    const filtered = currencies.filter(
      currency =>
        currency.code.toLowerCase().includes(query) ||
        currency.name.toLowerCase().includes(query)
    );

    return { popular: [], others: filtered };
  }, [searchQuery]);

  const selectedCurrency = currencies.find(c => c.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-10 justify-between text-xs"
        >
          {selectedCurrency ? selectedCurrency.code : placeholder}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command>
          <CommandInput 
            placeholder="Search currencies..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-60">
            <CommandEmpty>No currency found.</CommandEmpty>
            
            {filteredCurrencies.popular.length > 0 && (
              <CommandGroup heading="Popular">
                {filteredCurrencies.popular.map((currency) => (
                  <CommandItem
                    key={currency.code}
                    value={currency.code}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === currency.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium">{currency.code}</span>
                    <span className="ml-2 text-sm text-gray-500">{currency.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredCurrencies.others.length > 0 && (
              <CommandGroup heading={filteredCurrencies.popular.length > 0 ? "All Currencies" : "Currencies"}>
                {filteredCurrencies.others.map((currency) => (
                  <CommandItem
                    key={currency.code}
                    value={currency.code}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === currency.code ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium">{currency.code}</span>
                    <span className="ml-2 text-sm text-gray-500">{currency.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}