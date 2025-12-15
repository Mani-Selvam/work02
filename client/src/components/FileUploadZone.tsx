import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";
import { useState } from "react";

interface FileUploadZoneProps {
  accept?: string;
  multiple?: boolean;
  onFilesChange?: (files: File[]) => void;
}

export default function FileUploadZone({ accept = "*", multiple = false, onFilesChange }: FileUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(multiple ? [...files, ...newFiles] : newFiles);
      onFilesChange?.(multiple ? [...files, ...newFiles] : newFiles);
      console.log("Files selected:", newFiles.map(f => f.name));
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange?.(newFiles);
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed hover-elevate cursor-pointer" data-testid="zone-file-upload">
        <CardContent className="p-8">
          <input
            type="file"
            id="file-upload"
            accept={accept}
            multiple={multiple}
            onChange={handleFileChange}
            className="hidden"
            data-testid="input-file"
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">
                {accept === "application/pdf" ? "PDF files only" : accept === "image/*" ? "Images only" : "Any file type"}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm">
              Browse Files
            </Button>
          </label>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <Card key={index} data-testid={`card-file-${index}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(index)}
                    data-testid={`button-remove-file-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
