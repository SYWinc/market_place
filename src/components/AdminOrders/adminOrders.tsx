// src/components/AdminOrders.tsx
import React, { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Receipt,
  User,
  AlertCircle,
  Calendar,
  DollarSign,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase"; // ✅ Ruta corregida: "../" no "../../"

interface Credit {
  id: string;
  userId: string;
  amount: number;
  description: string;
  paidAmount: number;
  status: "pending" | "paid" | "partially_paid";
  createdAt: Date;
}

interface UserDoc {
  name: string;
  email: string;
}

const AdminOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Credit[]>(([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        // 1. Cargar todos los pedidos ordenados por fecha descendente
        const ordersQuery = query(
          collection(db, "credits"),
          orderBy("createdAt", "desc")
        );
        const ordersSnap = await getDocs(ordersQuery);

        const ordersList: Credit[] = ordersSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId || "",
            amount: parseFloat(data.amount) || 0,
            description: data.description || "Sin descripción",
            paidAmount: parseFloat(data.paidAmount) || 0,
            status: data.status || "pending",
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(0),
          };
        });

        // 2. Cargar nombres de usuarios (manera compatible con ES5+)
        if (ordersList.length > 0) {
          // ✅ Obtener userIds únicos SIN Set (compatible)
          const userIds: string[] = ordersList
            .map((o) => o.userId)
            .filter((value, index, self) => self.indexOf(value) === index);

          const userNames: Record<string, string> = {};

          // ✅ Usar for clásico para máxima compatibilidad
          for (let i = 0; i < userIds.length; i++) {
            const uid = userIds[i];
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            userNames[uid] = userSnap.exists()
              ? userSnap.data().name || "Usuario"
              : "Desconocido";
          }

          // Añadir nombre de usuario a cada pedido
          ordersList.forEach((order) => {
            (order as any).userName = userNames[order.userId];
          });
        }

        setOrders(ordersList);
      } catch (err) {
        console.error("Error al cargar todos los pedidos:", err);
        setError("No se pudieron cargar los pedidos.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllOrders();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "paid":
        return { text: "Pagado", color: "bg-green-200 text-green-800" };
      case "partially_paid":
        return { text: "Parcial", color: "bg-yellow-200 text-yellow-800" };
      default:
        return { text: "Pendiente", color: "bg-red-200 text-red-800" };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 font-black text-gray-700">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
        <div className="bg-white border-4 border-black rounded-2xl p-8 max-w-xs w-full text-center shadow-[6px_6px_0_0_#000]">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-700 mb-2">ERROR</h2>
          <p className="text-gray-700 mb-6">{error}</p>
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

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      {/* Encabezado */}
      <div className="bg-white border-4 border-black rounded-2xl p-4 mb-4 shadow-[6px_6px_0_0_#000]">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-black text-indigo-800 flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              Todos los Pedidos (Admin)
            </h1>
            <p className="text-sm text-gray-600 italic">
              Vista completa de pedidos de todos los clientes
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="py-2 px-4 font-black text-white bg-red-600 border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition"
          >
            <div className="flex items-center gap-1">
              <LogOut className="w-4 h-4" />
              Salir
            </div>
          </button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white border-4 border-black rounded-2xl p-4 flex-1 shadow-[6px_6px_0_0_#000] overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 italic">
            No hay pedidos en el sistema.
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const dateStr = order.createdAt.toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={order.id}
                  className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-sm italic">"{order.description}"</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                        <User className="w-3 h-3" />
                        <span>{(order as any).userName || "Usuario"}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${statusInfo.color}`}
                    >
                      {statusInfo.text}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs mt-2 text-gray-700">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      <span className="font-black">
                        Total: ${order.amount.toFixed(2)}
                      </span>
                    </div>
                    {order.paidAmount > 0 && (
                      <span className="text-green-600 font-bold">
                        Abonado: ${order.paidAmount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;