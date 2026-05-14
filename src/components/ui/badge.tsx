import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
  {
    variants: {
      variant: {
        default: 'bg-brand-teal/10 text-brand-teal',
        pending: 'bg-brand-wine/10 text-brand-wine',
        subtle: 'bg-black/5 text-black/70',
        professor: 'bg-brand-teal/12 text-brand-teal ring-1 ring-brand-teal/10',
        coordinator: 'bg-brand-wine/12 text-brand-wine ring-1 ring-brand-wine/10',
        approved: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
        rejected: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200',
        waiting: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
        partial: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
