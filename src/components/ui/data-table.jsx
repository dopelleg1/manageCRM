import React, { useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function DataTable({ 
    columns, 
    data, 
    filterPlaceholder,
    pagination,
    onPaginationChange,
    pageIndex,
    onPageIndexChange,
    sorting,
    onSortingChange,
    columnFilters,
    onColumnFiltersChange,
    expanded,
    onExpandedChange
}) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pageInput, setPageInput] = useState("")
  const [pageError, setPageError] = useState("")
  const [internalPagination, setInternalPagination] = useState({ pageIndex: 0, pageSize: 10 })
  
  const activePagination = pagination || (pageIndex !== undefined ? { pageIndex, pageSize: 10 } : internalPagination);

  const handlePaginationChange = (updater) => {
      const newPagination = typeof updater === 'function' ? updater(activePagination) : updater;
      
      if (onPaginationChange) {
          onPaginationChange(newPagination);
      }
      if (onPageIndexChange) {
          onPageIndexChange(newPagination.pageIndex);
      }
      if (!pagination && pageIndex === undefined) {
          setInternalPagination(newPagination);
      }
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      globalFilter,
      pagination: activePagination,
      ...(sorting !== undefined && { sorting }),
      ...(columnFilters !== undefined && { columnFilters }),
      ...(expanded !== undefined && { expanded }),
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: handlePaginationChange,
    onSortingChange: onSortingChange,
    onColumnFiltersChange: onColumnFiltersChange,
    onExpandedChange: onExpandedChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: 'auto',
    autoResetPageIndex: false,
    autoResetExpanded: false,
  })

  const handlePageJump = (e) => {
      if (e.key === 'Enter') {
          const pageNumber = parseInt(pageInput, 10);
          const totalPages = table.getPageCount();
          
          if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
              setPageError("Pagina non valida");
          } else {
              table.setPageIndex(pageNumber - 1);
              setPageInput("");
              setPageError("");
          }
      }
  };

  return (
    <div className="space-y-4">
        {/* Responsive Table Wrapper */}
        <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto w-full">
                <Table className="min-w-[800px] md:min-w-0"> {/* min-w for horizontal scroll on small screens */}
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                            return (
                                <TableHead key={header.id} className="whitespace-nowrap bg-gray-50 dark:bg-gray-800 py-3 px-4">
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                </TableHead>
                            )
                            })}
                        </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                            {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id} className="whitespace-nowrap py-3 px-4">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                            ))}
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                            Nessun risultato.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
            <div className="flex-1 text-sm text-muted-foreground text-center sm:text-left w-full">
                Pagina {table.getState().pagination.pageIndex + 1} di {table.getPageCount() || 1}
            </div>
            
            <div className="flex items-center justify-center space-x-2 w-full sm:w-auto">
                <Button
                    variant="outline"
                    size="default"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="h-11"
                >
                    Precedente
                </Button>
                
                <div className="flex flex-col relative items-center mx-2 hidden sm:flex">
                    <Input 
                        placeholder="Vai a pagina..."
                        value={pageInput}
                        onChange={(e) => {
                            setPageInput(e.target.value);
                            if (pageError) setPageError("");
                        }}
                        onKeyDown={handlePageJump}
                        className="w-32 h-11 text-center"
                    />
                    {pageError && (
                        <span className="text-xs text-red-500 absolute -bottom-5 whitespace-nowrap">
                            {pageError}
                        </span>
                    )}
                </div>

                <Button
                    variant="outline"
                    size="default"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="h-11"
                >
                    Successivo
                </Button>
            </div>
        </div>
    </div>
  )
}