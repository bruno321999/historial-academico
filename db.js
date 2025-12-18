import { openDB } from './idb.js';

const DB_NAME = 'HistorialAcademicoDB';
const DB_VERSION = 1;
const STORE_NAME = 'estudiantes';

let dbPromise;

/**
 * Inicializa la base de datos (IndexedDB) y asegura que el almacén de objetos exista.
 * @returns {Promise<IDBDatabase>} Una promesa que resuelve con el objeto de la base de datos.
 */
function initDB() {
    // Si ya existe la promesa de la DB, la devuelve. Esto asegura una sola conexión.
    if (dbPromise) return dbPromise; 

    dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Este bloque solo se ejecuta la primera vez o cuando se cambia DB_VERSION.
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // almacén de objetos 'estudiantes'
                db.createObjectStore(STORE_NAME, { keyPath: 'dni' });
            }
        },
    });
    return dbPromise;
}

// FUNCIONES CRUD ASÍNCRONAS

/**
 * Carga todos los estudiantes desde la base de datos.
 * Usando la transacción explícita y await tx.store.getAll()
 * @returns {Promise<Array<Object>>} Una promesa que resuelve con un array de estudiantes.
 */
export async function cargarDatosDB() {
    try {
        const db = await initDB();
        // 1. Abrir una transacción de solo lectura
        const tx = db.transaction(STORE_NAME, 'readonly');
        // 2. Obtener todos los objetos del almacén
        const all = await tx.store.getAll(); 
        // 3. Esperar a que la transacción termine
        await tx.done; 
        return all;
    } catch (error) {
        console.error("Error al cargar datos de IndexedDB:", error);
        return []; // Devuelve un array vacío en caso de error
    }
}

/**
 * Guarda o actualiza un estudiante en la base de datos.
 * @param {Object} estudiante - El objeto estudiante a guardar (debe tener la clave 'dni').
 * @returns {Promise<void>}
 */
export async function guardarEstudianteDB(estudiante) {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await tx.store.put(estudiante);
        await tx.done; 
    } catch (error) {
        console.error("Error al guardar estudiante en IndexedDB:", error);
    }
}

/**
 * Elimina un estudiante de la base de datos por su DNI.
 * @param {string} dni - El DNI del estudiante a eliminar.
 * @returns {Promise<void>}
 */
export async function eliminarEstudianteDB(dni) {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        await tx.store.delete(dni);
        await tx.done;
    } catch (error) {
        console.error("Error al eliminar estudiante de IndexedDB:", error);
    }
}