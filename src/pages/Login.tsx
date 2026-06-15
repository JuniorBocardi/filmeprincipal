import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { motion } from "motion/react";

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await setDoc(doc(db, "users", userCredential.user.uid), {
          email,
          telefone: phone,
          criado_em: new Date().toISOString(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      navigate("/");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        setError(
          "E-mail ou senha incorretos. Se for o administrador, verifique suas credenciais.",
        );
      } else if (err.code === "auth/user-not-found" && !isRegister) {
        setError(
          'Usuário não encontrado. Crie uma conta primeiro ("Novo por aqui").',
        );
      } else {
        setError(
          err.message || "Erro ao autenticar. Verifique suas credenciais.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-neutral-950 text-white flex items-center justify-center font-sans p-6 relative"
    >
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=2000&auto=format&fit=crop"
          alt="Background"
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/80 to-transparent" />
      </div>

      <motion.div
        initial={{ y: 20, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 w-full max-w-md bg-black/60 backdrop-blur-xl p-8 rounded-2xl border border-neutral-800 shadow-[0_0_50px_rgba(168,85,247,0.15)]"
      >
        <div className="text-center mb-8">
          <div
            className="text-3xl font-bold italic tracking-tighter mb-2 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate("/")}
          >
            <span className="text-white">Drama</span>
            <span className="text-purple-500">Time</span>
          </div>
          <p className="text-neutral-400 text-sm">
            {isRegister
              ? "Crie sua conta para começar a assistir"
              : "Entre para continuar assistindo"}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-900/50 border border-purple-500 text-purple-200 px-4 py-3 rounded mb-6 text-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              placeholder="seu@email.com"
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

          {isRegister && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
            >
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Celular
              </label>
              <input
                type="tel"
                required={isRegister}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                placeholder="(11) 99999-9999"
              />
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded mt-4 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:opacity-50 hover:scale-[1.02]"
          >
            {loading ? "Aguarde..." : isRegister ? "Criar Conta" : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(""); // Limpa o erro ao trocar a aba
            }}
            className="text-sm text-neutral-400 hover:text-purple-400 transition-colors"
          >
            {isRegister
              ? "Já tem uma conta? Entre aqui."
              : "Novo por aqui? Assine agora."}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
