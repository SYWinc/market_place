import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import {
  User as UserIcon,
  Phone,
  Trash2,
  Mail,
  CreditCard,
  Plus,
  ChevronLeft,
  Wallet,
  Receipt,
} from "lucide-react";

interface User {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  creditLimit: number;
  currentDebt: number;
}

interface NewCredit {
  amount: number;
  description: string;
}

interface Credit {
  id: string;
  userId: string;
  amount: number;
  description: string;
  date: Timestamp;
  month: string;
  status: "pending" | "paid" | "partially_paid";
  paidAmount: number;
}

const UsersList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState<Omit<User, "id" | "currentDebt">>({
    name: "",
    email: "",
    phone: "",
    creditLimit: 0,
  });
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newCredit, setNewCredit] = useState<NewCredit>({
    amount: 0,
    description: "",
  });
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    userId: string | null;
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    userName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<Credit[]>([]);
  const [viewCreditsModalOpen, setViewCreditsModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [creditToPayId, setCreditToPayId] = useState<string | null>(null);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [selectedUserIdForAbono, setSelectedUserIdForAbono] = useState<
    string | null
  >(null);

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersData: User[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          creditLimit: Number(doc.data().creditLimit) || 0,
          currentDebt: Number(doc.data().currentDebt) || 0,
        })) as User[];
        setUsers(usersData);
      } catch (error) {
        console.error("Error al obtener usuarios: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const fetchUserCredits = async (userId: string) => {
    try {
      const q = query(collection(db, "credits"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const creditsData: Credit[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Credit[];
      setUserCredits(creditsData);
    } catch (error) {
      console.error("Error al obtener créditos:", error);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name.trim() || newUser.creditLimit <= 0) {
      setError("Nombre y límite de crédito válido son obligatorios.");
      return;
    }
    try {
      await addDoc(collection(db, "users"), {
        ...newUser,
        currentDebt: 0,
      });
      setNewUser({ name: "", email: "", phone: "", creditLimit: 0 });
      setError(null);
      setShowForm(false);

      // Refresh users list
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData: User[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        creditLimit: Number(doc.data().creditLimit) || 0,
        currentDebt: Number(doc.data().currentDebt) || 0,
      })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error("Error al agregar usuario:", error);
      alert("Error al registrar el cliente.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: name === "creditLimit" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleOpenCreditModal = (userId: string) => {
    setSelectedUserId(userId);
    setCreditModalOpen(true);
    setNewCredit({ amount: 0, description: "" });
  };

  const handleCloseCreditModal = () => {
    setCreditModalOpen(false);
    setSelectedUserId(null);
  };

  const handleAssignCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedUserId ||
      newCredit.amount <= 0 ||
      !newCredit.description.trim()
    ) {
      setError("Monto y descripción válidos son obligatorios.");
      return;
    }

    const user = users.find((u) => u.id === selectedUserId);
    if (!user) return;

    if (user.currentDebt + newCredit.amount > user.creditLimit) {
      setError("El nuevo pedido excede el límite de crédito.");
      return;
    }

    try {
      const newCreditDoc = {
        userId: selectedUserId,
        amount: newCredit.amount,
        description: newCredit.description,
        date: Timestamp.now(),
        month: new Date().toLocaleDateString("es-ES", {
          month: "long",
          year: "numeric",
        }),
        status: "pending" as const,
        paidAmount: 0,
      };

      const docRef = await addDoc(collection(db, "credits"), newCreditDoc);

      // Update user's currentDebt
      const newDebt = user.currentDebt + newCredit.amount;
      await updateDoc(doc(db, "users", selectedUserId), {
        currentDebt: newDebt,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserId ? { ...u, currentDebt: newDebt } : u
        )
      );

      handleCloseCreditModal();
      await fetchUserCredits(selectedUserId);
    } catch (error) {
      console.error("Error al asignar crédito:", error);
      alert("Error al crear el pedido.");
    }
  };

  const handleOpenViewCreditsModal = async (userId: string) => {
    await fetchUserCredits(userId);
    setSelectedUserIdForAbono(userId); // 👈 Guarda el ID para el abono
    setViewCreditsModalOpen(true);
  };

  const handleCloseViewCreditsModal = () => {
    setViewCreditsModalOpen(false);
    setUserCredits([]);
  };

  const handleOpenPaymentModal = (creditId: string) => {
    setCreditToPayId(creditId);
    setPaymentModalOpen(true);
    setPaymentAmount(0);
  };

  const handleApplyPayment = async () => {
    if (!creditToPayId || paymentAmount <= 0) return;

    const credit = userCredits.find((c) => c.id === creditToPayId);
    const userId = credit?.userId;
    if (!credit || !userId) return;

    const newPaidAmount = Math.min(
      credit.paidAmount + paymentAmount,
      credit.amount
    );
    const isFullyPaid = newPaidAmount >= credit.amount;

    try {
      // Update credit
      await updateDoc(doc(db, "credits", creditToPayId), {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? "paid" : "partially_paid",
      });

      // Update user debt
      const debtReduction = newPaidAmount - credit.paidAmount;
      const user = users.find((u) => u.id === userId);
      if (user) {
        const updatedDebt = Math.max(0, user.currentDebt - debtReduction);
        await updateDoc(doc(db, "users", userId), {
          currentDebt: updatedDebt,
        });

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, currentDebt: updatedDebt } : u
          )
        );
      }

      // Refresh credits
      await fetchUserCredits(userId);

      setPaymentModalOpen(false);
      setPaymentAmount(0);
      setCreditToPayId(null);
    } catch (error) {
      console.error("Error al aplicar pago:", error);
      alert("Error al procesar el pago.");
    }
  };

  const handleOpenDiscountModal = () => {
    setDiscountModalOpen(true);
    setDiscountAmount(0);
  };

  const handleApplyDiscount = async () => {
    if (!selectedUserIdForAbono || discountAmount <= 0) return; // 👈 Usa el nuevo estado

    const user = users.find((u) => u.id === selectedUserIdForAbono);
    if (!user) return;

    const newDebt = Math.max(0, user.currentDebt - discountAmount);

    try {
      await updateDoc(doc(db, "users", selectedUserIdForAbono), {
        currentDebt: newDebt,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUserIdForAbono ? { ...u, currentDebt: newDebt } : u
        )
      );

      // Opcional: crear un registro de abono en 'credits' si lo deseas, pero no es obligatorio

      // Refrescar créditos para que cualquier cambio refleje la deuda reducida
      await fetchUserCredits(selectedUserIdForAbono);

      // Cerrar modales
      setDiscountModalOpen(false);
      setDiscountAmount(0);
      setSelectedUserIdForAbono(null); // Limpiar
    } catch (error) {
      console.error("Error al aplicar descuento:", error);
      alert("Error al aplicar el abono.");
    }
  };

  const currentUser = selectedUserIdForAbono
    ? users.find((u) => u.id === selectedUserIdForAbono)
    : userCredits.length > 0
    ? users.find((u) => u.id === userCredits[0].userId)
    : null;

  if (loading)
    return (
      <div className="text-center py-20 font-black text-indigo-600 animate-pulse">
        CARGANDO CLIENTES...
      </div>
    );

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 👇 NUEVO: Solo abre el modal de confirmación
  const handleDeleteUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    setDeleteConfirmation({
      isOpen: true,
      userId,
      userName: user.name,
    });
  };

  // 👇 NUEVO: Contiene toda tu lógica original de eliminación
  const confirmDeleteUser = async () => {
    const { userId, userName } = deleteConfirmation;
    if (!userId) return;

    try {
      // 1. Eliminar todos los créditos del usuario
      const creditsQuery = query(
        collection(db, "credits"),
        where("userId", "==", userId)
      );
      const creditsSnapshot = await getDocs(creditsQuery);
      const deleteCreditsPromises = creditsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deleteCreditsPromises);

      // 2. Eliminar el usuario
      await deleteDoc(doc(db, "users", userId));

      // 3. Actualizar estado local
      setUsers((prev) => prev.filter((u) => u.id !== userId));

      // Opcional: cerrar modales si el usuario eliminado estaba en uno
      if (selectedUserId === userId) {
        handleCloseCreditModal();
      }
      if (selectedUserIdForAbono === userId) {
        setViewCreditsModalOpen(false);
        setDiscountModalOpen(false);
        setSelectedUserIdForAbono(null);
      }

      setNotification({
        message: "Cliente eliminado correctamente.",
        type: "success",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      setNotification({
        message: "Error al eliminar el cliente.",
        type: "error",
      });
      setTimeout(() => setNotification(null), 1500);
    } finally {
      setDeleteConfirmation({ isOpen: false, userId: null, userName: "" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header Retro */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-black text-indigo-700 tracking-tighter uppercase italic">
            Control de Créditos
          </h1>
          <p className="text-gray-500 font-bold text-sm">
            GESTIÓN DE DEUDAS Y ABONOS
          </p>
        </header>

        {/* Título y búsqueda */}
        <h2 className="text-xl font-black text-gray-800 uppercase mb-4">
          Clientes
        </h2>

        {/* Buscador compacto con ícono */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            className="w-full pl-10 pr-4 py-2 text-sm border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none font-bold"
          />
        </div>

        {/* Botón Agregar */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-yellow-400 border-2 border-black p-2 rounded-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
            title="Nuevo cliente"
          >
            <Plus size={20} className="text-black" />
          </button>
        </div>

        {/* Formulario Estilo Retro */}
        {showForm && (
          <div className="bg-white border-4 border-indigo-600 rounded-2xl p-6 mb-8 shadow-[8px_8px_0_0_rgba(79,70,229,1)]">
            <h2 className="text-lg font-black text-indigo-700 mb-4 uppercase">
              Nuevo Cliente
            </h2>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <form
              onSubmit={handleAddUser}
              className="space-y-4 font-bold text-sm"
            >
              <input
                type="text"
                name="name"
                placeholder="NOMBRE COMPLETO"
                value={newUser.name}
                onChange={handleInputChange}
                required
                className="w-full p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  name="phone"
                  placeholder="TELÉFONO"
                  value={newUser.phone}
                  onChange={handleInputChange}
                  className="p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
                />
                <input
                  type="number"
                  name="creditLimit"
                  placeholder="LÍMITE $"
                  value={newUser.creditLimit || ""}
                  onChange={handleInputChange}
                  min="0"
                  step="any"
                  className="p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl shadow-[0_4px_0_0_rgba(49,46,129,1)] active:shadow-none active:translate-y-1 transition-all uppercase"
              >
                Registrar Cliente
              </button>
            </form>
          </div>
        )}

        {/* Lista de Usuarios en Tarjetas */}
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => handleOpenViewCreditsModal(user.id!)}
              className="group cursor-pointer bg-white border-2 border-black rounded-2xl p-4 shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-[8px_8px_0_0_rgba(79,70,229,1)] hover:-translate-y-1 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg border-2 border-indigo-600">
                    <UserIcon className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-gray-800 uppercase leading-none mb-1">
                      {user.name}
                    </h3>
                    <div className="flex gap-2 text-[10px] font-bold text-gray-400">
                      <span className="flex items-center gap-1">
                        <Phone size={10} /> {user.phone || "S/N"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`px-3 py-1 rounded-full border-2 border-black font-black text-xs ${
                      user.currentDebt > 0
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {user.currentDebt > 0 ? "DEUDOR" : "AL DÍA"}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(user.id!);
                    }}
                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"
                    title="Eliminar cliente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 bg-gray-50 p-3 rounded-xl border-2 border-dashed border-gray-200">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">
                    Deuda Actual
                  </p>
                  <p className="text-xl font-black text-red-500">
                    ${user.currentDebt.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase">
                    Límite Disponible
                  </p>
                  <p className="text-xl font-black text-indigo-600">
                    ${(user.creditLimit - user.currentDebt).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCreditModal(user.id!);
                  }}
                  className="flex-1 bg-black text-white text-[10px] font-black py-2 rounded-lg uppercase hover:bg-indigo-600 transition-colors"
                >
                  Nuevo Pedido
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Asignar Crédito */}
      {creditModalOpen && selectedUserId && (
        <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black rounded-3xl shadow-[10px_10px_0_0_rgba(0,0,0,1)] max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black uppercase">
                Nuevo Pedido para{" "}
                {users.find((u) => u.id === selectedUserId)?.name}
              </h3>
              <button
                onClick={handleCloseCreditModal}
                className="bg-white border-2 border-black p-1 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignCredit} className="space-y-4">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <input
                type="number"
                placeholder="Monto $"
                value={newCredit.amount || ""}
                onChange={(e) =>
                  setNewCredit({
                    ...newCredit,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                min="0"
                step="any"
                className="w-full p-3 border-2 border-black rounded-xl font-bold"
              />
              <textarea
                placeholder="Descripción del pedido"
                value={newCredit.description}
                onChange={(e) =>
                  setNewCredit({ ...newCredit, description: e.target.value })
                }
                className="w-full p-3 border-2 border-black rounded-xl font-bold"
                rows={2}
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white font-black py-2 rounded-xl shadow-[0_4px_0_0_rgba(49,46,129,1)] active:shadow-none active:translate-y-1 transition-all uppercase"
              >
                Guardar Pedido
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Créditos */}
      {viewCreditsModalOpen && (
        <div className="fixed inset-0 bg-indigo-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black rounded-3xl shadow-[10px_10px_0_0_rgba(0,0,0,1)] max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b-4 border-black bg-indigo-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase italic leading-none">
                  {currentUser?.name}
                </h3>
                <p className="text-sm font-bold text-indigo-600 mt-1">
                  HISTORIAL DE PEDIDOS
                </p>
              </div>
              <button
                onClick={handleCloseViewCreditsModal}
                className="bg-white border-2 border-black p-1 rounded-lg"
              >
                <ChevronLeft />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-red-50 p-4 border-2 border-red-600 rounded-2xl">
                  <p className="text-[10px] font-black text-red-400 uppercase">
                    Total Deuda
                  </p>
                  <p className="text-2xl font-black text-red-600">
                    ${currentUser?.currentDebt.toFixed(2)}
                  </p>
                </div>
                <div
                  className="bg-indigo-50 p-4 border-2 border-indigo-600 rounded-2xl flex flex-col justify-center items-center cursor-pointer hover:bg-indigo-100 transition-colors"
                  onClick={handleOpenDiscountModal}
                >
                  <Wallet className="mb-1" />
                  <p className="text-[10px] font-black uppercase">
                    Hacer Abono
                  </p>
                </div>
              </div>

              {userCredits.length === 0 ? (
                <p className="text-center text-gray-500 italic">
                  No hay pedidos registrados.
                </p>
              ) : (
                userCredits.map((credit) => (
                  <div
                    key={credit.id}
                    className="border-2 border-black p-4 rounded-2xl bg-white shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded border border-black">
                        {credit.date?.toDate
                          ? credit.date.toDate().toLocaleDateString()
                          : "FECHA N/A"}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-1 rounded border border-black uppercase ${
                          credit.status === "paid"
                            ? "bg-green-400"
                            : "bg-yellow-400"
                        }`}
                      >
                        {credit.status === "paid"
                          ? "Pagado"
                          : credit.status === "partially_paid"
                          ? "Parcial"
                          : "Pendiente"}
                      </span>
                    </div>
                    <p className="font-bold text-gray-700 mb-3 text-sm italic">
                      "{credit.description}"
                    </p>
                    <div className="flex justify-between items-end border-t-2 border-dashed border-gray-100 pt-3">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">
                          Monto
                        </p>
                        <p className="font-black text-lg">
                          ${credit.amount.toFixed(2)}
                        </p>
                        {credit.paidAmount > 0 && (
                          <p className="text-[10px] text-green-600">
                            Abonado: ${credit.paidAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleOpenPaymentModal(credit.id)}
                        className="bg-black text-white px-4 py-1 rounded-lg font-black text-xs uppercase"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Pago Parcial */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border-4 border-black p-6 rounded-2xl max-w-xs w-full">
            <h3 className="font-black text-lg mb-4">Aplicar Pago</h3>
            <input
              type="number"
              placeholder="Monto a pagar"
              value={paymentAmount || ""}
              onChange={(e) =>
                setPaymentAmount(parseFloat(e.target.value) || 0)
              }
              className="w-full p-3 border-2 border-black rounded mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 bg-gray-300 font-black py-2 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyPayment}
                className="flex-1 bg-green-500 text-white font-black py-2 rounded"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Abono General (Descuento) */}
      {discountModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border-4 border-black p-6 rounded-2xl max-w-xs w-full">
            <h3 className="font-black text-lg mb-4">Abono General</h3>
            <p className="text-sm mb-2">
              Reducirá la deuda total de {currentUser?.name}
            </p>
            <input
              type="number"
              placeholder="Monto del abono"
              value={discountAmount || ""}
              onChange={(e) =>
                setDiscountAmount(parseFloat(e.target.value) || 0)
              }
              className="w-full p-3 border-2 border-black rounded mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setDiscountModalOpen(false)}
                className="flex-1 bg-gray-300 font-black py-2 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyDiscount}
                className="flex-1 bg-indigo-600 text-white font-black py-2 rounded"
              >
                Aplicar Abono
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black rounded-3xl shadow-[10px_10px_0_0_rgba(0,0,0,1)] max-w-sm w-full p-6 text-center">
            <h3 className="text-lg font-black uppercase mb-2 text-red-600">
              ¿Eliminar cliente?
            </h3>
            <p className="font-bold text-gray-800 mb-4">
              ¿Eliminar a <span className="italic">"{deleteConfirmation.userName}"</span>?
            </p>
            <p className="text-[10px] text-gray-600 mb-6 font-bold uppercase">
              Esta acción es irreversible y eliminará todos sus pedidos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setDeleteConfirmation({ isOpen: false, userId: null, userName: "" })
                }
                className="flex-1 bg-gray-200 border-2 border-black font-black py-2 rounded-lg uppercase text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 bg-red-500 border-2 border-black text-white font-black py-2 rounded-lg uppercase text-sm hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación estilo retro */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div
            className={`border-4 rounded-2xl px-6 py-3 font-black text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)] ${
              notification.type === "success"
                ? "bg-green-100 border-green-600 text-green-800"
                : "bg-red-100 border-red-600 text-red-800"
            }`}
          >
            {notification.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;