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
        <div className="absolute left-3.5 flex items-center pointer-events-none text-neutral-400">
          <ScanLine className="h-4 w-4 text-primary" />
        </div>

        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="Enter 4-digit pin or scan qr..."
          value={pin}
          onChange={handleInputChange}
          className="h-11 pl-10 pr-24 text-base font-mono font-medium tracking-wider rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20 transition-all placeholder:font-sans placeholder:text-xs placeholder:font-normal placeholder:tracking-normal"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {pin && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPin("")}
              className="h-7 w-7 rounded-md text-neutral-400 hover:text-neutral-700"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            type="submit"
            disabled={pin.length !== 4 || isLoading}
            className="h-8 px-3 rounded-lg text-xs font-medium shadow-2xs bg-primary text-primary-foreground"
          >
            {isLoading ? "Searching..." : "Find"}
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </form>
  );
}

