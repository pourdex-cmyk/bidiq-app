import { cn } from '@/utils/cn';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyText?: string;
  className?: string;
}

export default function Table<T extends Record<string, any>>({
  columns, data, keyField = 'id', onRowClick, loading, emptyText = 'No data', className
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-[var(--border-default)]', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--border-subtle)]">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="skeleton h-4 rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-[var(--text-tertiary)]">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-[var(--bg-elevated)]'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-3 text-[var(--text-primary)]', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
