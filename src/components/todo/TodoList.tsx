// src/components/todo/TodoList.tsx
import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { ChevronLeft, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

const CATEGORIES = [
  "Carnes",
  "Legumbres",
  "Frutas & Verduras",
  "Pan",
  "Gaseosas",
  "Yogur",
  "Mecatos",
  "Medicamentos",
  "Aseo del hogar",
  "Aseo Personal",
  "Bastimento",
  "Enlatados",
  "Carnes frías",
  "Dulces",
  "Canasta",
];

// ✅ Función para formatear la fecha (ej: "21 dic")
const formatDate = (timestamp: any): string => {
  if (!timestamp?.toDate) return "";
  const date = timestamp.toDate();
  const day = date.getDate();
  const month = date.toLocaleDateString("es-ES", { month: "short" });
  return `${day} ${month}`;
};

const TodoList: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");
  const [allPendingItems, setAllPendingItems] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // Cargar todos los ítems pendientes de todas las categorías
  useEffect(() => {
    const fetchAllPending = async () => {
      try {
        const pendingItems: any[] = [];
        for (const category of CATEGORIES) {
          const q = query(collection(db, "todo_lists", category, "items"));
          const snapshot = await getDocs(q);
          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (!data.completed) {
              pendingItems.push({ id: doc.id, ...data, category });
            }
          });
        }
        setAllPendingItems(pendingItems);
      } catch (error) {
        console.error("Error al cargar productos pendientes:", error);
      } finally {
        setLoadingPending(false);
      }
    };

    fetchAllPending();
  }, []);

  // Escuchar cambios en tiempo real de la categoría seleccionada
  useEffect(() => {
    if (!selectedCategory || selectedCategory === "Productos pendientes") return;

    const q = query(
      collection(db, "todo_lists", selectedCategory, "items"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setItems(docs);
    });

    return () => unsubscribe();
  }, [selectedCategory]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim() || !selectedCategory || selectedCategory === "Productos pendientes") return;

    await addDoc(collection(db, "todo_lists", selectedCategory, "items"), {
      text: newItem,
      completed: false,
      createdAt: Timestamp.now(),
    });
    setNewItem("");
  };

  const toggleComplete = async (itemId: string, currentStatus: boolean) => {
    if (!selectedCategory || selectedCategory === "Productos pendientes") return;
    const itemRef = doc(db, "todo_lists", selectedCategory, "items", itemId);
    await updateDoc(itemRef, { completed: !currentStatus });
  };

  // ✅ Completar ítem desde "Productos pendientes"
  const completePendingItem = async (item: any) => {
    const { id, category } = item;
    const itemRef = doc(db, "todo_lists", category, "items", id);
    await updateDoc(itemRef, { completed: true });
    // Quitar de la lista de pendientes
    setAllPendingItems((prev) => prev.filter((i) => i.id !== id));
  };

  const deleteItem = async (itemId: string) => {
    if (!selectedCategory || selectedCategory === "Productos pendientes") return;
    await deleteDoc(doc(db, "todo_lists", selectedCategory, "items", itemId));
  };

  const deletePendingItem = async (item: any) => {
    const { id, category } = item;
    const itemRef = doc(db, "todo_lists", category, "items", id);
    await deleteDoc(itemRef);
    setAllPendingItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-md mx-auto">
        {!selectedCategory ? (
          <>
            <h1 className="text-2xl font-black text-indigo-700 mb-6 mt-4">
              MIS LISTAS
            </h1>
            <div className="grid grid-cols-2 gap-4">
              {/* Tarjeta especial: Productos Pendientes */}
              <button
                onClick={() => setSelectedCategory("Productos pendientes")}
                className="p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl shadow-[4px_4px_0_0_rgba(200,50,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all text-left font-bold"
              >
                📋 Productos Pendientes
                {!loadingPending && allPendingItems.length > 0 && (
                  <span className="ml-2 bg-white text-red-600 text-xs font-black px-2 py-0.5 rounded-full">
                    {allPendingItems.length}
                  </span>
                )}
              </button>

              {/* Categorías normales */}
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="p-4 bg-white border-2 border-indigo-600 rounded-xl shadow-[4px_4px_0_0_rgba(79,70,229,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all text-left font-bold text-gray-700 hover:bg-indigo-50"
                >
                  {cat}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            {/* Cabecera de Lista */}
            <div className="flex items-center mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 rounded-2xl text-white shadow-lg">
              <button
                onClick={() => setSelectedCategory(null)}
                className="mr-2 hover:scale-110 transition"
              >
                <ChevronLeft size={28} />
              </button>
              <h2 className="text-xl font-bold uppercase tracking-wider">
                {selectedCategory === "Productos pendientes"
                  ? "Productos Pendientes"
                  : selectedCategory}
              </h2>
            </div>

            {/* Formulario (solo visible en categorías reales) */}
            {selectedCategory !== "Productos pendientes" && (
              <form onSubmit={addItem} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Añadir algo nuevo..."
                  className="flex-1 p-3 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white p-3 rounded-xl shadow-[0_4px_0_0_rgba(49,46,129,1)] active:shadow-none active:translate-y-1 transition-all"
                >
                  <Plus />
                </button>
              </form>
            )}

            {/* Items */}
            <div className="space-y-3">
              {selectedCategory === "Productos pendientes"
                ? allPendingItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-xl border-2 bg-white border-red-200 shadow-md"
                    >
                      {/* ✅ Hacer clickeable para completar */}
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => completePendingItem(item)}
                      >
                        <Circle className="text-red-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-gray-800 block truncate">
                            {item.text}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                            {item.createdAt && (
                              <span className="text-xs text-gray-400">
                                • {formatDate(item.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Botón de eliminar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePendingItem(item);
                        }}
                        className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))
                : items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        item.completed
                          ? "bg-gray-100 border-gray-300 opacity-60"
                          : "bg-white border-indigo-100 shadow-md"
                      }`}
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => toggleComplete(item.id, item.completed)}
                      >
                        {item.completed ? (
                          <CheckCircle2 className="text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="text-indigo-300 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span
                            className={`font-medium block truncate ${
                              item.completed ? "line-through text-gray-500" : "text-gray-800"
                            }`}
                          >
                            {item.text}
                          </span>
                          {item.createdAt && (
                            <span className="text-xs text-gray-400 mt-1 block">
                              {formatDate(item.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoList;