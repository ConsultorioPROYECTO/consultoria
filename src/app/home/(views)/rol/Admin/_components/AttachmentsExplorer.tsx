"use client";

import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import WaveformLoader from "@/components/custom/WaveformLoader";
import { useAuth } from "@/app/context/AuthContext";
import { 
  Folder, 
  File, 
  ChevronRight, 
  Home, 
  RefreshCw, 
  ArrowUp, 
  Search,
  FileText,
  Image as ImageIcon,
  Video,
  Download,
  Eye
} from "lucide-react";

interface AttachmentPathItem {
  id: number;
  objectKey: string;
  objectName: string;
  contentType: string;
  fileSize: number;
  fileCategory: string;
  createdAt: string;
  isActive: boolean;
}

interface PathGroup {
  prefix: string; // next segment
  count: number;
  totalSize: number;
  latestCreatedAt: string;
  items?: AttachmentPathItem[];
}

interface AttachmentListByPathsResponse {
  data?: {
    groups: PathGroup[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    filters: {
      prefix?: string;
      depth?: number;
      includeItems?: boolean;
    };
  };
  message?: string;
}

/**
 * Get file icon based on content type
 */
function getFileIcon(contentType: string): ReactNode {
  if (contentType.startsWith('image/')) {
    return <ImageIcon className="w-4 h-4 text-blue-500" />;
  }
  if (contentType.startsWith('video/')) {
    return <Video className="w-4 h-4 text-purple-500" />;
  }
  if (contentType.includes('pdf') || contentType.includes('document')) {
    return <FileText className="w-4 h-4 text-red-500" />;
  }
  return <File className="w-4 h-4 text-gray-500" />;
}

/**
 * Human-readable bytes helper
 */
function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

/**
 * Format date to human readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Admin explorer to browse R2 attachments grouped by path segments.
 * Uses /api/attachments/list-by-paths (admin only).
 */
export function AttachmentsExplorer() {
  const { user } = useAuth();

  // Query state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [prefix, setPrefix] = useState("");
  const [depth, setDepth] = useState(1);
  const [includeItems, setIncludeItems] = useState(true);
  const [sortBy, setSortBy] = useState<"latestCreatedAt" | "prefix" | "count" | "totalSize">("prefix");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");

  // Data state
  const [groups, setGroups] = useState<PathGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs = useMemo(() => {
    if (!prefix.trim()) return [];
    const parts = prefix.trim().replace(/^\/+|\/+$/g, '').split("/").filter(Boolean);
    const crumbs: { label: string; fullPrefix: string }[] = [];
    for (let i = 0; i < parts.length; i++) {
      const full = parts.slice(0, i + 1).join("/");
      crumbs.push({ label: parts[i], fullPrefix: full });
    }
    return crumbs;
  }, [prefix]);

  // Filter groups based on search term
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    return groups.filter(group => 
      group.prefix.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.items?.some(item => 
        item.objectName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [groups, searchTerm]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (prefix.trim()) params.set("prefix", prefix.trim());
      params.set("depth", String(depth));
      params.set("includeItems", String(includeItems));
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const resp = await fetch(`/api/attachments/list-by-paths?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("No se pudo obtener la lista de archivos");
      const json: AttachmentListByPathsResponse = await resp.json();
      const data = json.data;
      setGroups(data?.groups ?? []);
      setTotal(data?.pagination.total ?? 0);
      setTotalPages(data?.pagination.totalPages ?? 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [user, page, limit, prefix, depth, includeItems, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateInto = (segment: string) => {
    // Since backend returns relative segments, we build the next prefix by appending
    const normalizedPrefix = prefix.trim().replace(/^\/+|\/+$/g, '');
    const next = normalizedPrefix ? `${normalizedPrefix}/${segment}` : segment;
    setPrefix(next);
    setPage(1);
    setSearchTerm("");
  };

  const navigateTo = (targetPrefix: string) => {
    // Normalize the target prefix to prevent issues
    const normalized = targetPrefix.trim().replace(/^\/+|\/+$/g, '');
    setPrefix(normalized);
    setPage(1);
    setSearchTerm("");
  };

  const goUp = () => {
    const normalizedPrefix = prefix.trim().replace(/^\/+|\/+$/g, '');
    if (!normalizedPrefix) return; // Already at root
    
    const parts = normalizedPrefix.split("/").filter(Boolean);
    if (parts.length === 0) return; // Safety check
    
    parts.pop(); // Remove last segment
    setPrefix(parts.join("/"));
    setPage(1);
    setSearchTerm("");
  };

  const handleViewAttachment = async (objectKey: string, fileName?: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const resp = await fetch("/api/attachments/presigned-get-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ objectKey, disposition: "inline", fileName }),
      });
      if (!resp.ok) throw new Error("No se pudo obtener URL de descarga");
      const data: { data: { presignedUrl: string } } = await resp.json();
      window.open(data.data.presignedUrl, "_blank");
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadAttachment = async (objectKey: string, fileName?: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const resp = await fetch("/api/attachments/presigned-get-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ objectKey, disposition: "attachment", fileName }),
      });
      if (!resp.ok) throw new Error("No se pudo obtener URL de descarga");
      const data: { data: { presignedUrl: string } } = await resp.json();
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = data.data.presignedUrl;
      link.download = fileName || objectKey.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card className="h-[800px] flex flex-col">
      <CardHeader className="flex-shrink-0 pb-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl font-semibold">
            <Folder className="w-5 h-5 text-blue-600" />
            Explorador de Archivos
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchData(); }} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2" 
            onClick={() => navigateTo("")}
          >
            <Home className="w-4 h-4" />
          </Button>
          {breadcrumbs.map((crumb) => (
            <div key={crumb.fullPrefix} className="flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigateTo(crumb.fullPrefix)}
              >
                {crumb.label}
              </Button>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar archivos y carpetas..."
              className="w-full h-9 pl-10 pr-3 rounded-md border bg-background text-foreground"
            />
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prefix">Nombre</SelectItem>
                <SelectItem value="latestCreatedAt">Fecha</SelectItem>
                <SelectItem value="totalSize">Tamaño</SelectItem>
                <SelectItem value="count">Cantidad</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "asc" | "desc")}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">↑</SelectItem>
                <SelectItem value="desc">↓</SelectItem>
              </SelectContent>
            </Select>

            {/* Depth control */}
            <Select value={String(depth)} onValueChange={(v) => { setDepth(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Depth" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((d) => (
                  <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Include items toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeItems}
                onChange={(e) => setIncludeItems(e.target.checked)}
              />
              Items
            </label>

            {prefix && (
              <Button variant="outline" size="sm" onClick={goUp}>
                <ArrowUp className="w-4 h-4" />
                Subir
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden px-0">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <WaveformLoader className="w-24 h-auto text-muted-foreground" />
          </div>
        )}

        {!loading && error && (
          <div className="text-destructive text-sm p-4">{error}</div>
        )}

        {!loading && !error && (
          <>
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="w-32">Tamaño</TableHead>
                    <TableHead className="w-40">Fecha modificación</TableHead>
                    <TableHead className="w-32">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {searchTerm ? "No se encontraron archivos que coincidan con la búsqueda" : "Esta carpeta está vacía"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {/* Directory rows */}
                      {filteredGroups.map((group) => (
                        <TableRow 
                          key={`folder-${group.prefix}`}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigateInto(group.prefix)}
                        >
                          <TableCell>
                            <Folder className="w-4 h-4 text-blue-600" />
                          </TableCell>
                          <TableCell className="font-medium">
                            {group.prefix}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.count} elemento{group.count !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(group.latestCreatedAt)}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateInto(group.prefix);
                              }}
                            >
                              Abrir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* File rows - only show if includeItems is true */}
                      {includeItems && filteredGroups.map((group) => 
                        group.items?.map((item) => (
                          <TableRow key={`file-${item.id}`} className="hover:bg-muted/50">
                            <TableCell>
                              {getFileIcon(item.contentType)}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{item.objectName}</span>
                              <div className="text-xs text-muted-foreground">
                                {item.contentType}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatBytes(item.fileSize)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(item.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewAttachment(item.objectKey, item.objectName)}
                                  title="Ver archivo"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadAttachment(item.objectKey, item.objectName)}
                                  title="Descargar archivo"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  Total: {total} elementos | Página {page} de {totalPages}
                </div>
                {/* Page size control */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Por página</span>
                  <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((sz) => (
                        <SelectItem key={sz} value={String(sz)}>{sz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page <= 1}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => (p < totalPages ? p + 1 : p))} 
                  disabled={page >= totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}