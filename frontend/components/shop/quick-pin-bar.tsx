"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, Sparkles, X, ArrowRight, ScanLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface QuickPinBarProps {
  onSearchPin: (pin: string) => void;
  isLoading?: boolean;
}

export function QuickPinBar({ onSearchPin, isLoading }: QuickPinBarProps) {
  const [pin, setPin] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pin.trim();
    if (cleaned.length === 4) {
      onSearchPin(cleaned);
      setPin("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(val);
    if (val.length === 4) {
      onSearchPin(val);
      setPin("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center">
        <div className="absolute left-4 flex items-center gap-2 pointer-events-none text-neutral-400">
          <ScanLine className="h-5 w-5 text-primary" />
        </div>

        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="Type 4-digit PIN (e.g. 4821) or scan QR..."
          value={pin}
          onChange={handleInputChange}
          className="h-14 pl-12 pr-28 text-lg font-mono font-bold tracking-widest rounded-2xl border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm focus-visible:border-primary focus-visible:ring-primary/20 transition-all placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
        />

        <div className="absolute right-3 flex items-center gap-1.5">
          {pin && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPin("")}
              className="h-8 w-8 text-neutral-400 hover:text-neutral-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="submit"
            disabled={pin.length !== 4 || isLoading}
            className="h-9 px-4 rounded-xl text-xs font-bold shadow-xs bg-primary text-primary-foreground"
          >
            {isLoading ? "Searching..." : "Find"}
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </form>
  );
}

