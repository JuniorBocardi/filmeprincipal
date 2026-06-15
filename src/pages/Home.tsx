import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  User as UserIcon,
  Play,
  Plus,
  Check,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Movie, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";

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

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]);
  const [myListIds, setMyListIds] = useState<string[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const q = collection(db, "movies");
        const querySnapshot = await getDocs(q);
        const moviesList: Movie[] = [];
        const featuredList: Movie[] = [];

        querySnapshot.forEach((docSnap) => {
          const m = { id: docSnap.id, ...docSnap.data() } as Movie;
          moviesList.push(m);
          if (m.is_featured) featuredList.push(m);
        });

        setMovies(moviesList);
        setFeaturedMovies(featuredList);

        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as UserProfile;
            setMyListIds(userData.minha_lista || []);
            setContinueWatching(userData.continuar_assistindo || []);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  const toggleMyList = async (e: React.MouseEvent, movieId: string) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const isCurrentlyInList = myListIds.includes(movieId);

    try {
      if (isCurrentlyInList) {
        await updateDoc(userDocRef, {
          minha_lista: arrayRemove(movieId),
        });
        setMyListIds((prev) => prev.filter((id) => id !== movieId));
      } else {
        await updateDoc(userDocRef, {
          minha_lista: arrayUnion(movieId),
        });
        setMyListIds((prev) => [...prev, movieId]);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar minha lista.");
    }
  };

  const carouselMovies =
    featuredMovies.length > 0 ? featuredMovies.slice(0, 5) : movies.slice(0, 5);
  const topHeroMovie =
    carouselMovies.length > 0
      ? carouselMovies[heroIndex % carouselMovies.length]
      : null;

  useEffect(() => {
    if (carouselMovies.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % carouselMovies.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [carouselMovies.length]);

  const handleWatchMovie = (movieId?: string) => {
    if (!user) {
      navigate("/login");
    } else if (movieId) {
      navigate(`/watch/${movieId}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-neutral-950 text-white font-sans pb-20"
    >
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/80 to-transparent py-4 px-6 flex items-center justify-between backdrop-blur-sm transition-all duration-300">
        <div className="flex items-center gap-8">
          <div
            className="text-2xl font-bold italic tracking-tighter cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate("/")}
          >
            <span className="text-white">Drama</span>
            <span className="text-purple-500">Time</span>
          </div>
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-300">
            <a
              href="#"
              className="text-white hover:text-purple-400 transition-colors"
            >
              Home
            </a>
            <a
              href="#minha-lista"
              className="hover:text-purple-400 transition-colors"
            >
              Minha Lista
            </a>
            <a
              href="#continuar-assistindo"
              className="hover:text-purple-400 transition-colors"
            >
              Continuar Assistindo
            </a>
            <button
              onClick={() => navigate("/pedidos")}
              className="hover:text-purple-400 transition-colors"
            >
              Fazer Pedido
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <button className="text-white hover:text-purple-400 transition-colors hover:scale-110">
            <Search className="w-5 h-5" />
          </button>
          <button className="relative text-white hover:text-purple-400 transition-colors hover:scale-110">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border border-neutral-950"></span>
          </button>
          <button
            className="text-white hover:text-purple-400 transition-colors hover:scale-110"
            onClick={() =>
              user
                ? navigate(
                    user.email === "junior.bocardi2@gmail.com" ? "/admin" : "#",
                  )
                : navigate("/login")
            }
          >
            <UserIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Hero Highlight */}
      <section className="relative w-full h-[85vh] flex items-center px-6 md:px-16 pt-20 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {topHeroMovie && (
            <motion.div
              key={topHeroMovie.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 z-0"
            >
              <img
                src={
                  topHeroMovie?.banner_url ||
                  topHeroMovie?.poster_url ||
                  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2925&auto=format&fit=crop"
                }
                alt={topHeroMovie?.titulo_pt || "Hero Banner"}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/60 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={topHeroMovie?.id || "empty"}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="mb-4 drop-shadow-lg">
                {topHeroMovie ? (
                  <>
                    <span className="text-xl md:text-3xl font-medium block mb-2 text-neutral-300 tracking-wide drop-shadow-md">
                      Drama Time Apresenta:
                    </span>
                    <span className="text-4xl md:text-7xl font-bold text-purple-500 leading-tight">
                      {topHeroMovie.titulo_pt}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xl md:text-3xl font-medium block mb-2 text-neutral-300 tracking-wide drop-shadow-md">
                      Drama Time Apresenta:
                    </span>
                    <span className="text-4xl md:text-7xl font-bold text-purple-500 leading-tight">
                      A sua nova obsessão
                    </span>
                  </>
                )}
              </h1>
              <div className="flex items-center gap-3 mb-8">
                {topHeroMovie?.is_featured && (
                  <span className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider border border-purple-500/30">
                    Minissérie em Destaque
                  </span>
                )}
                {topHeroMovie?.tags?.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-neutral-300 text-sm">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => handleWatchMovie(topHeroMovie?.id)}
                className="bg-purple-600 hover:bg-purple-500 text-white w-full sm:w-auto md:px-10 py-3.5 md:py-3 rounded text-base md:text-lg font-semibold flex items-center justify-center gap-2 transition-all md:hover:scale-105 shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                Assistir Agora
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-10 right-6 md:right-16 z-20 flex gap-2">
          {carouselMovies.map((movie, idx) => (
            <button
              key={movie.id}
              onClick={() => setHeroIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === heroIndex % carouselMovies.length
                  ? "bg-purple-500 w-8"
                  : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Plans Banner */}
      <motion.section
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="px-6 md:px-16 -mt-8 relative z-20 mb-12"
      >
        <div className="bg-purple-800 rounded-xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between shadow-[0_4px_30px_rgba(107,33,168,0.4)] hover:shadow-[0_4px_40px_rgba(107,33,168,0.6)] transition-shadow duration-300">
          <div className="flex items-center gap-4 mb-4 md:mb-0 text-center md:text-left">
            <div className="hidden sm:block bg-white/20 p-2 rounded-full">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base md:text-lg leading-tight md:leading-normal mb-1">
                Nunca mais fique sem saber o final da história.
              </h3>
              <p className="text-white/80 text-sm">Planos a partir de R$9,90</p>
            </div>
          </div>
          <button className="w-full md:w-auto bg-neutral-950 text-white hover:bg-black hover:text-purple-400 px-6 py-2.5 md:py-2 rounded font-semibold transition-all whitespace-nowrap hover:scale-105 active:scale-95">
            Ver Planos
          </button>
        </div>
      </motion.section>

      {/* Filters (Pills) */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="px-6 md:px-16 mb-10 flex flex-col gap-4"
      >
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? "bg-purple-600 text-white hover:bg-purple-500" : "bg-neutral-800 text-neutral-300 hover:bg-purple-900/50 hover:text-purple-300"}`}
          >
            Todas
          </button>
          <button
            onClick={() => setSelectedCategory("Brasileira")}
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCategory === "Brasileira" ? "bg-purple-600 text-white hover:bg-purple-500" : "bg-neutral-800 text-neutral-300 hover:bg-purple-900/50 hover:text-purple-300"}`}
          >
            Brasileiras
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedCategory(tag)}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === tag
                  ? "bg-purple-600 text-white border border-purple-500"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-purple-300 hover:border-purple-900/40"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </motion.section>

      {/* Main Content Area */}
      <main className="px-6 md:px-16 space-y-12">
        {!selectedCategory ? (
          <>
            {user && continueWatching.length > 0 && (
              <section id="continuar-assistindo">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <span className="w-1 h-6 bg-purple-600 rounded"></span>{" "}
                  Continuar Assistindo
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide">
                  {continueWatching.map((item, idx) => {
                    const movie = movies.find((m) => m.id === item.movieId);
                    if (!movie) return null;
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1, duration: 0.4 }}
                        key={`cw-${item.movieId}`}
                        className="cursor-pointer group flex-shrink-0 relative w-48 sm:w-56 snap-start"
                        onClick={() => handleWatchMovie(movie.id)}
                      >
                        <div className="rounded-lg overflow-hidden relative">
                          <img
                            src={
                              movie.poster_url ||
                              `https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&h=600&fit=crop&auto=format&q=80&sig=${idx + 10}`
                            }
                            className="w-full aspect-video object-cover group-hover:scale-110 transition-transform duration-500"
                            alt={movie.titulo_pt}
                          />
                          <div className="absolute inset-0 bg-purple-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <Play
                              className="w-10 h-10 text-white drop-shadow-md"
                              fill="white"
                            />
                          </div>
                          {/* Progress bar */}
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800">
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-neutral-300 line-clamp-1 group-hover:text-purple-300 transition-colors">
                          {movie.titulo_pt}
                        </h3>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}

            {user && myListIds.length > 0 && (
              <section id="minha-lista">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-1 h-6 bg-purple-600 rounded"></span>{" "}
                    Minha Lista
                  </h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide">
                  {movies
                    .filter((m) => myListIds.includes(m.id))
                    .map((movie, idx) => (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1, duration: 0.4 }}
                        key={`ml-${movie.id}`}
                        className="cursor-pointer group flex-shrink-0 relative w-36 sm:w-44 snap-start"
                        onClick={() => handleWatchMovie(movie.id)}
                      >
                        <div className="rounded-lg overflow-hidden relative">
                          <img
                            src={
                              movie.poster_url ||
                              `https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&h=600&fit=crop&auto=format&q=80&sig=${idx + 10}`
                            }
                            className="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform duration-500"
                            alt={movie.titulo_pt}
                          />
                          <div className="absolute inset-0 bg-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <button
                            onClick={(e) => toggleMyList(e, movie.id)}
                            className="absolute top-2 right-2 bg-neutral-900/80 hover:bg-neutral-800 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-20"
                          >
                            <Check className="w-4 h-4 text-purple-400" />
                          </button>
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-neutral-300 line-clamp-2 group-hover:text-purple-300 transition-colors">
                          {movie.titulo_pt}
                        </h3>
                      </motion.div>
                    ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-purple-600 rounded"></span> Top 10
                da Semana
              </h2>
              <div
                className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {movies.slice(0, 10).map((movie, idx) => {
                  const inList = myListIds.includes(movie.id);
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      key={movie.id}
                      className="cursor-pointer group flex-shrink-0 relative w-36 sm:w-44 snap-start"
                      onClick={() => handleWatchMovie(movie.id)}
                    >
                      <div
                        className="absolute -left-4 bottom-0 text-7xl font-black text-transparent opacity-90 group-hover:-translate-y-2 transition-transform select-none z-10 drop-shadow-xl duration-300"
                        style={{ WebkitTextStroke: "2px #a855f7" }}
                      >
                        {idx + 1}
                      </div>
                      <div className="rounded-lg overflow-hidden ml-6 relative z-0">
                        <img
                          src={
                            movie.poster_url ||
                            `https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=600&fit=crop&auto=format&q=80&sig=${idx}`
                          }
                          className="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform duration-500"
                          alt={movie.titulo_pt}
                        />
                        <div className="absolute top-2 right-2 bg-purple-700/90 backdrop-blur text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Top 10
                        </div>
                        <div className="absolute inset-0 bg-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <button
                          onClick={(e) => toggleMyList(e, movie.id)}
                          className="absolute top-8 right-2 lg:top-2 lg:right-2 bg-neutral-900/80 hover:bg-neutral-800 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-20"
                        >
                          {inList ? (
                            <Check className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Plus className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-neutral-300 ml-6 line-clamp-2 group-hover:text-purple-300 transition-colors">
                        {idx + 1} - {movie.titulo_pt}
                      </h3>
                    </motion.div>
                  );
                })}
                {movies.length === 0 && (
                  <p className="text-neutral-500 py-10">
                    Nenhum filme disponível no momento.
                  </p>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-1 h-6 bg-purple-600 rounded"></span>{" "}
                  Lançamentos da Semana
                </h2>
                <a
                  href="#"
                  className="text-sm text-neutral-400 hover:text-purple-400 transition-colors"
                >
                  Ver Todos &gt;
                </a>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide">
                {movies.map((movie, idx) => {
                  const inList = myListIds.includes(movie.id);
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1, duration: 0.4 }}
                      key={movie.id}
                      className="cursor-pointer group flex-shrink-0 relative w-36 sm:w-44 snap-start"
                      onClick={() => handleWatchMovie(movie.id)}
                    >
                      <div className="rounded-lg overflow-hidden relative">
                        <img
                          src={
                            movie.poster_url ||
                            `https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&h=600&fit=crop&auto=format&q=80&sig=${idx + 10}`
                          }
                          className="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform duration-500"
                          alt={movie.titulo_pt}
                        />
                        <div className="absolute top-2 left-2 bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shadow">
                          Destaque
                        </div>
                        <div className="absolute inset-0 bg-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <button
                          onClick={(e) => toggleMyList(e, movie.id)}
                          className="absolute top-2 right-2 bg-neutral-900/80 hover:bg-neutral-800 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-20"
                        >
                          {inList ? (
                            <Check className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Plus className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-neutral-300 line-clamp-2 group-hover:text-purple-300 transition-colors">
                        {movie.titulo_pt}
                      </h3>
                    </motion.div>
                  );
                })}
                {movies.length === 0 && (
                  <p className="text-neutral-500">
                    Nenhum lançamento no momento.
                  </p>
                )}
              </div>
            </section>

            {/* Dynamic Category Swimlanes */}
            {["Brasileira", ...PREDEFINED_TAGS].map((category) => {
              const categoryMovies = movies.filter((m) =>
                m.tags?.some((t) => t.toLowerCase() === category.toLowerCase()),
              );
              if (categoryMovies.length === 0) return null;

              return (
                <section key={`swimlane-${category}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <span className="w-1 h-6 bg-purple-600 rounded"></span>{" "}
                      {category}
                    </h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide">
                    {categoryMovies.map((movie, idx) => {
                      const inList = myListIds.includes(movie.id);
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.1, duration: 0.4 }}
                          key={movie.id}
                          className="cursor-pointer group flex-shrink-0 relative w-36 sm:w-44 snap-start"
                          onClick={() => handleWatchMovie(movie.id)}
                        >
                          <div className="rounded-lg overflow-hidden relative">
                            <img
                              src={
                                movie.poster_url ||
                                `https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&h=600&fit=crop&auto=format&q=80&sig=${idx + 20}`
                              }
                              className="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform duration-500"
                              alt={movie.titulo_pt}
                            />
                            <div className="absolute inset-0 bg-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <button
                              onClick={(e) => toggleMyList(e, movie.id)}
                              className="absolute top-2 right-2 bg-neutral-900/80 hover:bg-neutral-800 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-20"
                            >
                              {inList ? (
                                <Check className="w-4 h-4 text-purple-400" />
                              ) : (
                                <Plus className="w-4 h-4 text-white" />
                              )}
                            </button>
                          </div>
                          <h3 className="mt-2 text-sm font-medium text-neutral-300 line-clamp-2 group-hover:text-purple-300 transition-colors">
                            {movie.titulo_pt}
                          </h3>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <span className="w-1.5 h-8 bg-purple-600 rounded"></span>{" "}
                {selectedCategory}
              </h2>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm text-neutral-400 hover:text-purple-400 transition-colors"
              >
                Voltar
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {movies
                .filter((m) =>
                  m.tags?.some(
                    (t) => t.toLowerCase() === selectedCategory.toLowerCase(),
                  ),
                )
                .map((movie, idx) => {
                  const inList = myListIds.includes(movie.id);
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                      key={movie.id}
                      className="cursor-pointer group relative"
                      onClick={() => handleWatchMovie(movie.id)}
                    >
                      <div className="rounded-lg overflow-hidden relative">
                        <img
                          src={
                            movie.poster_url ||
                            `https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=400&h=600&fit=crop&auto=format&q=80&sig=${idx + 30}`
                          }
                          className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-500"
                          alt={movie.titulo_pt}
                        />
                        <div className="absolute inset-0 bg-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <button
                          onClick={(e) => toggleMyList(e, movie.id)}
                          className="absolute top-2 right-2 bg-neutral-900/80 hover:bg-neutral-800 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-20"
                        >
                          {inList ? (
                            <Check className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Plus className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-neutral-300 line-clamp-2 group-hover:text-purple-300 transition-colors">
                        {movie.titulo_pt}
                      </h3>
                    </motion.div>
                  );
                })}

              {movies.filter((m) =>
                m.tags?.some(
                  (t) => t.toLowerCase() === selectedCategory.toLowerCase(),
                ),
              ).length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <p className="text-neutral-500 text-lg">
                    Nenhum filme encontrado nesta categoria.
                  </p>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="mt-4 text-purple-400 hover:text-purple-300"
                  >
                    Ver todos os filmes
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </motion.div>
  );
}
