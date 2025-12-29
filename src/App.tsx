// src/App.tsx
import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { auth } from "./services/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Link } from "react-router-dom";
import {
  LayoutGrid,
  PlusCircle,
  Users,
  LogOut,
  Power,
  ClipboardList,
  Package,
} from "lucide-react";

import Auth from "./authentication/auth";
import AddProduct from "./components/products/addProduct";
import ViewProducts from "./components/products/viewProduct";
import UsersList from "./components/users/usersList";
import TodoList from "./components/todo/TodoList";
import Profile from "./components/userProfile/profile";
import Orders from "./components/orders/orders";
import AdminOrders from "./components/AdminOrders/adminOrders";

const ADMIN_EMAIL = "sywinclopez@gmail.com";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        Cargando aplicación...
      </div>
    );

  return (
    <Router>
      <div className="App">
        {/* Solo mostrar Nav si el usuario está logueado */}
        {user && (
          <nav className="relative bg-[#5472F1] text-white px-6 py-3 shadow-xl flex items-center justify-between">
            {/* Espaciador para mantener el centro (invisible) */}
            <div className="w-12 hidden md:block"></div>

            {/* Menú Central */}
            <ul className="flex items-center space-x-4">
              <li>
                <Link
                  to="/view-products"
                  className="group flex items-center space-x-2 px-5 py-2 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 text-white font-bold rounded-xl shadow-[0_4px_0_0_rgba(5,150,105,1)] active:shadow-none active:translate-y-1 transition-all duration-150 border border-green-300/20"
                >
                  <LayoutGrid className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="hidden sm:inline">PRODUCTOS</span>
                </Link>
              </li>

              <li>
                <Link
                  to="/add-product"
                  className="group flex items-center space-x-2 px-5 py-2 bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-700 text-white font-bold rounded-xl shadow-[0_4px_0_0_rgba(67,56,202,1)] active:shadow-none active:translate-y-1 transition-all duration-150 border border-indigo-300/20"
                >
                  <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">AGREGAR</span>
                </Link>
              </li>

              <li>
                <Link
                  to="/users"
                  className="group flex items-center space-x-2 px-5 py-2 bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 text-white font-bold rounded-xl shadow-[0_4px_0_0_rgba(217,119,6,1)] active:shadow-none active:translate-y-1 transition-all duration-150 border border-amber-200/20"
                >
                  <Users className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                  <span className="hidden sm:inline">CREDITOS</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/todo"
                  className="group flex items-center space-x-2 px-5 py-2 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700 text-white font-bold rounded-xl shadow-[0_4px_0_0_rgba(107,33,168,1)] active:shadow-none active:translate-y-1 transition-all duration-150 border border-purple-300/20"
                >
                  <ClipboardList className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="hidden sm:inline">LISTAS</span>
                </Link>
              </li>
                <li>
                <Link
                  to="/admin/orders"
                  className="group flex items-center space-x-2 px-5 py-2 bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700 text-white font-bold rounded-xl shadow-[0_4px_0_0_rgba(107,33,168,1)] active:shadow-none active:translate-y-1 transition-all duration-150 border border-purple-300/20"
                >
                  <Package className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  <span className="hidden sm:inline">PEDIDOS</span>
                </Link>
              </li>
            </ul>

            {/* Botón Salir - Esquina Derecha */}
            <button
              onClick={() => auth.signOut()}
              title="Cerrar Sesión"
              className="flex items-center justify-center w-11 h-11 bg-gradient-to-br from-red-400 via-red-500 to-rose-700 text-white rounded-xl shadow-[0_4px_0_0_rgba(153,27,27,1)] active:shadow-none active:translate-y-1 transition-all duration-150 border border-red-300/20 hover:brightness-110"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </nav>
        )}

        <Routes>
          <Route
            path="/login"
            element={
              !user ? (
                <Auth />
              ) : user.email === ADMIN_EMAIL ? (
                <Navigate to="/view-products" />
              ) : (
                <Navigate to="/profile" />
              )
            }
          />

          {/* Rutas protegidas SOLO para admin */}
          <Route
            path="/view-products"
            element={
              user && user.email === ADMIN_EMAIL ? (
                <ViewProducts />
              ) : (
                <Navigate to="/profile" />
              )
            }
          />
          <Route
            path="/add-product"
            element={
              user && user.email === ADMIN_EMAIL ? (
                <AddProduct />
              ) : (
                <Navigate to="/profile" />
              )
            }
          />
          <Route
            path="/users"
            element={
              user && user.email === ADMIN_EMAIL ? (
                <UsersList />
              ) : (
                <Navigate to="/profile" />
              )
            }
          />
          <Route
            path="/todo"
            element={
              user && user.email === ADMIN_EMAIL ? (
                <TodoList />
              ) : (
                <Navigate to="/profile" />
              )
            }
          />

          {/* Ruta de pedidos: accesible para todos los usuarios autenticados */}
          <Route
            path="/orders"
            element={user ? <Orders /> : <Navigate to="/login" />}
          />

          {/* 🔒 Ruta protegida: solo admin puede ver todos los pedidos */}
          <Route
            path="/admin/orders"
            element={
              user && user.email === ADMIN_EMAIL ? (
                <AdminOrders />
              ) : (
                <Navigate to="/profile" />
              )
            }
          />

          {/* Nueva ruta de perfil para no-admins */}
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/login" />}
          />

          {/* Redirección por defecto */}
          <Route
            path="*"
            element={
              user ? (
                user.email === ADMIN_EMAIL ? (
                  <Navigate to="/view-products" />
                ) : (
                  <Navigate to="/profile" />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
