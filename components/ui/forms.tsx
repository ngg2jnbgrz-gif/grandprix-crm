"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export type FieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
};

/** Labeled form field wrapper: micro-label + control + hint/error line. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: FieldProps) {
  return (
    <div className="block">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-hud-muted"
      >
        {label}
        {required ? <span className="text-hud-red"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-hud-red">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-hud-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const controlClass =
  "w-full rounded-sm border border-hud-line bg-[#0a1620] px-3 py-2 text-sm text-hud-ink placeholder:text-hud-muted/50 outline-none transition focus:border-[var(--hud-accent)] focus:shadow-[0_0_0_1px_var(--hud-accent)] disabled:opacity-50";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${controlClass} ${className}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", rows = 4, ...rest } = props;
  return <textarea {...rest} rows={rows} className={`${controlClass} ${className}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select {...rest} className={`${controlClass} ${className}`}>
      {children}
    </select>
  );
}

export type ButtonVariant = "primary" | "outline" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--hud-accent)] font-semibold text-[#04121a] hover:brightness-110",
  outline:
    "border border-hud-line text-hud-ink hover:border-[var(--hud-accent)] hover:text-[var(--hud-accent)]",
  danger: "border border-hud-red/50 text-hud-red hover:bg-hud-red/10",
  ghost: "text-hud-muted hover:text-hud-ink",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      {...props}
      className={`hud-clip-sm inline-flex items-center justify-center gap-2 uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]} ${sizeClass[size]} ${className}`}
    />
  );
}
