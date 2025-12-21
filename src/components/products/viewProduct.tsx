// src/components/ViewProducts.tsx
import React, { useEffect, useState, useRef } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
}

const compareCodigos = (a: string, b: string): number => {
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);
  return numA - numB;
};

const ViewProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempProduct, setTempProduct] = useState<Partial<Product>>({});
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 6;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storage = getStorage();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsData: Product[] = [];
        querySnapshot.forEach((doc) => {
          productsData.push({
            id: doc.id,
            ...(doc.data() as Omit<Product, "id">),
          });
        });
        productsData.sort((a, b) => compareCodigos(a.codigo, b.codigo)).reverse();
        setProducts(productsData);
      } catch (error) {
        console.error("Error al obtener productos: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      product.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const saveChanges = async (id: string) => {
    if (!tempProduct.descripcion || !tempProduct.codigo) return;
    try {
      const updatedProduct = {
        ...tempProduct,
        precioUnitario: parseFloat(tempProduct.precioUnitario as any) || 0,
        precioConIva: parseFloat(tempProduct.precioConIva as any) || 0,
        precioVenta: parseFloat(tempProduct.precioVenta as any) || 0,
      };
      const productRef = doc(db, "products", id);
      await updateDoc(productRef, updatedProduct);
      const updatedProducts = products
        .map((p) => (p.id === id ? ({ ...p, ...updatedProduct } as Product) : p))
        .sort((a, b) => compareCodigos(a.codigo, b.codigo));
      setProducts(updatedProducts);
      setEditingId(null);
      setTempProduct({});
    } catch (error) {
      console.error("Error al actualizar producto: ", error);
      alert("Error al guardar los cambios.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          const updatedProducts = products
            .map((p) => (p.id === productId ? { ...p, imagenUrl: downloadUrl } : p))
            .sort((a, b) => compareCodigos(a.codigo, b.codigo));
          setProducts(updatedProducts);
          setNotification({ message: "Imagen actualizada con éxito!", type: "success" });
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

  // ⏱️ Hook para mostrar contador de carga si es necesario (opcional)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-8 px-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-center text-indigo-800 mb-6 tracking-tight shadow-[3px_3px_0_0_#4f46e5]">
          PRODUCTOS
        </h1>

        {/* Barra de búsqueda retro */}
        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre, código o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pr-12 font-bold border-2 border-indigo-700 rounded-lg shadow-[4px_4px_0_0_#4f46e5] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-800 bg-white"
          />
        </div>

        {loading ? (
          <p className="text-center font-bold text-gray-600">Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center font-bold text-gray-600">No se encontraron productos.</p>
        ) : (
          <>
            <div className="mb-4 text-center text-sm font-bold text-gray-700">
              Mostrando {indexOfFirstProduct + 1}–
              {Math.min(indexOfLastProduct, filteredProducts.length)} de {filteredProducts.length} productos
            </div>

            <div className="space-y-6">
              {currentProducts.map((product) => {
                const isEditing = editingId === product.id;
                const isFlipped = flippedCardId === product.id;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isEditing && handleCardClick(product.id)}
                    className={`relative transition-transform duration-300 ${
                      isEditing ? "cursor-default" : "cursor-pointer hover:scale-[1.02]"
                    }`}
                    style={!isEditing ? { perspective: "1000px" } : {}}
                  >
                    {isEditing ? (
                      <div className="bg-white border-2 border-indigo-700 rounded-xl p-5 shadow-[6px_6px_0_0_#4f46e5]">
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
                              <dt className="font-black text-gray-600 text-xs uppercase tracking-wider">{label}</dt>
                              <input
                                type={key.includes("precio") ? "number" : "text"}
                                name={key}
                                value={tempProduct[key as keyof Product] ?? product[key as keyof Product]}
                                onChange={handleInputChange}
                                className="mt-1 w-full font-bold border-2 border-gray-400 rounded px-2 py-1.5 bg-gray-50"
                              />
                            </div>
                          ))}
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
                          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                        }}
                      >
                        {/* Frontal */}
                        <div
                          className="absolute inset-0 bg-white border-2 border-indigo-700 rounded-xl p-5 shadow-[6px_6px_0_0_#4f46e5] flex flex-col items-center justify-center"
                          style={{ backfaceVisibility: "hidden" }}
                        >
                          <div className="flex flex-col items-center justify-center flex-grow">
                            {product.imagenUrl ? (
                              <img
                                src={product.imagenUrl}
                                alt={`Imagen de ${product.descripcion}`}
                                className="max-h-32 w-auto object-contain rounded"
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
                            <div className="font-black text-gray-600 text-xs">{product.descripcion}</div>
                            <div className="text-2xl font-black text-green-700">${product.precioVenta.toFixed(0)}</div>
                          </div>
                        </div>

                        {/* Trasera */}
                        <div
                          className="absolute inset-0 bg-white border-2 border-indigo-700 rounded-xl p-5 shadow-[6px_6px_0_0_#4f46e5] flex flex-col"
                          style={{
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                            <h2 className="text-lg font-black text-gray-800">{product.descripcion}</h2>
                            <span className="text-sm font-bold text-indigo-800 bg-indigo-100 px-2 py-1 rounded border border-indigo-400">
                              #{product.codigo}
                            </span>
                          </div>

                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm flex-grow overflow-y-auto">
                            {[
                              { label: "Proveedor", value: product.proveedor || "N/A" },
                              { label: "Unidad", value: product.unidadMedida },
                              { label: "Costo", value: `$${product.precioUnitario?.toFixed(2)}` },
                              { label: "Precio + IVA", value: `$${product.precioConIva?.toFixed(2)}` },
                              { label: "Venta", value: `$${product.precioVenta.toFixed(0)}` },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <dt className="font-black text-gray-600 text-xs uppercase tracking-wider">{label}</dt>
                                <dd className="font-bold text-gray-800">{value}</dd>
                              </div>
                            ))}
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

            {/* Paginación retro */}
            {totalPages > 1 && (
              <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-5 py-2.5 font-black min-w-[100px] rounded-lg border-2 border-black shadow-[4px_4px_0_0_#000] transition-all ${
                    currentPage === 1
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 text-white hover:shadow-none hover:translate-y-1"
                  }`}
                >
                  Anterior
                </button>

                <div className="flex flex-wrap justify-center gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => goToPage(pageNumber)}
                      className={`w-10 h-10 font-black rounded border-2 border-black ${
                        currentPage === pageNumber
                          ? "bg-indigo-700 text-white shadow-[3px_3px_0_0_#000]"
                          : "bg-white text-gray-800 shadow-[2px_2px_0_0_#999] hover:shadow-none hover:translate-y-0.5"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-5 py-2.5 font-black min-w-[100px] rounded-lg border-2 border-black shadow-[4px_4px_0_0_#000] transition-all ${
                    currentPage === totalPages
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 text-white hover:shadow-none hover:translate-y-1"
                  }`}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Elementos ocultos */}
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Notificación retro */}
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
    </div>
  );
};

export default ViewProducts;