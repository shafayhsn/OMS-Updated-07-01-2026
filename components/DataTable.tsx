import React from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const DataTable = <T extends { id: string }>({ data, columns, title, actionLabel, onAction }: DataTableProps<T>) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-lg font-medium text-[#37352F]">{title}</h2>
        {actionLabel && (
          <button 
            onClick={onAction}
            className="px-3 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
      
      <div className="border-t border-b border-gray-200 flex-1 overflow-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-[#F7F7F5] sticky top-0 z-10">
            <tr>
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className="font-normal text-gray-500 border-b border-gray-200 px-4 py-2 whitespace-nowrap"
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 transition-colors group cursor-default">
                {columns.map((col, idx) => (
                  <td key={idx} className="px-4 py-2.5 text-[#37352F]">
                     {typeof col.accessor === 'function' 
                        ? col.accessor(row) 
                        : (row[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
            <div className="p-8 text-center text-gray-400">No records found.</div>
        )}
      </div>
      <div className="py-2 px-4 text-xs text-gray-400 border-t border-gray-100 flex justify-between">
          <span>{data.length} records</span>
          <span>Updated just now</span>
      </div>
    </div>
  );
};
