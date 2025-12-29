// src/components/ViewProducts.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const CATEGORIES = [
  { id: "carnes-frias", name: "Carnes frías", icon: "🍖" },
  { id: "legumbres", name: "Legumbres", icon: "🫘" },
  { id: "frutas-verduras", name: "Frutas y verduras", icon: "🥦" },
  { id: "panes", name: "Panes", icon: "🍞" },
  { id: "gaseosas", name: "Gaseosas", icon: "🥤" },
  { id: "lacteos", name: "Lacteos", icon: "🥛" },
  { id: "mecatos", name: "Mecatos", icon: "🍿" },
  { id: "medicamentos", name: "Medicamentos", icon: "💊" },
  { id: "aseo-hogar", name: "Aseo Hogar", icon: "🧼" },
  { id: "aseo-personal", name: "Aseo Personal", icon: "🧴" },
  { id: "bastimentos", name: "Bastimentos", icon: "🧂" },
  { id: "enlatados", name: "Enlatados", icon: "🥫" },
  { id: "dulceria", name: "Dulcería", icon: "🍬" },
  { id: "galletas", name: "Galletas", icon: "🍪" },
  { id: "canasta-familiar", name: "Canasta familiar", icon: "🧺" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

interface Product {
  id: string;
  codigo: string;
  descripcion: string;
  unidadMedida: string;
  precioUnitario: number;
  precioConIva: number;
  precioVenta: number;
  proveedor: string;
  imagenUrl?: string;
  categoria: CategoryId;
}

const compareCodigos = (a: string, b: string): number => {
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);
  return numA - numB;
};

const ViewProducts: React.FC = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<
    CategoryId | "all" | null
  >(null); // empieza en null para mostrar categorías
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para funcionalidades existentes
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempProduct, setTempProduct] = useState<Partial<Product>>({});
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storage = getStorage();

  // Cargar todos los productos
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData: Product[] = [];
        querySnapshot.forEach((doc) => {
          const rawData = doc.data() as Omit<Product, "id">;
          const categoria =
            rawData.categoria &&
            CATEGORIES.some((c) => c.id === rawData.categoria)
              ? rawData.categoria
              : "canasta-familiar";

          productsData.push({
            id: doc.id,
            ...rawData,
            categoria,
            precioUnitario: rawData.precioUnitario || 0,
            precioConIva: rawData.precioConIva || 0,
            precioVenta: rawData.precioVenta || 0,
          });
        });
        productsData
          .sort((a, b) => compareCodigos(a.codigo, b.codigo))
          .reverse();
        setAllProducts(productsData);
      } catch (error) {
        console.error("Error al obtener productos: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Filtrar productos según categoría y búsqueda (para la vista de productos)
  const filteredProducts = allProducts.filter((product) => {
    const matchesCategory =
      selectedCategory === "all" || product.categoria === selectedCategory;
    const matchesSearch =
      product.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.proveedor.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // === Funciones existentes (sin cambios) ===

  const handleCardClick = (id: string) => {
    setFlippedCardId(flippedCardId === id ? null : id);
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setTempProduct({ ...product });
    setFlippedCardId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTempProduct({});
  };

  const saveChanges = async (id: string) => {
    if (
      !tempProduct.descripcion ||
      !tempProduct.codigo ||
      !tempProduct.categoria
    )
      return;
    try {
      const updatedProduct = {
        ...tempProduct,
        precioUnitario: parseFloat(tempProduct.precioUnitario as any) || 0,
        precioConIva: parseFloat(tempProduct.precioConIva as any) || 0,
        precioVenta: parseFloat(tempProduct.precioVenta as any) || 0,
        categoria: tempProduct.categoria as CategoryId,
      };
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, updatedProduct);
      const updatedProducts = allProducts
        .map((p) =>
          p.id === id ? ({ ...p, ...updatedProduct } as Product) : p
        )
        .sort((a, b) => compareCodigos(a.codigo, b.codigo));
      setAllProducts(updatedProducts);
      setEditingId(null);
      setTempProduct({});
    } catch (error) {
      console.error("Error al actualizar producto: ", error);
      alert("Error al guardar los cambios.");
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (
      !window.confirm(
        `¿Eliminar producto "${product.descripcion}" (#${product.codigo})? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "products", product.id));
      const updatedProducts = allProducts.filter((p) => p.id !== product.id);
      setAllProducts(updatedProducts);
      setNotification({
        message: "Producto eliminado con éxito.",
        type: "success",
      });
    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      setNotification({
        message: "Error al eliminar el producto.",
        type: "error",
      });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTempProduct((prev) => ({ ...prev, [name]: value }));
  };

  const takePhotoAndUpdateImage = async (productId: string) => {
    setUploadingImageId(productId);
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          setUploadingImageId(null);
          return;
        }
        try {
          const fileName = `${Date.now()}_${productId}.jpg`;
          const storageRef = ref(storage, `product-images/${fileName}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          const productRef = doc(db, "products", productId);
          await updateDoc(productRef, { imagenUrl: downloadUrl });
          const updatedProducts = allProducts
            .map((p) =>
              p.id === productId ? { ...p, imagenUrl: downloadUrl } : p
            )
            .sort((a, b) => compareCodigos(a.codigo, b.codigo));
          setAllProducts(updatedProducts);
          setNotification({
            message: "Imagen actualizada con éxito!",
            type: "success",
          });
          setTimeout(() => setNotification(null), 3000);
        } catch (uploadError) {
          console.error("Error al subir la imagen:", uploadError);
          alert("Error al subir la imagen.");
        } finally {
          setUploadingImageId(null);
        }
      };
      input.click();
    } catch (err) {
      console.error("Error al abrir el selector de archivos:", err);
      alert("No se pudo abrir el selector de imágenes.");
      setUploadingImageId(null);
    }
  };

  const openImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (uploadingImageId) {
      setElapsedSeconds(0);
      interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadingImageId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const modal = document.getElementById("image-modal-content");
      if (showImageModal && modal && !modal.contains(e.target as Node)) {
        closeImageModal();
      }
    };

    if (showImageModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showImageModal]);

  // === RENDER ===

  // Pantalla de selección de categoría (o resultados globales si hay búsqueda)
  if (selectedCategory === null) {
    // Filtrado global: ignora categoría, solo usa searchTerm
    const globalFilteredProducts = allProducts.filter((product) => {
      const matchesSearch =
        product.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.proveedor.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    // Si hay búsqueda activa, mostramos resultados
    if (searchTerm.trim() !== "") {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4 font-sans">
          <div className="max-w-4xl mx-auto">
            {/* Cabecera con botón de retroceso */}
            <div className="flex items-center mb-6">
              <button
                onClick={() => {
                  setSearchTerm("");
                }}
                className="mr-3 text-indigo-800 font-black text-2xl hover:scale-110"
              >
                ←
              </button>
              <h1 className="text-2xl font-black text-indigo-800">
                Resultados para "{searchTerm}"
              </h1>
            </div>

            <div className="mb-6 relative">
              <input
                type="text"
                placeholder="🔍 Buscar en todos los productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pr-12 font-bold border-2 border-indigo-700 rounded-lg shadow-[4px_4px_0_0_#4f46e5] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-800 bg-white"
              />
            </div>

            {loading ? (
              <p className="text-center font-bold text-gray-600">
                Cargando productos...
              </p>
            ) : globalFilteredProducts.length === 0 ? (
              <p className="text-center font-bold text-gray-600">
                No se encontraron productos que coincidan con "{searchTerm}".
              </p>
            ) : (
              <div className="space-y-6">
                {globalFilteredProducts.map((product) => {
                  const isFlipped = flippedCardId === product.id;
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleCardClick(product.id)}
                      className="relative cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                      style={{ perspective: "1000px" }}
                    >
                      <div
                        className="relative w-full h-64 transition-transform duration-500 preserve-3d"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: isFlipped
                            ? "rotateY(180deg)"
                            : "rotateY(0deg)",
                        }}
                      >
                        {/* Frente */}
                        <div
                          className="absolute inset-0 bg-white border-2 border-indigo-700 rounded-xl p-5 shadow-[6px_6px_0_0_#4f46e5] flex flex-col items-center justify-center"
                          style={{ backfaceVisibility: "hidden" }}
                        >
                          <div className="absolute top-2 left-2 z-10">
                            <span className="px-2 py-1 bg-black text-white text-xs font-black rounded-full border-2 border-white shadow-[1px_1px_0_0_#000]">
                              #{product.codigo}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center flex-grow">
                            {product.imagenUrl ? (
                              <img
                                src={product.imagenUrl}
                                alt={`Imagen de ${product.descripcion}`}
                                className="max-h-32 w-auto object-contain rounded cursor-pointer border-2 border-dashed border-gray-300 hover:border-indigo-500 transition"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openImageModal(product.imagenUrl!);
                                }}
                              />
                            ) : (
                              <div className="border-2 border-dashed border-gray-400 rounded-lg w-24 h-24 flex items-center justify-center">
                                <span className="text-gray-500 text-sm">
                                  Sin imagen
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 text-center">
                            <div className="font-black text-gray-600 text-xs">
                              {product.descripcion}
                            </div>
                            <div className="text-2xl font-black text-green-700">
                              ${product.precioVenta.toFixed(0)}
                            </div>
                            <div className="mt-1 flex items-center justify-center gap-1">
                              <span className="text-lg">
                                {
                                  CATEGORIES.find(
                                    (c) => c.id === product.categoria
                                  )?.icon || "❓"
                                }
                              </span>
                              <span className="text-xs font-black text-gray-600 truncate max-w-[120px]">
                                {
                                  CATEGORIES.find(
                                    (c) => c.id === product.categoria
                                  )?.name || "Sin categoría"
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Parte trasera */}
                        <div
                          className="absolute inset-0 bg-white border-2 border-indigo-700 rounded-xl p-5 shadow-[6px_6px_0_0_#4f46e5] flex flex-col"
                          style={{
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                            <h2 className="text-lg font-black text-gray-800">
                              {product.descripcion}
                            </h2>
                            <span className="text-sm font-bold text-indigo-800 bg-indigo-100 px-2 py-1 rounded border border-indigo-400">
                              #{product.codigo}
                            </span>
                          </div>

                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm flex-grow">
                            {[
                              {
                                label: "Proveedor",
                                value: product.proveedor || "N/A",
                              },
                              {
                                label: "Unidad",
                                value: product.unidadMedida,
                              },
                              {
                                label: "Costo",
                                value: `$${product.precioUnitario?.toFixed(
                                  2
                                )}`,
                              },
                              {
                                label: "Precio + IVA",
                                value: `$${product.precioConIva?.toFixed(
                                  2
                                )}`,
                              },
                              {
                                label: "Venta",
                                value: `$${product.precioVenta.toFixed(0)}`,
                              },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <dt className="font-black text-gray-600 text-xs uppercase tracking-wider">
                                  {label}
                                </dt>
                                <dd className="font-bold text-gray-800">
                                  {value}
                                </dd>
                              </div>
                            ))}
                            <div>
                              <dt className="font-black text-gray-600 text-xs uppercase tracking-wider">
                                Categoría
                              </dt>
                              <dd className="font-bold text-gray-800 flex items-center gap-1">
                                <span>
                                  {
                                    CATEGORIES.find(
                                      (c) => c.id === product.categoria
                                    )?.icon || "?"
                                  }
                                </span>
                                {
                                  CATEGORIES.find(
                                    (c) => c.id === product.categoria
                                  )?.name || "Sin categoría"
                                }
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Si NO hay búsqueda, mostramos el selector de categorías
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4 font-sans">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black text-center text-indigo-800 mb-6 tracking-tight shadow-[3px_3px_0_0_#4f46e5]">
            SELECCIONA UNA CATEGORÍA
          </h1>
          <div className="mb-6 relative">
            <input
              type="text"
              placeholder="🔍 Buscar en todos los productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pr-12 font-bold border-2 border-indigo-700 rounded-lg shadow-[4px_4px_0_0_#4f46e5] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-800 bg-white"
            />
          </div>
          <div className="mb-6">
            <button
              onClick={() => setSelectedCategory("all")}
              className="w-full p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black rounded-xl shadow-[4px_4px_0_0_rgba(79,70,229,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all text-left"
            >
              📦 Ver todos los productos
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="p-4 bg-white border-2 border-indigo-600 rounded-xl shadow-[4px_4px_0_0_rgba(79,70,229,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all text-left font-bold text-gray-700 hover:bg-indigo-50 flex flex-col items-center"
              >
                <span className="text-2xl mb-1">{cat.icon}</span>
                <span className="text-center text-sm">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // === Pantalla de productos (cuando selectedCategory es "all" o una categoría específica) ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Cabecera con botón de retroceso */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className="mr-3 text-indigo-800 font-black text-2xl hover:scale-110"
          >
            ←
          </button>
          <h1 className="text-2xl font-black text-indigo-800">
            {selectedCategory === "all"
              ? "Todos los productos"
              : CATEGORIES.find((c) => c.id === selectedCategory)?.name}
          </h1>
        </div>

        <div className="mb-6 relative">
          <input
            type="text"
            placeholder={`🔍 Buscar en ${
              selectedCategory === "all" ? "todos" : "esta categoría"
            }...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pr-12 font-bold border-2 border-indigo-700 rounded-lg shadow-[4px_4px_0_0_#4f46e5] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-800 bg-white"
          />
        </div>

        {loading ? (
          <p className="text-center font-bold text-gray-600">
            Cargando productos...
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center font-bold text-gray-600">
            No hay productos{" "}
            {selectedCategory !== "all" ? "en esta categoría" : ""}.
          </p>
        ) : (
          <div className="space-y-6">
            {filteredProducts.map((product) => {
              const isEditing = editingId === product.id;
              const isFlipped = flippedCardId === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => !isEditing && handleCardClick(product.id)}
                  className={`relative transition-transform duration-300 ${
                    isEditing
                      ? "cursor-default"
                      : "cursor-pointer hover:scale-[1.02]"
                  }`}
                  style={!isEditing ? { perspective: "1000px" } : {}}
                >
                  {isEditing ? (
                    <div className="bg-white border-2 border-indigo-700 rounded-xl p-5 shadow-[6px_6px_0_0_#4f46e5] relative">
                      <div className="absolute top-2 right-2 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProduct(product);
                          }}
                          className="w-8 h-8 font-black bg-red-600 text-white rounded-full border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-red-700"
                          title="Eliminar producto"
                        >
                          ×
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3">
                        <input
                          type="text"
                          name="descripcion"
                          value={tempProduct.descripcion ?? product.descripcion}
                          onChange={handleInputChange}
                          className="text-lg font-black text-gray-800 border-2 border-gray-400 rounded px-3 py-2 flex-1 w-full sm:w-auto bg-gray-50"
                        />
                        <input
                          type="text"
                          name="codigo"
                          value={tempProduct.codigo ?? product.codigo}
                          onChange={handleInputChange}
                          className="text-sm font-bold text-indigo-800 bg-indigo-50 border-2 border-indigo-600 rounded px-3 py-2 w-full sm:w-28"
                        />
                      </div>

                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm mb-5">
                        {[
                          { label: "Proveedor", key: "proveedor" },
                          { label: "Unidad", key: "unidadMedida" },
                          { label: "Costo Unitario", key: "precioUnitario" },
                          { label: "Precio + IVA", key: "precioConIva" },
                          { label: "Precio de Venta", key: "precioVenta" },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <dt className="font-black text-gray-600 text-xs uppercase tracking-wider">
                              {label}
                            </dt>
                            <input
                              type={key.includes("precio") ? "number" : "text"}
                              name={key}
                              value={
                                tempProduct[key as keyof Product] ??
                                product[key as keyof Product]
                              }
                              onChange={handleInputChange}
                              className="mt-1 w-full font-bold border-2 border-gray-400 rounded px-2 py-1.5 bg-gray-50"
                            />
                          </div>
                        ))}
                        <div>
                          <dt className="font-black text-gray-600 text-xs uppercase tracking-wider">
                            Categoría
                          </dt>
                          <select
                            name="categoria"
                            value={tempProduct.categoria ?? product.categoria}
                            onChange={handleInputChange}
                            className="mt-1 w-full font-bold border-2 border-gray-400 rounded px-2 py-1.5 bg-gray-50"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </dl>

                      <div className="flex justify-end space-x-3 mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                          className="px-5 py-2 font-black bg-gray-600 text-white rounded-lg border-2 border-black shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveChanges(product.id);
                          }}
                          className="px-5 py-2 font-black bg-green-600 text-white rounded-lg border-2 border-black shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition-all"
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="relative w-full h-64 transition-transform duration-500 preserve-3d"
                      style={{
                        transformStyle: "preserve-3d",
                        transform: isFlipped
                          ? "rotateY(180deg)"
                          : "rotateY(0deg)",
                      }}
                    >
                      <div
                        className="absolute inset-0 bg-white border-2 border-indigo-700 rounded-xl p-5 shadow-[6px_6px_0_0_#4f46e5] flex flex-col items-center justify-center"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <div className="absolute top-2 left-2 z-10">
                          <span className="px-2 py-1 bg-black text-white text-xs font-black rounded-full border-2 border-white shadow-[1px_1px_0_0_#000]">
                            #{product.codigo}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(product);
                            }}
                            className="w-8 h-8 font-black bg-red-600 text-white rounded-full border-2 border-black shadow-[2px_2px_0_0_#000] hover:bg-red-700"
                            title="Eliminar producto"
                          >
                            ×
                          </button>
                        </div>

                        <div className="flex flex-col items-center justify-center flex-grow">
                          {product.imagenUrl ? (
                            <img
                              src={product.imagenUrl}
                              alt={`Imagen de ${product.descripcion}`}
                              className="max-h-32 w-auto object-contain rounded cursor-pointer border-2 border-dashed border-gray-300 hover:border-indigo-500 transition"
                              onClick={(e) => {
                                e.stopPropagation();
                                openImageModal(product.imagenUrl!);
                              }}
                            />
                          ) : (
                            <div className="border-2 border-dashed border-gray-400 rounded-lg w-24 h-24 flex items-center justify-center">
                              {!uploadingImageId && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    takePhotoAndUpdateImage(product.id);
                                  }}
                                  className="text-2xl font-black text-white bg-indigo-700 w-10 h-10 rounded-full border-2 border-black shadow-[2px_2px_0_0_#000]"
                                  title="Agregar imagen"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          )}

                          {uploadingImageId === product.id && (
                            <div className="flex items-center gap-2 mt-3">
                              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-xs font-black text-indigo-800">
                                Subiendo... ({elapsedSeconds}s)
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 text-center">
                          <div className="font-black text-gray-600 text-xs">
                            {product.descripcion}
                          </div>
                          <div className="text-2xl font-black text-green-700">
                            ${product.precioVenta.toFixed(0)}
                          </div>
                          <div className="mt-1 flex items-center justify-center gap-1">
                            <span className="text-lg">
                              {CATEGORIES.find(
                                (c) => c.id === product.categoria
                              )?.icon || "❓"}
                            </span>
                            <span className="text-xs font-black text-gray-600 truncate max-w-[120px]">
                              {CATEGORIES.find(
                                (c) => c.id === product.categoria
                              )?.name || "Sin categoría"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="absolute inset-0 bg-white border-2 border-indigo-700 rounded-xl p-5 shadow-[6px_6px_0_0_#4f46e5] flex flex-col"
                        style={{
                          backfaceVisibility: "hidden",
                          transform: "rotateY(180deg)",
                        }}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                          <h2 className="text-lg font-black text-gray-800">
                            {product.descripcion}
                          </h2>
                          <span className="text-sm font-bold text-indigo-800 bg-indigo-100 px-2 py-1 rounded border border-indigo-400">
                            #{product.codigo}
                          </span>
                        </div>

                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm flex-grow overflow-y-auto">
                          {[
                            {
                              label: "Proveedor",
                              value: product.proveedor || "N/A",
                            },
                            { label: "Unidad", value: product.unidadMedida },
                            {
                              label: "Costo",
                              value: `$${product.precioUnitario?.toFixed(2)}`,
                            },
                            {
                              label: "Precio + IVA",
                              value: `$${product.precioConIva?.toFixed(2)}`,
                            },
                            {
                              label: "Venta",
                              value: `$${product.precioVenta.toFixed(0)}`,
                            },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <dt className="font-black text-gray-600 text-xs uppercase tracking-wider">
                                {label}
                              </dt>
                              <dd className="font-bold text-gray-800">
                                {value}
                              </dd>
                            </div>
                          ))}
                          <div>
                            <dt className="font-black text-gray-600 text-xs uppercase tracking-wider">
                              Categoría
                            </dt>
                            <dd className="font-bold text-gray-800 flex items-center gap-1">
                              <span>
                                {CATEGORIES.find(
                                  (c) => c.id === product.categoria
                                )?.icon || "?"}
                              </span>
                              {CATEGORIES.find(
                                (c) => c.id === product.categoria
                              )?.name || "Sin categoría"}
                            </dd>
                          </div>
                        </dl>

                        <div className="flex justify-end mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(product);
                            }}
                            className="px-4 py-1.5 font-black bg-blue-600 text-white rounded border-2 border-black shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-y-0.5 transition-all text-sm"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {notification && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div
            className={`border-4 rounded-xl px-6 py-3 font-black text-center shadow-[6px_6px_0_0_rgba(0,0,0,1)] ${
              notification.type === "success"
                ? "bg-green-200 border-green-800 text-green-900"
                : "bg-red-200 border-red-800 text-red-900"
            }`}
          >
            {notification.message}
          </div>
        </div>
      )}

      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
          onClick={closeImageModal}
        >
          <div
            id="image-modal-content"
            className="relative bg-white rounded-xl p-4 max-w-3xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeImageModal}
              className="absolute top-2 right-2 w-8 h-8 font-black bg-gray-700 text-white rounded-full border-2 border-black shadow-[2px_2px_0_0_#000]"
            >
              ✕
            </button>

            <img
              src={selectedImage}
              alt="Vista ampliada"
              className="max-w-full max-h-[70vh] object-contain mx-auto rounded"
            />

            <div className="mt-4 text-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const product = allProducts.find(
                    (p) => p.imagenUrl === selectedImage
                  );
                  if (product) {
                    takePhotoAndUpdateImage(product.id);
                    closeImageModal();
                  }
                }}
                className="px-4 py-2 font-black bg-indigo-700 text-white rounded border-2 border-black shadow-[3px_3px_0_0_#000] hover:shadow-none hover:translate-y-0.5"
              >
                Editar imagen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewProducts;
