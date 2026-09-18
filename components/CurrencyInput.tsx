"use client";

import { type ChangeEvent } from "react";

const formatCentavos = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export default function CurrencyInput({
  value,
  onChange,
  className,
  placeholder,
  required,
}: {
  value: number;
  onChange: (valor: number) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const cents = Math.round(value * 100);
  const display = cents ? formatCentavos(cents) : "";

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    const novoCents = digits ? parseInt(digits, 10) : 0;
    onChange(novoCents / 100);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      required={required}
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
      className={className}
    />
  );
}
