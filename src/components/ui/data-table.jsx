import React from 'react';
import { cn } from '@/lib/utils';
import {
  Table as BaseTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

const getAccessorValue = (row, accessor) => {
  if (typeof accessor === 'function') {
    return accessor(row);
  }

  return row?.[accessor];
};

const renderCellValue = (row, column) => {
  const value = getAccessorValue(row, column.accessor);

  if (column.Cell) {
    return column.Cell({ row: { original: row }, value, column });
  }

  return value;
};

const Table = ({ columns, data = [], className, children, ...props }) => {
  if (columns && !children) {
    return (
      <BaseTable className={cn('text-sm', className)} {...props}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.Header ?? column.accessor}>{column.Header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={row.id ?? rowIndex}>
              {columns.map((column) => (
                <TableCell key={`${row.id ?? rowIndex}-${column.accessor ?? column.Header}`}>
                  {renderCellValue(row, column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </BaseTable>
    );
  }

  return (
    <BaseTable className={className} {...props}>
      {children}
    </BaseTable>
  );
};

export { Table };
