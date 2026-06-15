import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";
import { motion } from "motion/react";
import { Film, ArrowLeft, Send } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Pedidos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movieName, setMovieName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movieName.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "pedidos"), {
        movieName: movieName.trim(),
        description: description.trim(),
        userEmail: user?.email || "Anônimo",
        createdAt: new Date(),
        status: "pendente",
      });
      setSuccess(true);
      setMovieName("");
      setDescription("");
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error("Erro ao enviar pedido", err);
      alert("Ocorreu um erro ao enviar seu pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans">
      <header className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/80 to-transparent py-4 px-6 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-8">
          <div
            className="text-2xl font-bold italic tracking-tighter cursor-pointer flex items-center"
            onClick={() => navigate("/")}
          >
            <span className="text-white">Drama</span>
            <span className="text-purple-500">Time</span>
          </div>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-neutral-400 hover:text-purple-400 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-32 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl"
        >
          <div className="flex items-center justify-center mb-8">
            <div className="bg-purple-900/30 p-4 rounded-full">
              <Film className="w-10 h-10 text-purple-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">
            Faça seu Pedido
          </h1>
          <p className="text-neutral-400 text-center mb-8">
            Não encontrou o drama que queria? Nós adicionamos para você!
          </p>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-900/30 border border-green-500/50 text-green-400 p-4 rounded-lg text-center font-medium"
            >
              Pedido enviado com sucesso! Tentaremos adicionar em breve.
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Nome do Drama / Filme
                </label>
                <input
                  type="text"
                  required
                  value={movieName}
                  onChange={(e) => setMovieName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  placeholder="Ex: Pousando no Amor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Informações Adicionais (Opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors h-32 resize-none"
                  placeholder="Elenco principal, país de origem, etc..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Pedido
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </main>
    </div>
  );
}
