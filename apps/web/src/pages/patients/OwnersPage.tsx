import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Users } from "lucide-react";
import { useOwners, useDeleteOwner } from "@/hooks/use-owners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { OwnerForm } from "@/components/patients/OwnerForm";
import { useDebounce } from "@/hooks/use-debounce";
import type { Owner } from "@/types/patients";
import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { hasPermission } from "@/lib/permissions";

const PAGE_SIZE = 20;

export function OwnersPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = hasPermission(role, "PATIENT_WRITE");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editOwner, setEditOwner] = useState<Owner | undefined>();

  const debouncedSearch = useDebounce(search, 300);

  // Cursor-based pagination: cursorHistory[i] is the cursor that fetches page i+2
  // (page 1 has no cursor). pageIndex is 0-based.
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
    setCursorHistory([]);
  }, [debouncedSearch]);

  const currentCursor =
    pageIndex === 0 ? undefined : cursorHistory[pageIndex - 1];

  const { data, isLoading, isFetching } = useOwners({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(currentCursor ? { cursor: currentCursor } : {}),
    limit: PAGE_SIZE,
  });
  const deleteOwner = useDeleteOwner();

  const goToNextPage = () => {
    if (!data?.hasMore || !data.nextCursor) return;
    setCursorHistory((prev) => {
      const next = [...prev];
      next[pageIndex] = data.nextCursor as string;
      return next;
    });
    setPageIndex((p) => p + 1);
  };

  const goToPreviousPage = () => {
    setPageIndex((p) => Math.max(0, p - 1));
  };

  const handleEdit = useCallback((owner: Owner) => {
    setEditOwner(owner);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditOwner(undefined);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm("Remove this owner? This cannot be undone.")) {
        deleteOwner.mutate(id);
      }
    },
    [deleteOwner],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Owners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All registered Owners
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4" />
            Add owner
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Pets</TableHead>
              <TableHead>Contact via</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-36" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}

            {!isLoading && data?.items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-16 text-muted-foreground"
                >
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No owners found</p>
                  <p className="text-sm mt-1">
                    {search
                      ? "Try a different search term."
                      : "Add your first owner to get started."}
                  </p>
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              data?.items.map((owner) => (
                <TableRow
                  key={owner.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/owners/${owner.id}`)}
                >
                  <TableCell className="font-medium">
                    {owner.first_name} {owner.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {owner.phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {owner.email ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{owner._count?.pets ?? 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {owner.preferred_contact}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/owners/${owner.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" /> View
                        </DropdownMenuItem>
                        {canWrite && (
                          <>
                            <DropdownMenuItem onClick={() => handleEdit(owner)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(owner.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Remove
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {(pageIndex > 0 || (!isLoading && (data?.items.length ?? 0) > 0)) && (
        <Pagination className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={goToPreviousPage}
                aria-disabled={pageIndex === 0}
                className={
                  pageIndex === 0
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink isActive>{pageIndex + 1}</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={goToNextPage}
                aria-disabled={!data?.hasMore || isFetching}
                className={
                  !data?.hasMore || isFetching
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <OwnerForm
        open={showForm}
        onClose={handleCloseForm}
        {...(editOwner ? { editOwner } : {})}
      />
    </div>
  );
}
