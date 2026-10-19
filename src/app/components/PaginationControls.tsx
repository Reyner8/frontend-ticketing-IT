import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "./ui/utils";
import type { PaginationMeta } from "../lib/api/client";
import { PAGINATION } from "../lib/constants";

interface PaginationControlsProps {
  meta: PaginationMeta | null;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  pageSizeOptions?: readonly number[];
  disabled?: boolean;
  className?: string;
}

function buildPageItems(current: number, last: number): (number | "dots")[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const items: (number | "dots")[] = [];
  for (let i = 1; i <= last; i++) {
    if (i === 1 || i === last || Math.abs(i - current) <= 1) {
      items.push(i);
    } else if (items[items.length - 1] !== "dots") {
      items.push("dots");
    }
  }
  return items;
}

export function PaginationControls({
  meta,
  onPageChange,
  onPerPageChange,
  pageSizeOptions = PAGINATION.pageSizeOptions,
  disabled = false,
  className,
}: PaginationControlsProps) {
  if (!meta || meta.total === 0) return null;

  const { currentPage, lastPage, perPage, total } = meta;
  const from = (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  const go = (page: number) => {
    if (disabled || page < 1 || page > lastPage || page === currentPage) return;
    onPageChange(page);
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 pt-4",
        className
      )}
    >
      <p className="text-xs text-muted-foreground order-2 sm:order-1">
        Menampilkan {from}&ndash;{to} dari {total} data
      </p>

      <Pagination className="mx-0 w-auto order-1 sm:order-2">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={disabled || currentPage <= 1}
              className={cn(
                "h-8 text-xs",
                (disabled || currentPage <= 1) && "pointer-events-none opacity-50"
              )}
              onClick={(e) => {
                e.preventDefault();
                go(currentPage - 1);
              }}
            />
          </PaginationItem>
          {buildPageItems(currentPage, lastPage).map((item, idx) =>
            item === "dots" ? (
              <PaginationItem key={`dots-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  href="#"
                  isActive={item === currentPage}
                  className="h-8 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    go(item);
                  }}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={disabled || currentPage >= lastPage}
              className={cn(
                "h-8 text-xs",
                (disabled || currentPage >= lastPage) && "pointer-events-none opacity-50"
              )}
              onClick={(e) => {
                e.preventDefault();
                go(currentPage + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {onPerPageChange && (
        <div className="flex items-center gap-2 order-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Baris/halaman</span>
          <Select
            value={String(perPage)}
            onValueChange={(v) => {
              const n = Number(v);
              if (!disabled && n && n !== perPage) onPerPageChange(n);
            }}
          >
            <SelectTrigger className="h-8 w-[72px] text-xs" disabled={disabled}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
