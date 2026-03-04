import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-semibold uppercase tracking-wider transition-all disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20',
  {
    variants: {
      variant: {
        default:
          'bg-white text-black border border-white hover:bg-transparent hover:text-white rounded-xl',
        outline:
          'border border-gray-700 text-gray-400 bg-transparent hover:border-gray-500 hover:text-white rounded-xl',
        ghost:
          'bg-transparent text-gray-500 hover:text-white rounded-xl',
        destructive:
          'bg-transparent border border-red-500/30 text-red-400 hover:border-red-400 hover:text-red-300 rounded-xl',
        neon:
          'border border-green-400 text-green-400 bg-green-400/5 hover:bg-green-400/10 rounded-xl',
        cyan:
          'border border-cyan-400 text-cyan-400 bg-cyan-400/5 hover:bg-cyan-400/10 rounded-xl',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 py-1.5',
        lg: 'h-12 px-6 py-3',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
