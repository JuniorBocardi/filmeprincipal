import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Movie, UserProfile } from "../types";
import {
  Plus,
  Trash2,
  LogOut,
  Film,
  Users,
  Star,
  Settings,
  Image as ImageIcon,
  Video,
  CheckCircle2,
  UploadCloud,
  Edit2,
  X,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { convertToWebP } from "../lib/imageUtils";
import {
  uploadVideoToBunny,
  getBunnySettings,
  saveBunnySettings,
} from "../lib/bunnyUtils";
import { useUploads } from "../contexts/UploadContext";

const PREDEFINED_TAGS = [
  "Fantasia",
  "+18",
  "Vingança",
  "Herdeira",
  "Mãe solteira",
  "Reencarnação",
  "Romance Adolescente/Escolar",
  "Vampiros",
  "Casamento por Contrato",
];

export default function Admin() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    "movies" | "featured" | "users" | "settings" | "uploads" | "pedidos"
  >("movies");

  const [movies, setMovies] = useState<Movie[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Admin Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [notification, setNotification] = useState<string>("");

  const editingIdRef = useRef<string | null>(null);
  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");

  const videoUrlRef = useRef<string>("");
  useEffect(() => {
    videoUrlRef.current = videoUrl;
  }, [videoUrl]);

  const { uploads, addUploads, removeUpload, clearCompleted } = useUploads();

  // Bunny Settings State
  const [bunnyApi, setBunnyApi] = useState("");
  const [bunnyLibrary, setBunnyLibrary] = useState("");

  // Refs for local file inputs
  const posterInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.email === "junior.bocardi2@gmail.com") {
      fetchMovies();
      fetchUsers();
      fetchPedidos();

      const settings = getBunnySettings();
      if (settings) {
        setBunnyApi(settings.apiKey);
        setBunnyLibrary(settings.libraryId);
      }
    }
  }, [user]);

  const fetchPedidos = async () => {
    try {
      const q = collection(db, "pedidos");
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort newest first
      list.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setPedidos(list);
    } catch (error) {
      console.error("Erro ao buscar pedidos", error);
    }
  };

  const fetchMovies = async () => {
    try {
      const q = collection(db, "movies");
      const querySnapshot = await getDocs(q);
      const moviesList: Movie[] = [];
      querySnapshot.forEach((docSnap) => {
        moviesList.push({ id: docSnap.id, ...docSnap.data() } as Movie);
      });
      // Sort newest first
      moviesList.sort((a, b) => {
        if (!a.criado_em || !b.criado_em) return 0;
        return (
          new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
        );
      });
      setMovies(moviesList);
    } catch (error) {
      console.error("Erro ao buscar filmes", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const q = collection(db, "users");
      const querySnapshot = await getDocs(q);
      const list: UserProfile[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      });
      setUsersList(list);
    } catch (error) {
      console.error("Erro ao buscar usuários", error);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      if (email !== "junior.bocardi2@gmail.com") {
        throw new Error("Acesso restrito: Email não autorizado.");
      }
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        setLoginError("E-mail ou senha incorretos (ou conta não existe).");
      } else {
        setLoginError(err.message || "Credenciais inválidas.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const webpBase64 = await convertToWebP(file, 600);
      setPosterUrl(webpBase64);
    } catch (err) {
      console.error(err);
      showNotification("Erro ao converter imagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleBatchVideoSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (!getBunnySettings()) {
      showNotification(
        "Configure a API do Bunny.net na aba de Configurações primeiro.",
      );
      return;
    }

    const filesArray = Array.from(files) as File[];

    const uploadRequests = await Promise.all(
      filesArray.map(async (file) => {
        // Se for upload em LOTE (mais de 1 arquivo)
        if (filesArray.length > 1) {
          const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
          const newDocRef = await addDoc(collection(db, "movies"), {
            titulo_pt: defaultTitle + " (Processando...)",
            descricao: "",
            poster_url: "",
            tags: [],
            url_video: "",
            is_free: false,
            is_featured: false,
            criado_em: new Date().toISOString(),
          });

          return {
            file,
            movieId: newDocRef.id,
            onComplete: async (url: string) => {
              // Atualiza apenas a URL do vídeo
              // Se o título ainda contiver "(Processando...)", removemos para manter limpo, senão mantemos a edição do usuário
              const docSnap = await getDocs(collection(db, "movies"));
              let currentTitle = defaultTitle;
              docSnap.forEach((d) => {
                if (d.id === newDocRef.id) currentTitle = d.data().titulo_pt;
              });

              const updateData: any = { url_video: url };
              if (currentTitle.includes("(Processando...)")) {
                updateData.titulo_pt = currentTitle.replace(
                  " (Processando...)",
                  "",
                );
              }

              await updateDoc(doc(db, "movies", newDocRef.id), updateData);
              fetchMovies();
            },
          };
        } else {
          // Se for upload de 1 ÚNICO arquivo
          const tempId = `uploading_${Math.random().toString(36).substr(2, 9)}`;
          setVideoUrl(tempId);

          if (editingId) {
            // Editando um filme já existente
            return {
              file,
              movieId: editingId,
              onComplete: async (url: string) => {
                if (videoUrlRef.current === tempId) {
                  setVideoUrl(url); // Auto-preenche o formulário se ainda estiver aberto
                }
                await updateDoc(doc(db, "movies", editingId), {
                  url_video: url,
                });
                fetchMovies();
              },
            };
          } else {
            // Adicionando um filme novo (preenche o formulário APENSAS, sem criar rascunho no banco)
            const draftTitle = file.name.replace(/\.[^/.]+$/, "");
            // Só preenche se o título estiver vazio para não sobrescrever
            setTitulo((prev) => (prev ? prev : draftTitle));

            return {
              file,
              onComplete: async (url: string) => {
                // Se o usuário ainda não clicou em salvar, autocompleta no form
                if (videoUrlRef.current === tempId) {
                  setVideoUrl(url);
                }

                // Caso o usuário JA TENHA salvo o form, o doc terá url_video == tempId
                const q = query(
                  collection(db, "movies"),
                  where("url_video", "==", tempId),
                );
                const snapshot = await getDocs(q);
                snapshot.forEach(async (d) => {
                  await updateDoc(doc(db, "movies", d.id), { url_video: url });
                });

                fetchMovies();
              },
            };
          }
        }
      }),
    );

    addUploads(uploadRequests);
    fetchMovies(); // refreshing list to see the drafts instantly

    // Switch to uploads tab maybe? Let's stay on movies or let the user decide.
    // Alert the user that they can continue.

    // clear input so user can select the same file again if they want
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const clearForm = () => {
    setTitulo("");
    setDescricao("");
    setPosterUrl("");
    setTags([]);
    setVideoUrl("");
    setEditingId(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (posterInputRef.current) posterInputRef.current.value = "";
  };

  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "movies", editingId), {
          titulo_pt: titulo,
          descricao,
          poster_url: posterUrl,
          tags: tags,
          url_video: videoUrl,
        });
        showNotification("Filme atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "movies"), {
          titulo_pt: titulo,
          descricao,
          poster_url: posterUrl,
          tags: tags,
          url_video: videoUrl,
          is_free: false,
          is_featured: false,
          criado_em: new Date().toISOString(),
        });
        showNotification("Filme adicionado com sucesso!");
      }

      clearForm();
      fetchMovies();
      setActiveTab("movies");
    } catch (error) {
      console.error("Erro ao salvar filme", error);
      showNotification("Erro ao salvar filme.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (movie: Movie) => {
    setEditingId(movie.id);
    setTitulo(movie.titulo_pt || "");
    setDescricao(movie.descricao || "");
    setPosterUrl(movie.poster_url || "");
    setTags(movie.tags || []);
    setVideoUrl(movie.url_video || "");
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      showNotification("Clique novamente para confirmar a exclusão");
      return;
    }
    try {
      await deleteDoc(doc(db, "movies", id));
      showNotification("Filme excluído com sucesso");
      setDeleteConfirm(null);
      fetchMovies();
      if (editingId === id) clearForm();
    } catch (error) {
      console.error("Erro ao excluir", error);
      showNotification("Erro ao excluir filme");
    }
  };

  const toggleFeatured = async (movie: Movie) => {
    try {
      await updateDoc(doc(db, "movies", movie.id), {
        is_featured: !movie.is_featured,
      });
      fetchMovies();
    } catch (error) {
      console.error("Erro ao atualizar destaque", error);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveBunnySettings(bunnyApi, bunnyLibrary);
    showNotification("Configurações do Bunny.net salvas com sucesso!");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (!user || user.email !== "junior.bocardi2@gmail.com") {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center font-sans p-6 relative">
        <motion.div
          initial={{ y: 20, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative z-10 w-full max-w-md bg-black/80 p-8 rounded-2xl border border-neutral-800 shadow-[0_0_50px_rgba(168,85,247,0.15)]"
        >
          <div className="text-center mb-8">
            <Film className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Acesso Restrito</h1>
            <p className="text-neutral-400 text-sm">
              Painel de Administração do DramaTime
            </p>
          </div>

          {loginError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded mb-6 text-sm"
            >
              {loginError}
            </motion.div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                E-mail Administrativo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                placeholder="admin@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded mt-4 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50 hover:scale-[1.02]"
            >
              {isLoggingIn ? "Verificando..." : "Entrar no Painel"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-neutral-500 hover:text-purple-400"
            >
              Voltar para o site principal
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-neutral-950 text-white font-sans p-6 relative overflow-x-hidden"
    >
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-purple-600/90 backdrop-blur border border-purple-400 text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between py-6 border-b border-neutral-800 mb-6">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <Film className="text-purple-500 w-8 h-8" />
            <div className="text-2xl font-bold italic tracking-tighter">
              <span className="text-white">Admin</span>
              <span className="text-purple-500">Time</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-400 hidden md:block">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-neutral-400 hover:text-purple-400 transition-colors"
            >
              <LogOut className="w-5 h-5" /> Sair
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-8 border-b border-neutral-800 pb-px scrollbar-hide">
          <button
            onClick={() => setActiveTab("movies")}
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${activeTab === "movies" ? "border-purple-500 text-purple-400" : "border-transparent text-neutral-400 hover:text-white"}`}
          >
            <Film className="w-4 h-4" /> Filmes e Séries
          </button>
          <button
            onClick={() => setActiveTab("featured")}
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${activeTab === "featured" ? "border-purple-500 text-purple-400" : "border-transparent text-neutral-400 hover:text-white"}`}
          >
            <Star className="w-4 h-4" /> Destaques
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${activeTab === "users" ? "border-purple-500 text-purple-400" : "border-transparent text-neutral-400 hover:text-white"}`}
          >
            <Users className="w-4 h-4" /> Usuários
          </button>
          <button
            onClick={() => setActiveTab("uploads")}
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${activeTab === "uploads" ? "border-purple-500 text-purple-400" : "border-transparent text-neutral-400 hover:text-white"}`}
          >
            <UploadCloud className="w-4 h-4" /> Envios
            {uploads.filter((u) => u.status === "Enviando...").length > 0 && (
              <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                {uploads.filter((u) => u.status === "Enviando...").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${activeTab === "settings" ? "border-purple-500 text-purple-400" : "border-transparent text-neutral-400 hover:text-white"}`}
          >
            <Settings className="w-4 h-4" /> Configurações
          </button>
          <button
            onClick={() => setActiveTab("pedidos")}
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${activeTab === "pedidos" ? "border-purple-500 text-purple-400" : "border-transparent text-neutral-400 hover:text-white"}`}
          >
            <MessageSquare className="w-4 h-4" /> Pedidos
            {pedidos.filter((p) => p.status === "pendente").length > 0 && (
              <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pedidos.filter((p) => p.status === "pendente").length}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* MOVIES TAB */}
          {activeTab === "movies" && (
            <motion.div
              key="movies"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Form */}
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl h-fit shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                    {editingId ? (
                      <Edit2 className="w-5 h-5" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                    {editingId ? "Editar Filme" : "Adicionar Filme"}
                  </h2>
                  {editingId && (
                    <button
                      onClick={clearForm}
                      className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <form onSubmit={handleSaveMovie} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1">
                      Título PT
                    </label>
                    <input
                      required
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded p-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1">
                      Descrição
                    </label>
                    <textarea
                      required
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      className="w-full bg-black border border-neutral-800 rounded p-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors outline-none h-24"
                    />
                  </div>

                  {/* Custom File Uploads */}
                  <div>
                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1 flex items-center justify-between">
                      <span>Poster Vertical</span>
                      {posterUrl && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      ref={posterInputRef}
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <button
                      type="button"
                      onClick={() => posterInputRef.current?.click()}
                      className="w-full bg-black border border-neutral-800 border-dashed rounded p-3 text-sm hover:border-purple-500 transition-colors text-neutral-400 flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" />{" "}
                      {posterUrl
                        ? "Trocar Poster"
                        : "Escolher Poster Computador"}
                    </button>
                    {posterUrl && (
                      <div className="mt-2 text-center">
                        <img
                          src={posterUrl}
                          alt="Preview"
                          className="h-24 mx-auto rounded object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1 flex items-center justify-between">
                      <span>Vídeo Player URL (Opcional se usar Bunny.net)</span>
                      {videoUrl && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={
                          videoUrl.startsWith("uploading_")
                            ? "Processando vídeo..."
                            : videoUrl
                        }
                        onChange={(e) => setVideoUrl(e.target.value)}
                        disabled={videoUrl.startsWith("uploading_")}
                        placeholder="Link direto (embed)"
                        className="w-full bg-black border border-neutral-800 rounded p-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors outline-none disabled:opacity-50"
                      />
                    </div>
                    <div className="mt-2 text-xs text-neutral-500 text-center">
                      OU SELECIONE VÍDEOS PELO NAVEGADOR
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      ref={videoInputRef}
                      className="hidden"
                      onChange={handleBatchVideoSelect}
                    />
                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="w-full mt-2 bg-black border border-neutral-800 rounded p-4 text-sm hover:border-purple-500 transition-colors text-purple-400 flex flex-col items-center justify-center gap-2 border-dashed"
                    >
                      <UploadCloud className="w-6 h-6" />
                      <span className="font-bold">Enviar para Bunny.net</span>
                      <span className="text-xs text-neutral-500 font-normal">
                        Faça upload de 1 ou vários arquivos (Lote)
                      </span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-2">
                      Categorias / Tags
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PREDEFINED_TAGS.map((tag) => {
                        const isSelected = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                              isSelected
                                ? "bg-purple-600 border-purple-500 text-white"
                                : "bg-black border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      disabled={loading}
                      type="submit"
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50"
                    >
                      {loading
                        ? "Salvando..."
                        : editingId
                          ? "Atualizar Filme"
                          : "Salvar Filme no Catálogo"}
                    </button>
                    {editingId && (
                      <button
                        type="button"
                        onClick={clearForm}
                        className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-6 rounded transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* List */}
              <div className="lg:col-span-2">
                <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg">
                  <h2 className="text-lg font-semibold mb-4 border-b border-neutral-800 pb-2">
                    Catálogo Atual ({movies.length})
                  </h2>

                  {movies.length === 0 ? (
                    <p className="text-neutral-500 text-sm py-4">
                      Nenhum filme cadastrado ainda.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {movies.map((movie, idx) => (
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + idx * 0.05 }}
                          key={movie.id}
                          className="flex gap-4 items-center bg-black border border-neutral-800 p-3 rounded hover:border-purple-500/50 transition-colors group"
                        >
                          <img
                            src={
                              movie.poster_url ||
                              "https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=100"
                            }
                            className="w-12 h-16 object-cover rounded bg-neutral-800"
                            alt={movie.titulo_pt}
                          />
                          <div className="flex-1">
                            <h3 className="font-medium text-white group-hover:text-purple-300 transition-colors">
                              {movie.titulo_pt}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {movie.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded group-hover:bg-purple-900/30 transition-colors"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-col items-center">
                            <button
                              onClick={() => startEdit(movie)}
                              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-all"
                              title="Editar Filme"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(movie.id)}
                              className={`p-2 rounded transition-all ${deleteConfirm === movie.id ? "bg-red-500 text-white animate-pulse" : "text-neutral-500 hover:text-red-500 hover:bg-red-500/10"}`}
                              title={
                                deleteConfirm === movie.id
                                  ? "Clique novamente para excluir"
                                  : "Excluir Filme"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* FEATURED TAB */}
          {activeTab === "featured" && (
            <motion.div
              key="featured"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg max-w-4xl">
                <h2 className="text-lg font-semibold mb-2">
                  Gerenciar Destaques
                </h2>
                <p className="text-neutral-400 text-sm mb-6 pb-4 border-b border-neutral-800">
                  Selecione quais filmes aparecerão no banner principal e nas
                  seções de destaque da página inicial.
                </p>

                <div className="space-y-4">
                  {movies.map((movie) => (
                    <div
                      key={movie.id}
                      className="flex gap-4 items-center bg-black border border-neutral-800 p-4 rounded hover:border-purple-500/50 transition-colors"
                    >
                      <img
                        src={
                          movie.poster_url ||
                          "https://images.unsplash.com/photo-1616530940355-351fabd9524b?q=80&w=200"
                        }
                        className="w-12 h-16 object-cover rounded bg-neutral-800"
                        alt={movie.titulo_pt}
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-white">
                          {movie.titulo_pt}
                        </h3>
                        <p className="text-xs text-neutral-500 line-clamp-1">
                          {movie.descricao}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFeatured(movie)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${movie.is_featured ? "bg-purple-600 text-white" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"}`}
                      >
                        <Star
                          className={`w-4 h-4 ${movie.is_featured ? "fill-current" : ""}`}
                        />
                        {movie.is_featured ? "Em Destaque" : "Destacar"}
                      </button>
                    </div>
                  ))}
                  {movies.length === 0 && (
                    <p className="text-neutral-500 text-sm">
                      Adicione filmes primeiro.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* USERS TAB */}
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-lg font-semibold mb-2">
                  Usuários Cadastrados ({usersList.length})
                </h2>
                <p className="text-neutral-400 text-sm mb-6 pb-4 border-b border-neutral-800">
                  Visualização de todas as pessoas que utilizam a plataforma.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-black/50 text-neutral-400">
                      <tr>
                        <th className="p-4 font-medium rounded-tl-lg rounded-bl-lg">
                          E-mail
                        </th>
                        <th className="p-4 font-medium">Telefone</th>
                        <th className="p-4 font-medium">Data de Cadastro</th>
                        <th className="p-4 font-medium rounded-tr-lg rounded-br-lg">
                          ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {usersList.map((usr) => (
                        <tr
                          key={usr.id}
                          className="hover:bg-neutral-800/30 transition-colors"
                        >
                          <td className="p-4 text-white font-medium">
                            {usr.email}
                          </td>
                          <td className="p-4 text-neutral-400">
                            {usr.telefone || "Não informado"}
                          </td>
                          <td className="p-4 text-neutral-400">
                            {usr.criado_em
                              ? new Date(usr.criado_em).toLocaleDateString(
                                  "pt-BR",
                                )
                              : "Desconhecida"}
                          </td>
                          <td className="p-4 text-neutral-500 font-mono text-xs">
                            {usr.id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* UPLOADS TAB */}
          {activeTab === "uploads" && (
            <motion.div
              key="uploads"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
                  <h2 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                    <UploadCloud className="w-5 h-5" /> Gerenciador de Envios
                  </h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={clearCompleted}
                      disabled={
                        uploads.filter(
                          (u) =>
                            u.status === "Concluído" || u.status === "Erro",
                        ).length === 0
                      }
                      className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded transition-colors"
                    >
                      Limpar Histórico Completo
                    </button>
                  </div>
                </div>

                {uploads.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500">
                    <UploadCloud className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    Nenhum envio em andamento ou no histórico desta sessão.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {uploads.map((item) => (
                      <div
                        key={item.id}
                        className="bg-black p-4 rounded border border-neutral-800 flex flex-col sm:flex-row items-center gap-4"
                      >
                        <div className="flex-1 w-full truncate">
                          <div className="text-sm font-medium truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                            {item.status === "Enviando..." && (
                              <span className="flex items-center gap-1 text-purple-400">
                                <Loader2 className="w-3 h-3 animate-spin" />{" "}
                                {item.status} ({item.progress.toFixed(0)}%)
                              </span>
                            )}
                            {item.status === "Concluído" && (
                              <span className="flex items-center gap-1 text-green-500">
                                <CheckCircle2 className="w-3 h-3" />{" "}
                                {item.status}
                              </span>
                            )}
                            {item.status === "Aguardando" && (
                              <span className="text-neutral-500">
                                {item.status} na fila...
                              </span>
                            )}
                            {item.status === "Erro" && (
                              <span className="text-red-500 line-clamp-1">
                                {item.error || "Falha no envio"}
                              </span>
                            )}
                          </div>
                        </div>

                        {(item.status === "Enviando..." ||
                          item.status === "Aguardando") && (
                          <div className="w-full sm:w-1/3 min-w-[200px]">
                            <div className="w-full bg-neutral-800 h-2 rounded overflow-hidden">
                              <div
                                className="bg-purple-500 h-full transition-all duration-300 relative"
                                style={{ width: `${item.progress}%` }}
                              >
                                {item.status === "Enviando..." && (
                                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {item.status !== "Enviando..." &&
                          item.status !== "Aguardando" && (
                            <button
                              onClick={() => removeUpload(item.id)}
                              className="p-2 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded transition-colors self-end sm:self-auto"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg max-w-2xl">
                <h2 className="text-lg font-semibold mb-2 text-purple-400 flex items-center gap-2">
                  <Video className="w-5 h-5" /> Integração Bunny.net (Upload de
                  Vídeos)
                </h2>
                <p className="text-neutral-400 text-sm mb-6 pb-4 border-b border-neutral-800">
                  Configure sua chave de API e ID da Biblioteca do Bunny Stream
                  para permitir upload direto de filmes pelo navegador.
                </p>

                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1">
                      Bunny.net Access Key
                    </label>
                    <input
                      required
                      value={bunnyApi}
                      onChange={(e) => setBunnyApi(e.target.value)}
                      type="password"
                      placeholder="Ex: b65ed4...-c313-44eb-b12"
                      className="w-full bg-black border border-neutral-800 rounded p-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-neutral-500 font-bold mb-1">
                      Stream Library ID
                    </label>
                    <input
                      required
                      value={bunnyLibrary}
                      onChange={(e) => setBunnyLibrary(e.target.value)}
                      placeholder="Ex: 153099"
                      className="w-full bg-black border border-neutral-800 rounded p-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded transition-colors mt-4"
                  >
                    Salvar Configurações
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* PEDIDOS TAB */}
          {activeTab === "pedidos" && (
            <motion.div
              key="pedidos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-2 pb-4 border-b border-neutral-800">
                  <div>
                    <h2 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" /> Pedidos de Usuários
                    </h2>
                    <p className="text-neutral-400 text-sm mt-1">
                      Gerencie os filmes que os usuários solicitaram adicionar à
                      plataforma.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  {pedidos.length === 0 ? (
                    <p className="text-neutral-500 text-sm">
                      Nenhum pedido no momento.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pedidos.map((pedido) => (
                        <div
                          key={pedido.id}
                          className="bg-black/50 border border-neutral-800 p-4 rounded-lg flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between mb-2 gap-2">
                              <h3 className="font-bold text-white line-clamp-2">
                                {pedido.movieName}
                              </h3>
                              {pedido.status === "pendente" && (
                                <span className="bg-yellow-500/20 text-yellow-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                                  Pendente
                                </span>
                              )}
                              {pedido.status === "atendido" && (
                                <span className="bg-green-500/20 text-green-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                                  Atendido
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mb-3">
                              Por:{" "}
                              <span className="text-neutral-400">
                                {pedido.userEmail}
                              </span>
                            </p>
                            {pedido.description && (
                              <p className="text-sm text-neutral-400 mb-4 bg-neutral-900 p-2 rounded line-clamp-3">
                                {pedido.description}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4 pt-4 border-t border-neutral-800/50">
                            {pedido.status === "pendente" && (
                              <button
                                onClick={async () => {
                                  try {
                                    await updateDoc(
                                      doc(db, "pedidos", pedido.id),
                                      { status: "atendido" },
                                    );
                                    fetchPedidos();
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                                className="flex-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 py-1.5 rounded text-xs font-medium transition-colors"
                              >
                                Marcar Atendido
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (confirm("Excluir este pedido?")) {
                                  try {
                                    await deleteDoc(
                                      doc(db, "pedidos", pedido.id),
                                    );
                                    fetchPedidos();
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }
                              }}
                              className="flex-1 bg-red-900/20 text-red-400 hover:bg-red-900/30 py-1.5 rounded text-xs font-medium transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
