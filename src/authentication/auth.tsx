// src/components/auth/Auth.tsx
import React, { useState } from "react";
import { auth } from "../services/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Auth: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/view-products");
    } catch (err: any) {
      setError("Credenciales incorrectas. Inténtalo de nuevo.");
      console.error(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 font-sans">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-xs bg-white border-4 border-black rounded-2xl p-7 shadow-[6px_6px_0_0_#000] relative"
      >
        {/* Decoración retro: esquina superior izquierda */}
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-indigo-700 rounded-sm"></div>

        <h2 className="text-2xl font-black text-center text-indigo-800 mb-6 tracking-tight">
          INICIAR SESIÓN
        </h2>

        {error && (
          <div className="mb-4 p-2 bg-red-100 border-2 border-red-700 rounded-lg text-red-800 font-bold text-center text-sm shadow-[2px_2px_0_0_#dc2626]">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="block font-black text-gray-700 text-xs mb-1 uppercase tracking-wide">
            Correo
          </label>
          <input
            id="email"
            type="email"
            placeholder="ejemplo@dominio.com"
            className="w-full px-4 py-3 font-bold border-2 border-gray-800 rounded-lg shadow-[3px_3px_0_0_#000] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-800 bg-gray-50"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block font-black text-gray-700 text-xs mb-1 uppercase tracking-wide">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-3 font-bold border-2 border-gray-800 rounded-lg shadow-[3px_3px_0_0_#000] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-800 bg-gray-50"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 font-black text-white bg-indigo-700 border-4 border-black rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-y-1 transition-all duration-150 active:translate-y-0.5"
        >
          ENTRAR
        </button>

        {/* Decoración retro: esquina inferior derecha */}
        <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-emerald-800 rounded-sm"></div>
      </form>
    </div>
  );
};

export default Auth;