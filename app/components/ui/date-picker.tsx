"use client"

import { Input } from "./input"
import { Label } from "./label"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({ value, onChange, label, placeholder, disabled }: DatePickerProps) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Input
        type="date"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}
