import clsx from 'clsx'
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const styles: Record<ButtonVariant, string> = {
  primary: 'bg-coral text-white shadow-sm hover:bg-coral-dark hover:shadow-md',
  secondary: 'border border-sand-200 bg-white text-ink hover:bg-sand-50',
  ghost: 'text-ink-muted hover:bg-sand-100 hover:text-ink',
}

export function Button({
  children,
  className,
  variant = 'secondary',
  type = 'button',
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={clsx(
        'inline-flex min-h-9 items-center justify-center rounded-xl px-3 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
