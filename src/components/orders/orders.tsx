// src/components/Orders.tsx
import React, { useEffect, useState } from "react";
import { auth } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Receipt,
  AlertCircle,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";

interface Credit {
  id: string;
  userId: string;
  description: string;
  status: "pending" | "paid";
  createdAt: Date;
}

interface UserDoc {
  name: string;
  email: string;
}

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserDoc | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // ← Almacenar userId aquí
  const [orders, setOrders] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state (solo description y status)
  const [formState, setFormState] = useState({
    description: "",
    status: "pending" as "pending" | "paid",
  });

  const userEmail = auth.currentUser?.email;

  // Fetch user and orders
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userEmail) {
        setError("Usuario no autenticado.");
        setLoading(false);
        return;
      }

      try {
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", userEmail)
        );
        const usersSnap = await getDocs(usersQuery);

        if (usersSnap.empty) {
          setError("Usuario no encontrado.");
          setLoading(false);
          return;
        }

        const userDoc = usersSnap.docs[0].data() as UserDoc;
        const uid = usersSnap.docs[0].id; // ← Guardar el ID del usuario
        setCurrentUser({ ...userDoc, name: userDoc.name || "Usuario" });
        setUserId(uid); // ← Guardar para usar al crear pedidos

        // Load only user's orders
        const ordersQuery = query(
          collection(db, "credits"),
          where("userId", "==", uid),
          orderBy("createdAt", "desc")
        );
        const ordersSnap = await getDocs(ordersQuery);
        const ordersList: Credit[] = ordersSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId || "",
            description: data.description || "Sin descripción",
            status: data.status === "paid" ? "paid" : "pending", // solo dos estados
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(0),
          };
        });

        setOrders(ordersList);
      } catch (err) {
        console.error("Error al cargar pedidos:", err);
        setError("No se pudieron cargar los pedidos.");
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

  // Reset form
  const resetForm = () => {
    setFormState({
      description: "",
      status: "pending",
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { description, status } = formState;

    if (!description.trim()) {
      alert("Por favor ingresa una descripción.");
      return;
    }

    if (!userId) {
      alert("Error: no se encontró tu ID de usuario. Intenta salir y volver a entrar.");
      return;
    }

    try {
      if (editingId) {
        // Update existing
        await updateDoc(doc(db, "credits", editingId), {
          description,
          status,
        });
        setOrders((prev) =>
          prev.map((order) =>
            order.id === editingId ? { ...order, description, status } : order
          )
        );
      } else {
        // Create new
        const newDoc = await addDoc(collection(db, "credits"), {
          userId,
          description,
          status,
          createdAt: Timestamp.now(),
        });

        const newOrder: Credit = {
          id: newDoc.id,
          userId,
          description,
          status,
          createdAt: new Date(),
        };

        setOrders((prev) => [newOrder, ...prev]); // prepend
      }

      resetForm();
    } catch (err) {
      console.error("Error al guardar pedido:", err);
      alert("No se pudo guardar el pedido. Inténtalo de nuevo.");
    }
  };

  // Delete order
  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este pedido? Esta acción no se puede deshacer.")) return;

    try {
      await deleteDoc(doc(db, "credits", id));
      setOrders((prev) => prev.filter((order) => order.id !== id));
    } catch (err) {
      console.error("Error al eliminar pedido:", err);
      alert("No se pudo eliminar el pedido.");
    }
  };

  // Start editing
  const handleEdit = (order: Credit) => {
    setFormState({
      description: order.description,
      status: order.status,
    });
    setEditingId(order.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-4 font-black text-gray-700">Cargando tus pedidos...</p>
        </div>
      </div>
    );
  }

  if (error || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
        <div className="bg-white border-4 border-black rounded-2xl p-8 max-w-xs w-full text-center shadow-[6px_6px_0_0_#000]">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-700 mb-2">ERROR</h2>
          <p className="text-gray-700 mb-6">{error || "Acceso denegado."}</p>
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "paid":
        return { text: "Pagado", color: "bg-green-200 text-green-800" };
      default:
        return { text: "Pendiente", color: "bg-red-200 text-red-800" };
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      {/* Encabezado */}
      <div className="bg-white border-4 border-black rounded-2xl p-4 mb-4 shadow-[6px_6px_0_0_#000]">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-black text-indigo-800 flex items-center gap-2">
              <Receipt className="w-6 h-6" />
              Mis Pedidos
            </h1>
            <p className="text-sm text-gray-600 italic">
              Gestiona tu lista de pedidos personales
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className="py-2 px-4 font-black text-white bg-emerald-600 border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Nuevo
            </button>
            <button
              onClick={handleLogout}
              className="py-2 px-4 font-black text-white bg-red-600 border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white border-4 border-black rounded-2xl p-5 mb-4 shadow-[6px_6px_0_0_#000]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-indigo-800">
              {editingId ? "Editar Pedido" : "Nuevo Pedido"}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
              title="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-1">
                Descripción del Pedido
              </label>
              <input
                type="text"
                name="description"
                value={formState.description}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border-2 border-black rounded-lg font-bold"
                placeholder="Ej: Compra de arroz y pollo"
              />
            </div>

            <div>
              <label className="block text-sm font-black text-gray-700 mb-1">
                Estado
              </label>
              <select
                name="status"
                value={formState.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border-2 border-black rounded-lg font-bold"
              >
                <option value="pending">Pendiente</option>
                <option value="paid">Pagado</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 px-4 font-black text-white bg-indigo-600 border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition"
              >
                {editingId ? "Actualizar" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2 px-4 font-black text-gray-700 bg-gray-200 border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Pedidos */}
      <div className="bg-white border-4 border-black rounded-2xl p-4 flex-1 shadow-[6px_6px_0_0_#000] overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 italic">
            No has realizado pedidos aún. ¡Haz clic en "Nuevo Pedido"!
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const dateStr = order.createdAt.toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={order.id}
                  className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-sm italic">"{order.description}"</p>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${statusInfo.color}`}
                    >
                      {statusInfo.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>

                  {/* Acciones CRUD */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleEdit(order)}
                      className="flex-1 py-1.5 px-2 font-black text-blue-700 bg-blue-100 border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition text-[11px]"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Edit2 className="w-3 h-3" />
                        Editar
                      </div>
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="flex-1 py-1.5 px-2 font-black text-red-700 bg-red-100 border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition text-[11px]"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <Trash2 className="w-3 h-3" />
                        Eliminar
                      </div>
                    </button>
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

export default Orders;