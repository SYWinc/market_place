// src/components/Profile.tsx
import React, { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Mail,
  Receipt,
  CreditCard,
  Wallet,
  AlertCircle,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase";

interface Credit {
  id: string;
  amount: number;
  description: string;
  paidAmount: number;
  status: "pending" | "paid" | "partially_paid";
}

interface UserDoc {
  name: string;
  email: string;
  creditLimit: number;
  currentDebt: number;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userEmail = auth.currentUser?.email;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userEmail) {
        setError("Usuario no autenticado.");
        setLoading(false);
        return;
      }

      try {
        // 1. Buscar al usuario en Firestore por email
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", userEmail)
        );
        const usersSnapshot = await getDocs(usersQuery);

        if (usersSnapshot.empty) {
          setError("No se encontró tu perfil en el sistema.");
          setLoading(false);
          return;
        }

        if (usersSnapshot.size > 1) {
          setError("Error: múltiples perfiles con tu correo. Contacta al administrador.");
          setLoading(false);
          return;
        }

        const userDocSnap = usersSnapshot.docs[0];
        const userData = userDocSnap.data();

        const user: UserDoc = {
          name: userData.name || "Usuario",
          email: userData.email || userEmail,
          creditLimit: parseFloat(userData.creditLimit) || 0,
          currentDebt: parseFloat(userData.currentDebt) || 0,
        };

        setUserDoc(user);

        // 2. Cargar créditos/pedidos del usuario
        const userId = userDocSnap.id;
        const creditsQuery = query(
          collection(db, "credits"),
          where("userId", "==", userId)
        );
        const creditsSnapshot = await getDocs(creditsQuery);
        const creditsList: Credit[] = creditsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            amount: parseFloat(data.amount) || 0,
            description: data.description || "Sin descripción",
            paidAmount: parseFloat(data.paidAmount) || 0,
            status: data.status || "pending",
          };
        });

        setCredits(creditsList);
      } catch (err) {
        console.error("Error al cargar datos del perfil:", err);
        setError("Error al cargar tu información.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userEmail]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 font-black text-gray-700">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  if (error || !userDoc) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
        <div className="bg-white border-4 border-black rounded-2xl p-8 max-w-xs w-full text-center shadow-[6px_6px_0_0_#000]">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-700 mb-2">ERROR</h2>
          <p className="text-gray-700 mb-6">{error || "Perfil no disponible."}</p>
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 font-black text-white bg-red-600 border-4 border-black rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-y-1 transition-all duration-150"
          >
            <div className="flex items-center justify-center gap-2">
              <LogOut className="w-5 h-5" />
              CERRAR SESIÓN
            </div>
          </button>
        </div>
      </div>
    );
  }

  const totalPedidos = credits.reduce((sum, c) => sum + c.amount, 0);
  const totalAbonado = credits.reduce((sum, c) => sum + c.paidAmount, 0);
  const creditoDisponible = Math.max(0, userDoc.creditLimit - userDoc.currentDebt);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="bg-white border-4 border-black rounded-2xl p-6 max-w-md w-full shadow-[6px_6px_0_0_#000]">
        {/* Encabezado */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-indigo-800 uppercase tracking-tight">
            {userDoc.name}
          </h2>
          <div className="flex items-center justify-center gap-2 text-gray-600 mt-2">
            <Mail className="w-4 h-4" />
            <span className="font-mono text-sm break-all">{userDoc.email}</span>
          </div>

          {/* 🔘 Botón: Realizar Pedido */}
          <button
            onClick={() => navigate("/orders")}
            className="mt-4 py-2 px-5 font-black bg-indigo-600 text-white border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition"
          >
            Realizar Pedidos
          </button>
        </div>

        {/* Resumen de Crédito */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-xl border-2 border-dashed border-blue-300">
            <p className="text-[10px] font-black text-blue-600 uppercase">Límite</p>
            <p className="text-lg font-black text-blue-800">${userDoc.creditLimit.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border-2 border-dashed border-red-300">
            <p className="text-[10px] font-black text-red-600 uppercase">Deuda</p>
            <p className="text-lg font-black text-red-700">${userDoc.currentDebt.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl border-2 border-dashed border-green-300">
            <p className="text-[10px] font-black text-green-600 uppercase">Disponible</p>
            <p className="text-lg font-black text-green-700">${creditoDisponible.toFixed(2)}</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-xl border-2 border-dashed border-amber-300">
            <p className="text-[10px] font-black text-amber-600 uppercase">Pedidos</p>
            <p className="text-lg font-black text-amber-700">${totalPedidos.toFixed(2)}</p>
          </div>
        </div>

        {/* Lista de Pedidos */}
        <h3 className="font-black text-gray-800 mb-3 flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Tus Pedidos
        </h3>

        {credits.length === 0 ? (
          <p className="text-gray-500 text-sm italic text-center">No has realizado pedidos aún.</p>
        ) : (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {credits.map((credit) => (
              <div
                key={credit.id}
                className="border-2 border-gray-200 rounded-xl p-3 bg-gray-50"
              >
                <p className="font-bold text-sm italic">"{credit.description}"</p>
                <div className="flex justify-between text-xs mt-2">
                  <span className="font-black">Total: ${credit.amount.toFixed(2)}</span>
                  {credit.paidAmount > 0 && (
                    <span className="text-green-600 font-bold">
                      Abonado: ${credit.paidAmount.toFixed(2)}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                      credit.status === "paid"
                        ? "bg-green-200 text-green-800"
                        : credit.status === "partially_paid"
                        ? "bg-yellow-200 text-yellow-800"
                        : "bg-red-200 text-red-800"
                    }`}
                  >
                    {credit.status === "paid"
                      ? "Pagado"
                      : credit.status === "partially_paid"
                      ? "Parcial"
                      : "Pendiente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botón de Cerrar Sesión */}
        <button
          onClick={handleLogout}
          className="w-full mt-6 py-3 px-4 font-black text-white bg-red-600 border-4 border-black rounded-xl shadow-[4px_4px_0_0_#000] hover:shadow-none hover:translate-y-1 transition-all duration-150"
        >
          <div className="flex items-center justify-center gap-2">
            <LogOut className="w-5 h-5" />
            CERRAR SESIÓN
          </div>
        </button>
      </div>
    </div>
  );
};

export default Profile;