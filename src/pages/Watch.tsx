import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Movie, UserProfile } from "../types";
import { ArrowLeft, Loader2, Check, Plus } from "lucide-react";

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [inList, setInList] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "movies", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMovie({ id: docSnap.id, ...docSnap.data() } as Movie);
          updateProgress(5);
        } else {
          alert("Filme não encontrado");
          navigate("/");
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as UserProfile;
          if (userData.minha_lista?.includes(id)) {
            setInList(true);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, user, navigate]);

  const updateProgress = async (progressPercentage: number) => {
    if (!user || !id) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        let cw = userData.continuar_assistindo || [];
        cw = cw.filter((item) => item.movieId !== id);
        cw.push({
          movieId: id,
          progress: progressPercentage,
          updatedAt: new Date().toISOString(),
        });
        await updateDoc(userRef, { continuar_assistindo: cw });
      }
    } catch (err) {
      console.error("Error saving progress", err);
    }
  };

  const toggleMyList = async () => {
    if (!user || !id) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      if (inList) {
        await updateDoc(userDocRef, { minha_lista: arrayRemove(id) });
        setInList(false);
      } else {
        await updateDoc(userDocRef, { minha_lista: arrayUnion(id) });
        setInList(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!movie) return null;

  let videoUrl = movie.url_video;

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-400 hover:text-purple-400 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        <div className="bg-black rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(107,33,168,0.2)] border border-neutral-900 group relative">
          <div className="relative w-full aspect-video flex justify-center items-center bg-neutral-900">
            {videoUrl.includes("iframe") ||
            videoUrl.includes("embed") ||
            videoUrl.includes("b-cdn.net") ||
            videoUrl.includes("bunny.net") ? (
              <iframe
                src={
                  videoUrl +
                  (videoUrl.includes("?") ? "&autoplay=true" : "?autoplay=true")
                }
                className="w-full h-full border-none"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen={true}
              />
            ) : (
              <video
                ref={videoRef}
                controls
                autoPlay
                className="w-full h-full object-contain"
                src={videoUrl}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    const perc =
                      (videoRef.current.currentTime /
                        videoRef.current.duration) *
                      100;
                  }
                }}
              />
            )}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-md text-white">
                {movie.titulo_pt}
              </h1>
              {movie.titulo_original && (
                <h2 className="text-xl text-neutral-400 mb-6 font-medium">
                  {movie.titulo_original}
                </h2>
              )}

              <div className="flex flex-wrap gap-2 mb-8">
                {movie.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="bg-purple-900/40 border border-purple-500/30 text-purple-300 px-3 py-1 rounded-full text-sm font-semibold tracking-wide shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
                <span className="bg-neutral-800 border border-neutral-700 text-neutral-300 px-3 py-1 rounded-full text-sm font-semibold tracking-wide">
                  {movie.ano_lancamento || "Lançamento"}
                </span>
              </div>
            </div>

            <button
              onClick={toggleMyList}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg border transition-all font-semibold whitespace-nowrap shadow-md ${
                inList
                  ? "bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 border-purple-500/40"
                  : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700"
              }`}
            >
              {inList ? (
                <Check className="w-5 h-5" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              {inList ? "Na Minha Lista" : "Adicionar à Lista"}
            </button>
          </div>

          <div className="prose prose-invert max-w-3xl">
            <h3 className="text-xl font-bold text-neutral-200 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-purple-600 rounded"></span> Sinopse
            </h3>
            <p className="text-neutral-400 leading-relaxed text-lg whitespace-pre-wrap">
              {movie.descricao ||
                "Nenhuma sinopse disponível para este título."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
