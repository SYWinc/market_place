// src/components/todo/TodoList.tsx
import React, { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { ChevronLeft, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

const CATEGORIES = [
  "Carnes", "Legumbres", "Verduras", "Pan", "Gaseosas", "Yogur", 
  "Mecatos", "Medicamentos", "Aseo", "Detergentes", "Bastimento", 
  "Enlatados", "Carnes frías", "Dulces", "Canasta"
];

const TodoList: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState("");

  // Escuchar cambios en tiempo real de la categoría seleccionada
  useEffect(() => {
    if (!selectedCategory) return;

    const q = query(
      collection(db, "todo_lists", selectedCategory, "items"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(docs);
    });

    return () => unsubscribe();
  }, [selectedCategory]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim() || !selectedCategory) return;

    await addDoc(collection(db, "todo_lists", selectedCategory, "items"), {
      text: newItem,
      completed: false,
      createdAt: Timestamp.now()
    });
    setNewItem("");
  };

  const toggleComplete = async (itemId: string, currentStatus: boolean) => {
    const itemRef = doc(db, "todo_lists", selectedCategory!, "items", itemId);
    await updateDoc(itemRef, { completed: !currentStatus });
  };

  const deleteItem = async (itemId: string) => {
    await deleteDoc(doc(db, "todo_lists", selectedCategory!, "items", itemId));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-md mx-auto">
        {!selectedCategory ? (
          <>
            <h1 className="text-2xl font-black text-indigo-700 mb-6 mt-4">MIS LISTAS RETRO</h1>
            <div className="grid grid-cols-2 gap-4">
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
              <button onClick={() => setSelectedCategory(null)} className="mr-2 hover:scale-110 transition">
                <ChevronLeft size={28} />
              </button>
              <h2 className="text-xl font-bold uppercase tracking-wider">{selectedCategory}</h2>
            </div>

            {/* Formulario */}
            <form onSubmit={addItem} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Añadir algo nuevo..."
                className="flex-1 p-3 rounded-xl border-2 border-indigo-200 focus:border-indigo-500 outline-none"
              />
              <button type="submit" className="bg-indigo-600 text-white p-3 rounded-xl shadow-[0_4px_0_0_rgba(49,46,129,1)] active:shadow-none active:translate-y-1 transition-all">
                <Plus />
              </button>
            </form>

            {/* Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${item.completed ? 'bg-gray-100 border-gray-300 opacity-60' : 'bg-white border-indigo-100 shadow-md'}`}
                >
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleComplete(item.id, item.completed)}>
                    {item.completed ? <CheckCircle2 className="text-green-500" /> : <Circle className="text-indigo-300" />}
                    <span className={`font-medium ${item.completed ? 'line-through' : 'text-gray-700'}`}>{item.text}</span>
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={20} />
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