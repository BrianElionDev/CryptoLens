import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export interface Column {
  id: string;
  name: string;
  enabled: boolean;
}

interface CryptoColumnsSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onChange: (columns: Column[]) => void;
}

export function CryptoColumnsSelector({
  isOpen,
  onClose,
  columns,
  onChange,
}: CryptoColumnsSelectorProps) {
  const [selectedColumns, setSelectedColumns] = useState<Column[]>(columns);

  const handleToggleColumn = (columnId: string) => {
    const updatedColumns = selectedColumns.map((col) => {
      if (col.id === columnId) {
        return { ...col, enabled: !col.enabled };
      }
      return col;
    });
    setSelectedColumns(updatedColumns);
  };

  const handleApply = () => {
    onChange(selectedColumns);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-gray-900 w-full max-w-md rounded-xl border border-gray-800 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">
            Customize Columns
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {selectedColumns.map((column) => (
              <div key={column.id} className="flex items-center space-x-3">
                <Checkbox
                  id={`column-${column.id}`}
                  checked={column.enabled}
                  onCheckedChange={() => handleToggleColumn(column.id)}
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <label
                  htmlFor={`column-${column.id}`}
                  className="text-md text-gray-200 font-medium cursor-pointer"
                >
                  {column.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end p-4 border-t border-gray-800">
          <Button
            variant="default"
            onClick={handleApply}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
