import { Download, FileImage, FileText, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ExportMenuProps {
  onExport: (format: 'png' | 'jpg' | 'pdf' | 'html') => void;
  disabled?: boolean;
}

export function ExportMenu({ onExport, disabled = false }: ExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled}
          className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30"
        >
          <Download size={16} className="mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export as Image</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onExport('png')}>
          <FileImage className="mr-2 h-4 w-4" />
          PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('jpg')}>
          <FileImage className="mr-2 h-4 w-4" />
          JPG
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Export as Document</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onExport('pdf')}>
          <File className="mr-2 h-4 w-4" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('html')}>
          <FileText className="mr-2 h-4 w-4" />
          HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}