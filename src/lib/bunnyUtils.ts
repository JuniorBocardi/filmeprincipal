// Helper functions for Bunny.net stream API
export interface BunnySettings {
  apiKey: string;
  libraryId: string;
}

export const getBunnySettings = (): BunnySettings | null => {
  const apiKey =
    localStorage.getItem("bunny_api_key") ||
    "424696b4-34d6-4bb1-9277cdeb4f00-9b16-4a22";
  const libraryId = localStorage.getItem("bunny_library_id") || "682206";
  if (apiKey && libraryId) {
    return { apiKey, libraryId };
  }
  return null;
};

export const saveBunnySettings = (apiKey: string, libraryId: string) => {
  localStorage.setItem("bunny_api_key", apiKey);
  localStorage.setItem("bunny_library_id", libraryId);
};

export const uploadVideoToBunny = async (
  file: File,
  title: string,
  onProgress?: (progress: number) => void,
): Promise<string> => {
  const settings = getBunnySettings();
  if (!settings) {
    throw new Error(
      "Bunny.net não está configurado. Configure na aba de Configurações do painel admin.",
    );
  }

  // 1. Create Video
  const createRes = await fetch(
    `https://video.bunnycdn.com/library/${settings.libraryId}/videos`,
    {
      method: "POST",
      headers: {
        AccessKey: settings.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: title }),
    },
  );

  if (!createRes.ok) {
    throw new Error("Falha ao criar o vídeo no Bunny.net");
  }

  const videoData = await createRes.json();
  const videoId = videoData.guid;

  // 2. Upload Video Base (using fetch might buffer entirely in memory, but fine for prototypes)
  // For better progress tracking we use XMLHttpRequest.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `https://video.bunnycdn.com/library/${settings.libraryId}/videos/${videoId}`;

    xhr.open("PUT", url, true);
    xhr.setRequestHeader("AccessKey", settings.apiKey);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Return Embed URL
        resolve(
          `https://iframe.mediadelivery.net/embed/${settings.libraryId}/${videoId}`,
        );
      } else {
        reject(new Error(`Falha ao fazer upload: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Erro de rede durante o upload do vídeo."));
    };

    xhr.send(file);
  });
};
