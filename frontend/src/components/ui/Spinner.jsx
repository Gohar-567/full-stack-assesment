/**
 * Animated loading spinner.
 * size: 'sm' | 'md' | 'lg'
 * color: 'amber' | 'white' | 'navy'
 */
const SIZE = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
const BORDER = {
  amber: 'border-amber-500 border-t-transparent',
  white: 'border-white border-t-transparent',
  navy:  'border-navy-900 border-t-transparent',
};

export default function Spinner({ size = 'md', color = 'amber' }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-2 animate-spin ${SIZE[size]} ${BORDER[color]}`}
    />
  );
}
