import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  ReactNode,
} from "react";
import { uploadVideoToBunny } from "../lib/bunnyUtils";

export interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: "Aguardando" | "Enviando..." | "Concluído" | "Erro";
  embedUrl?: string;
  error?: string;
}

export interface UploadRequest {
  file: File;
  onComplete?: (url: string) => void;
  movieId?: string; // Optional metadata
}

interface UploadContextType {
  uploads: UploadItem[];
  addUploads: (requests: UploadRequest[]) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  // Reference for file objects since keeping them in state for a log time can cause issues or just bloat
  const pendingFilesRef = useRef<
    {
      id: string;
      file: File;
      movieId?: string;
      onComplete?: (url: string) => void;
    }[]
  >([]);
  const isUploadingRef = useRef(false);

  const processQueue = async () => {
    if (isUploadingRef.current || pendingFilesRef.current.length === 0) return;

    isUploadingRef.current = true;

    while (pendingFilesRef.current.length > 0) {
      const currentTask = pendingFilesRef.current.shift();
      if (!currentTask) continue;

      const { id, file, onComplete } = currentTask;

      setUploads((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "Enviando..." } : u)),
      );

      try {
        const url = await uploadVideoToBunny(file, file.name, (prog) => {
          setUploads((prev) =>
            prev.map((u) => (u.id === id ? { ...u, progress: prog } : u)),
          );
        });

        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, progress: 100, status: "Concluído", embedUrl: url }
              : u,
          ),
        );

        if (onComplete) {
          onComplete(url);
        }
      } catch (err: any) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? { ...u, status: "Erro", error: err.message || "Erro no upload" }
              : u,
          ),
        );
      }

      // Delay to avoid strict rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    isUploadingRef.current = false;
  };

  const addUploads = (requests: UploadRequest[]) => {
    const newItems: UploadItem[] = requests.map((req) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: req.file.name,
      progress: 0,
      status: "Aguardando",
    }));

    setUploads((prev) => [...prev, ...newItems]);

    requests.forEach((req, idx) => {
      pendingFilesRef.current.push({
        id: newItems[idx].id,
        file: req.file,
        movieId: req.movieId,
        onComplete: req.onComplete,
      });
    });

    processQueue();
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
    pendingFilesRef.current = pendingFilesRef.current.filter(
      (t) => t.id !== id,
    );
  };

  const clearCompleted = () => {
    setUploads((prev) =>
      prev.filter((u) => u.status !== "Concluído" && u.status !== "Erro"),
    );
  };

  return (
    <UploadContext.Provider
      value={{ uploads, addUploads, removeUpload, clearCompleted }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUploads() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUploads must be used within an UploadProvider");
  }
  return context;
}
