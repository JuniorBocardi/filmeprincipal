export interface Movie {
  id: string;
  titulo_pt: string;
  descricao: string;
  poster_url: string;
  tags: string[];
  url_video: string;
  is_free: boolean;
  is_featured?: boolean;
  criado_em?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  telefone?: string;
  sessao_persistente?: string;
  criado_em?: string;
  minha_lista?: string[]; // IDs of movies
  continuar_assistindo?: {
    movieId: string;
    progress: number;
    updatedAt: string;
  }[];
}
