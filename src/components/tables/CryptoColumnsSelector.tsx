import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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

  // Sync selectedColumns with parent columns prop when it changes
  useEffect(() => {
    setSelectedColumns(columns);
  }, [columns]);

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

  console.log("🚀 CryptoColumnsSelector RENDERING - isOpen:", isOpen);

  // Use portal to render directly to document.body to avoid container clipping
  if (typeof window === "undefined") return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.8)",
      }}
      onClick={(e) => {
        console.log("🚀 Columns backdrop clicked");
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative bg-gray-900 w-full max-w-md rounded-xl border-2 border-gray-700 shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "#111827",
          border: "2px solid #374151",
        }}
      >
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

  return createPortal(modalContent, document.body);
}
