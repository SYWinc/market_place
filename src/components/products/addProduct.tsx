// src/components/AddProduct.tsx
import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import * as XLSX from 'xlsx';
import { Form } from 'react-router-dom';

// Definición de categorías (misma que en ViewProducts)
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

type CategoryId = typeof CATEGORIES[number]["id"];
type FormCategory = CategoryId | '';

interface Product {
  codigo: string;
  descripcion: string;
  unidadMedida: string;
  precioUnitario: number;
  iva: string;
  precioConIva: number;
  precioVenta: number;
  proveedor: string;
  categoria: CategoryId;
}

// Tipo para el estado del formulario
interface FormProduct {
  codigo: string;
  descripcion: string;
  unidadMedida: string;
  precioUnitario: number;
  iva: string;
  precioConIva: number;
  precioVenta: number;
  proveedor: string;
  categoria: FormCategory;
}

const AddProduct: React.FC = () => {
const [newProduct, setNewProduct] = useState<FormProduct>({
  codigo: '',
  descripcion: '',
  unidadMedida: '1',
  precioUnitario: 0,
  iva: '0%',
  precioConIva: 0,
  precioVenta: 0,
  proveedor: '',
  categoria: '',
});

  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewProduct((prev) => ({
      ...prev,
      [name]: name === 'precioUnitario' || name === 'precioConIva' || name === 'precioVenta' ? parseFloat(value) || 0 : value,
    }));
  };

 const handleCreateProduct = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newProduct.descripcion.trim() || !newProduct.categoria) {
    alert("Por favor selecciona una categoría.");
    return;
  }

  // ✅ Crear objeto seguro para Firestore
  const productToSave: Product = {
    codigo: newProduct.codigo,
    descripcion: newProduct.descripcion,
    unidadMedida: newProduct.unidadMedida,
    precioUnitario: newProduct.precioUnitario,
    iva: newProduct.iva,
    precioConIva: newProduct.precioConIva,
    precioVenta: newProduct.precioVenta,
    proveedor: newProduct.proveedor,
    categoria: newProduct.categoria as CategoryId, // ✅ ahora es seguro
  };

  try {
    await addDoc(collection(db, "products"), productToSave); // ✅ usa productToSave
    setNotification({ message: 'Producto agregado con éxito', type: 'success' });
    setTimeout(() => setNotification(null), 3000);
    setNewProduct({
      codigo: '',
      descripcion: '',
      unidadMedida: '1',
      precioUnitario: 0,
      iva: '0%',
      precioConIva: 0,
      precioVenta: 0,
      proveedor: '',
      categoria: '',
    });
  } catch (error) {
    console.error("Error al agregar producto: ", error);
    setNotification({ message: 'Error al agregar el producto', type: 'error' });
    setTimeout(() => setNotification(null), 3000);
  }
};

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const productsToUpload: Product[] = jsonData.map((row: any) => ({
        codigo: String(row['CODIGO'] || row['codigo'] || row['Código'] || row['Id'] || ''),
        descripcion: String(row['DESCRIPCION DEL PRODUCTO'] || row['descripcion'] || row['Descripción'] || row['Nombre'] || ''),
        unidadMedida: String(row['UNIDAD DE MEDIDA'] || row['unidadMedida'] || row['Unidad'] || '1'),
        precioUnitario: parseFloat(row['PRECIO UNITARIO'] || row['precioUnitario'] || 0) || 0,
        iva: String(row['IVA'] || row['iva'] || '0%'),
        precioConIva: parseFloat(row['PRECIO UNITARIO + IVA'] || row['precioConIva'] || 0) || 0,
        precioVenta: parseFloat(row['PRECIO DE VENTA'] || row['precioVenta'] || 0) || 0,
        proveedor: String(row['PROVEEDOR'] || row['proveedor'] || row['Proveedor'] || ''),
        categoria: String(row['CATEGORIA'] || row['categoria'] || row['Categoría'] || 'sin-categoria') as CategoryId,
      }));

      let successCount = 0;
      let errorCount = 0;
      for (const product of productsToUpload) {
        try {
          await addDoc(collection(db, "products"), product);
          successCount++;
        } catch (uploadError) {
          console.error("Error al subir un producto:", product, uploadError);
          errorCount++;
        }
      }

      setNotification({ 
        message: `Carga completada: ${successCount} productos agregados, ${errorCount} errores.`, 
        type: 'success' 
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (error) {
      console.error("Error al leer el archivo Excel o subir a Firebase: ", error);
      setNotification({ message: 'Error al procesar el archivo Excel.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 pb-24">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-black text-indigo-700 tracking-tighter uppercase italic">
            MARKET PLACE
          </h1>
          <p className="text-gray-500 font-bold text-sm">
            GESTIÓN DE PRODUCTOS
          </p>
        </header>

        <div className="bg-white border-4 border-indigo-600 rounded-2xl p-6 shadow-[8px_8px_0_0_rgba(79,70,229,1)]">
          <h2 className="text-xl font-black text-indigo-700 mb-6 uppercase text-center">
            Agregar Producto
          </h2>

          <div className="mb-6 p-4 bg-gray-50 border-2 border-dashed border-indigo-300 rounded-xl">
            <label className="block text-sm font-black text-gray-800 mb-2 uppercase">
              Cargar productos desde Excel
            </label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="block w-full text-sm font-bold text-gray-700
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-2 file:border-black
                        file:text-sm file:font-black
                        file:bg-yellow-400 file:text-black
                        hover:file:bg-yellow-300 file:shadow-[2px_2px_0_0_rgba(0,0,0,1)]
                        active:file:shadow-none active:file:translate-x-0.5 active:file:translate-y-0.5
                        transition-all"
            />
            {isUploading && (
              <p className="text-xs font-black text-indigo-600 mt-2 animate-pulse">
                Cargando y subiendo productos...
              </p>
            )}
          </div>

          <hr className="my-4 border-2 border-indigo-200" />

          <form onSubmit={handleCreateProduct} className="space-y-4 font-bold text-sm">
            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                Código
              </label>
              <input
                type="text"
                name="codigo"
                value={newProduct.codigo}
                onChange={handleChange}
                className="w-full p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                Descripción del Producto
              </label>
              <textarea
                name="descripcion"
                value={newProduct.descripcion}
                onChange={handleChange}
                required
                className="w-full p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                UM
              </label>
              <input
                type="text"
                name="unidadMedida"
                value={newProduct.unidadMedida}
                onChange={handleChange}
                className="w-full p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                Costo Unitario
              </label>
              <input
                type="number"
                name="precioUnitario"
                value={newProduct.precioUnitario || ''}
                onChange={handleChange}
                step="0.01"
                className="w-full p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                Precio con IVA
              </label>
              <input
                type="number"
                name="precioConIva"
                value={newProduct.precioConIva || ''}
                onChange={handleChange}
                step="0.01"
                className="w-full p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                Precio de Venta
              </label>
              <input
                type="number"
                name="precioVenta"
                value={newProduct.precioVenta || ''}
                onChange={handleChange}
                step="0.01"
                className="w-full p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                Proveedor
              </label>
              <input
                type="text"
                name="proveedor"
                value={newProduct.proveedor}
                onChange={handleChange}
                className="w-full p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none"
              />
            </div>

            {/* ✅ Campo de categoría */}
            <div>
              <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                Categoría
              </label>
              <select
                name="categoria"
                value={newProduct.categoria}
                onChange={handleChange}
                required
                className="w-full p-3 border-2 border-indigo-200 rounded-xl focus:border-indigo-500 outline-none bg-white"
              >
                <option value="">— Selecciona una categoría —</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-black text-white font-black py-3 rounded-xl shadow-[4px_4px_0_0_rgba(0,0,0,1)] 
                          active:shadow-none active:translate-x-1 active:translate-y-1 transition-all uppercase"
              >
                + Agregar Producto
              </button>
            </div>
          </form>
        </div>
      </div>

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

export default AddProduct;