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

// Función para comparar códigos como números (soporta "0001", "0123", etc.)
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

  // Estados para paginación
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

        // Ordenar por código numérico (de 0000 a 9999)
        productsData.sort((a, b) => compareCodigos(a.codigo, b.codigo));
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

  // Cálculos para paginación
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // Resetear a página 1 cuando cambie el término de búsqueda
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

  // --- Pagination Handlers ---
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
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

      // Actualizar y volver a ordenar la lista completa
      const updatedProducts = products.map((p) =>
        p.id === id ? ({ ...p, ...updatedProduct } as Product) : p
      ).sort((a, b) => compareCodigos(a.codigo, b.codigo));

      setProducts(updatedProducts);
      setEditingId(null);
      setTempProduct({});
    } catch (error) {
      console.error("Error al actualizar producto: ", error);
      alert("Error al guardar los cambios.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTempProduct((prev) => ({ ...prev, [name]: value }));
  };

  // --- NUEVA FUNCIÓN: Tomar foto y subir al producto ---
  const takePhotoAndUpdateImage = async (productId: string) => {
    setUploadingImageId(productId);

    try {
      // Crear un input file oculto
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          setUploadingImageId(null);
          return;
        }

        try {
          // Subir la imagen a Firebase Storage
          const fileName = `${Date.now()}_${productId}.jpg`;
          const storageRef = ref(storage, `product-images/${fileName}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(snapshot.ref);

          // Actualizar el producto en Firestore
          const productRef = doc(db, "products", productId);
          await updateDoc(productRef, { imagenUrl: downloadUrl });

          // Actualizar estado local y mantener orden
          const updatedProducts = products.map((p) =>
            p.id === productId ? { ...p, imagenUrl: downloadUrl } : p
          ).sort((a, b) => compareCodigos(a.codigo, b.codigo));

          setProducts(updatedProducts);

          alert("Imagen actualizada con éxito!");
        } catch (uploadError) {
          console.error("Error al subir la imagen:", uploadError);
          alert("Error al subir la imagen.");
        } finally {
          setUploadingImageId(null);
        }
      };

      // Disparar el click en el input file
      input.click();
    } catch (err) {
      console.error("Error al abrir el selector de archivos:", err);
      alert("No se pudo abrir el selector de imágenes.");
      setUploadingImageId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-indigo-700 mb-6">
          Productos
        </h1>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por nombre, código o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Cargando productos...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-gray-500">
            No se encontraron productos.
          </p>
        ) : (
          <>
            <div className="mb-4 text-center text-sm text-gray-600">
              Mostrando {indexOfFirstProduct + 1} - {Math.min(indexOfLastProduct, filteredProducts.length)} de {filteredProducts.length} productos
            </div>

            <div className="space-y-5">
              {currentProducts.map((product) => {
                const isEditing = editingId === product.id;
                const isFlipped = flippedCardId === product.id;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isEditing && handleCardClick(product.id)}
                    className={`relative ${
                      isEditing ? "cursor-default" : "cursor-pointer h-64"
                    }`}
                    style={!isEditing ? { perspective: "1000px" } : {}}
                  >
                    {isEditing ? (
                      // Modo Edición - Sin flip
                      <div className="bg-white shadow rounded-lg p-5 border border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                          <input
                            type="text"
                            name="descripcion"
                            value={tempProduct.descripcion ?? product.descripcion}
                            onChange={handleInputChange}
                            className="text-lg font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded px-2 py-1 flex-1 w-full sm:w-auto"
                          />
                          <input
                            type="text"
                            name="codigo"
                            value={tempProduct.codigo ?? product.codigo}
                            onChange={handleInputChange}
                            className="text-sm text-indigo-600 font-medium bg-indigo-50 border border-gray-300 rounded px-2 py-1 w-full sm:w-24 mt-1 sm:mt-0"
                          />
                        </div>

                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
                          <div>
                            <dt className="font-medium text-gray-500">
                              Proveedor
                            </dt>
                            <input
                              type="text"
                              name="proveedor"
                              value={tempProduct.proveedor ?? product.proveedor}
                              onChange={handleInputChange}
                              className="text-gray-800 bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full mt-1"
                            />
                          </div>
                          <div>
                            <dt className="font-medium text-gray-500">Unidad</dt>
                            <input
                              type="text"
                              name="unidadMedida"
                              value={
                                tempProduct.unidadMedida ?? product.unidadMedida
                              }
                              onChange={handleInputChange}
                              className="text-gray-800 bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full mt-1"
                            />
                          </div>
                          <div>
                            <dt className="font-medium text-gray-500">
                              Costo Unitario
                            </dt>
                            <input
                              type="number"
                              name="precioUnitario"
                              value={
                                tempProduct.precioUnitario ??
                                product.precioUnitario
                              }
                              onChange={handleInputChange}
                              className="text-gray-800 bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full mt-1"
                            />
                          </div>

                          <div>
                            <dt className="font-medium text-gray-500">
                              Precio + IVA
                            </dt>
                            <input
                              type="number"
                              name="precioConIva"
                              value={
                                tempProduct.precioConIva ?? product.precioConIva
                              }
                              onChange={handleInputChange}
                              className="text-gray-800 bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full mt-1"
                            />
                          </div>
                          <div>
                            <dt className="font-medium text-gray-500">
                              Precio de Venta
                            </dt>
                            <input
                              type="number"
                              name="precioVenta"
                              value={
                                tempProduct.precioVenta ?? product.precioVenta
                              }
                              onChange={handleInputChange}
                              className="text-xl font-bold text-green-600 bg-gray-100 border border-gray-300 rounded px-2 py-1 w-full mt-1"
                            />
                          </div>
                        </dl>

                        <div className="flex justify-end space-x-2 mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditing();
                            }}
                            className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveChanges(product.id);
                            }}
                            className="text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo Normal - Con flip
                      <div
                        className="relative w-full h-full transition-transform duration-500"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: isFlipped
                            ? "rotateY(180deg)"
                            : "rotateY(0deg)",
                        }}
                      >
                        {/* Tarjeta Frontal */}
                        <div
                          className="absolute inset-0 bg-white shadow rounded-lg p-5 border border-gray-200 flex flex-col items-center justify-center"
                          style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                          }}
                        >
                          <div className="text-center flex flex-col items-center justify-center flex-grow">
                            {product.imagenUrl ? (
                              <img
                                src={product.imagenUrl}
                                alt={`Imagen de ${product.descripcion}`}
                                className="max-h-48 w-auto mx-auto object-contain rounded-md"
                              />
                            ) : (
                              <div className="border-2 border-dashed border-gray-300 rounded-md w-32 h-32 mx-auto flex items-center justify-center text-gray-500">
                                {/* Botón "+" para agregar imagen */}
                                {!uploadingImageId && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      takePhotoAndUpdateImage(product.id);
                                    }}
                                    className="mt-4 text-2xl bg-indigo-600 hover:bg-indigo-700 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                                    title="Agregar imagen"
                                  >
                                    +
                                  </button>
                                )}
                              </div>
                            )}

                            {uploadingImageId === product.id && (
                              <p className="text-xs text-indigo-600 mt-2">
                                Subiendo imagen...
                              </p>
                            )}
                          </div>

                          <div className="mt-3">
                            <dt className="font-medium text-gray-500">
                              Precio de Venta
                            </dt>
                            <dd className="text-2xl font-bold text-green-600">
                              ${product.precioVenta.toFixed(0)}
                            </dd>
                          </div>
                        </div>

                        {/* Tarjeta Trasera */}
                        <div
                          className="absolute inset-0 bg-white shadow rounded-lg p-5 border border-gray-200 flex flex-col h-full"
                          style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                        >
                          <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-2">
                            <h2 className="text-lg font-semibold text-gray-800">
                              {product.descripcion}
                            </h2>
                            <span className="text-sm text-indigo-600 font-medium bg-indigo-50 px-2 py-1 rounded ml-2 whitespace-nowrap">
                              #{product.codigo}
                            </span>
                          </div>

                          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm flex-grow overflow-y-auto">
                            <div>
                              <dt className="font-medium text-gray-500">
                                Proveedor
                              </dt>
                              <dd className="text-gray-800">
                                {product.proveedor || "N/A"}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium text-gray-500">
                                Unidad
                              </dt>
                              <dd className="text-gray-800">
                                {product.unidadMedida}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium text-gray-500">
                                Costo Unitario
                              </dt>
                              <dd className="text-gray-800">
                                ${product.precioUnitario?.toFixed(2)}
                              </dd>
                            </div>

                            <div>
                              <dt className="font-medium text-gray-500">
                                Precio + IVA
                              </dt>
                              <dd className="text-gray-800">
                                ${product.precioConIva?.toFixed(2)}
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium text-gray-500">
                                Precio de Venta
                              </dt>
                              <dd className="text-2xl font-bold text-green-600">
                                ${product.precioVenta.toFixed(0)}
                              </dd>
                            </div>
                          </dl>

                          <div className="flex justify-end mt-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(product);
                              }}
                              className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
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

            {/* Controles de Paginación */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-md text-sm font-medium min-w-[80px] ${
                    currentPage === 1
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  Anterior
                </button>

                <div className="flex flex-wrap justify-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => goToPage(pageNumber)}
                      className={`px-3 py-2 rounded-md text-sm font-medium min-w-[36px] ${
                        currentPage === pageNumber
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-md text-sm font-medium min-w-[80px] ${
                    currentPage === totalPages
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Elementos ocultos para la cámara */}
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default ViewProducts;