import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Column {
  key: string;
  label: string;
  width?: string;
  type?: "text" | "number" | "date";
  editable?: boolean;
}

interface ExcelTableProps<T extends Record<string, any>> {
  columns: Column[];
  data: T[];
  onAdd: (newRow: Partial<T>) => void;
  onUpdate: (id: number, field: string, value: any) => void;
  onDelete: (id: number) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function ExcelTable<T extends Record<string, any>>({
  columns,
  data,
  onAdd,
  onUpdate,
  onDelete,
  loading = false,
  emptyMessage = "No data yet. Click + Add Row to start.",
}: ExcelTableProps<T>) {
  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<T | null>(null);
  const [draftRows, setDraftRows] = useState<Map<number, Partial<T>>>(new Map());
  const [nextDraftId, setNextDraftId] = useState(-1);

  const handleCellClick = (e: React.MouseEvent, rowId: number, field: string, currentValue: any) => {
    e.stopPropagation();
    const column = columns.find(col => col.key === field);
    if (column?.editable === false) return;
    
    setEditingCell({ rowId, field });
    setEditValue(currentValue?.toString() || "");
  };

  const handleCellBlur = () => {
    if (editingCell) {
      const column = columns.find(col => col.key === editingCell.field);
      let finalValue: any = editValue;
      
      if (column?.type === "number") {
        finalValue = editValue ? parseFloat(editValue) : null;
      }
      
      // Check if this is a draft row
      if (editingCell.rowId < 0 && draftRows.has(editingCell.rowId)) {
        const draftRow = draftRows.get(editingCell.rowId) || {};
        const updatedDraft = { ...draftRow, [editingCell.field]: finalValue };
        
        // Update draft row
        setDraftRows(new Map(draftRows.set(editingCell.rowId, updatedDraft)));
        
        // Try to save the draft row if it's valid (has required fields)
        // For now, we'll just update it locally and user can save manually
      } else {
        // Update existing row
        onUpdate(editingCell.rowId, editingCell.field, finalValue);
      }
      
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCellBlur();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const handleAddRow = () => {
    const newRow: any = { id: nextDraftId };
    columns.forEach(col => {
      if (col.key !== "id" && col.key !== "createdAt" && col.key !== "updatedAt") {
        newRow[col.key] = null;
      }
    });
    
    // Add as draft row instead of saving immediately
    setDraftRows(new Map(draftRows.set(nextDraftId, newRow)));
    setNextDraftId(nextDraftId - 1);
  };
  
  const handleSaveDraft = (draftId: number) => {
    const draftRow = draftRows.get(draftId);
    if (draftRow) {
      // Remove id from draft before saving
      const { id, ...rowData } = draftRow;
      onAdd(rowData as Partial<T>);
      
      // Remove from drafts
      const newDrafts = new Map(draftRows);
      newDrafts.delete(draftId);
      setDraftRows(newDrafts);
    }
  };
  
  const handleDeleteDraft = (draftId: number) => {
    const newDrafts = new Map(draftRows);
    newDrafts.delete(draftId);
    setDraftRows(newDrafts);
  };

  const handleViewRow = (row: T) => {
    setSelectedRow(row);
    setViewDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2">
        <Button
          onClick={handleAddRow}
          size="sm"
          data-testid="button-add-row"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th
                  className="border-b border-border p-2 text-left text-sm font-medium sticky top-0 bg-muted z-10"
                  style={{ width: "60px", minWidth: "60px" }}
                >
                  S.No
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="border-b border-border p-2 text-left text-sm font-medium sticky top-0 bg-muted z-10"
                    style={{ width: column.width || "auto", minWidth: "120px" }}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="border-b border-border p-2 w-16 sticky top-0 bg-muted z-10">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + 2} className="p-8 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 && draftRows.size === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="p-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                <>
                  {/* Render draft rows first */}
                  {Array.from(draftRows.entries()).map(([draftId, draftRow], draftIndex) => (
                    <tr 
                      key={draftId} 
                      className="bg-yellow-50 dark:bg-yellow-950/20"
                      data-testid={`draft-row-${draftId}`}
                    >
                      <td className="border-b border-border p-0 bg-muted/50">
                        <div className="px-3 py-2 min-h-[40px] flex items-center justify-center text-sm font-medium">
                          <span className="text-yellow-600 dark:text-yellow-400">New</span>
                        </div>
                      </td>
                      {columns.map((column) => {
                        const isEditing =
                          editingCell?.rowId === draftId &&
                          editingCell?.field === column.key;
                        const cellValue = draftRow[column.key];

                        return (
                          <td
                            key={`${draftId}-${column.key}`}
                            className="border-b border-border p-0 cursor-pointer"
                            onClick={(e) => handleCellClick(e, draftId, column.key, cellValue)}
                            data-testid={`cell-${column.key}-${draftId}`}
                          >
                            {isEditing ? (
                              <Input
                                type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="border-0 h-full min-h-[40px] rounded-none focus-visible:ring-2 focus-visible:ring-ring"
                                data-testid={`input-${column.key}-${draftId}`}
                              />
                            ) : (
                              <div className="px-3 py-2 min-h-[40px] flex items-center text-sm">
                                {cellValue || (
                                  <span className="text-muted-foreground italic">
                                    Click to edit
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="border-b border-border p-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSaveDraft(draftId)}
                            data-testid={`button-save-${draftId}`}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDraft(draftId)}
                            data-testid={`button-cancel-${draftId}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Render saved rows */}
                  {data.map((row, index) => (
                  <tr 
                    key={row.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => handleViewRow(row)}
                    data-testid={`row-${row.id}`}
                  >
                    <td className="border-b border-border p-0 bg-muted/50">
                      <div className="px-3 py-2 min-h-[40px] flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                    </td>
                    {columns.map((column) => {
                      const isEditing =
                        editingCell?.rowId === row.id &&
                        editingCell?.field === column.key;
                      const cellValue = row[column.key];

                      return (
                        <td
                          key={`${row.id}-${column.key}`}
                          className={cn(
                            "border-b border-border p-0 cursor-pointer",
                            column.editable === false && "bg-muted/50 cursor-default"
                          )}
                          onClick={(e) => handleCellClick(e, row.id, column.key, cellValue)}
                          data-testid={`cell-${column.key}-${row.id}`}
                        >
                          {isEditing ? (
                            <Input
                              type={column.type === "number" ? "number" : column.type === "date" ? "date" : "text"}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleCellBlur}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              className="border-0 h-full min-h-[40px] rounded-none focus-visible:ring-2 focus-visible:ring-ring"
                              data-testid={`input-${column.key}-${row.id}`}
                            />
                          ) : (
                            <div className="px-3 py-2 min-h-[40px] flex items-center text-sm">
                              {cellValue || (
                                <span className="text-muted-foreground italic">
                                  {column.editable === false ? "-" : "Click to edit"}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="border-b border-border p-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRow(row);
                          }}
                          data-testid={`button-view-${row.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(row.id);
                          }}
                          data-testid={`button-delete-${row.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>View Details</DialogTitle>
            <DialogDescription>
              Complete information for this entry
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedRow && (
              <div className="space-y-4 pr-4">
                {columns.map((column) => (
                  <div key={column.key} className="grid grid-cols-3 gap-4 py-2 border-b">
                    <div className="font-medium text-sm text-muted-foreground">
                      {column.label}
                    </div>
                    <div className="col-span-2 text-sm" data-testid={`view-${column.key}`}>
                      {selectedRow[column.key] || (
                        <span className="text-muted-foreground italic">Not set</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
