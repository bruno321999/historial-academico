/**
 * idb.js - Librería de utilidad para IndexedDB
 * Este archivo actúa como un puente entre la API nativa de IndexedDB y el uso de Promesas.
 */

// --- Utilidades de comprobación de tipos ---
const is = (type, val) => typeof val === type;
const instanceOf = (type, val) => val instanceof type;
const objType = val => Object.prototype.toString.call(val) === '[object Object]';
const isFunction = val => is('function', val);
const isPromise = val => instanceOf(Promise, val);

/**
 * Crea una promesa "diferida". Permite controlar manualmente cuándo se resuelve 
 * o se rechaza una promesa fuera de su constructor.
 */
const deferred = () => {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

/**
 * Ejecuta la lógica de actualización (upgrade) de la base de datos.
 * Se dispara cuando la versión de la base de datos cambia.
 */
const upgradeDB = (db, oldVersion, newVersion, { upgrade, blocked }) => {
    if (upgrade) {
        try {
            upgrade(db, oldVersion, newVersion);
        } catch (err) {
            db.close();
            throw err;
        }
    }
};

/**
 * Abre una conexión con IndexedDB y devuelve una promesa.
 */
const openDB = (name, version, options = {}) => {
    const { blocked } = options;
    const { promise, resolve, reject } = deferred();
    const request = indexedDB.open(name, version);

    // Manejo de eventos nativos de IndexedDB
    request.onupgradeneeded = event => upgradeDB(request.result, event.oldVersion, version, options);
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    request.onblocked = blocked;
    return promise;
};

/**
 * Elimina una base de datos completa.
 */
const deleteDB = (name, options = {}) => {
    const { blocked } = options;
    const { promise, resolve, reject } = deferred();
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = event => reject(event.target.error);
    request.onblocked = blocked;
    return promise;
};

const closeDB = db => db.close();

// --- Manejo de Transacciones y Almacenes (Stores) ---

/** Crea una transacción nativa */
const transaction = (db, storeNames, mode) => db.transaction(storeNames, mode);

/** Accede al primer almacén de objetos de una transacción */
const store = tx => tx.objectStore(tx.objectStoreNames[0]);

/** Obtiene un elemento por su clave primaria */
const get = (store, key) => {
    const { promise, resolve, reject } = deferred();
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    return promise;
};

/** Obtiene todos los elementos de un almacén */
const getAll = store => {
    const { promise, resolve, reject } = deferred();
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    return promise;
};

/** Inserta o actualiza un registro (PUT) */
const put = (store, val, key) => {
    const { promise, resolve, reject } = deferred();
    const request = store.put(val, key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    return promise;
};

/** Elimina un registro por clave */
const del = (store, key) => {
    const { promise, resolve, reject } = deferred();
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = event => reject(event.target.error);
    return promise;
};

/** Vacía un almacén de objetos por completo */
const clear = store => {
    const { promise, resolve, reject } = deferred();
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = event => reject(event.target.error);
    return promise;
};

/** Cuenta la cantidad de registros */
const count = store => {
    const { promise, resolve, reject } = deferred();
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    return promise;
};

/** Abre un cursor para recorrer los registros uno por uno */
const cursor = (store, keyRange, mode) => {
    const { promise, resolve, reject } = deferred();
    const request = store.openCursor(keyRange, mode);
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    return promise;
};

// --- Manejo de Índices ---
const createIndex = (store, name, keyPath, options) => store.createIndex(name, keyPath, options);
const deleteIndex = (store, name) => store.deleteIndex(name);
const index = (store, name) => store.index(name);

const indexGet = (index, key) => {
    const { promise, resolve, reject } = deferred();
    const request = index.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    return promise;
};

const indexGetAll = index => {
    const { promise, resolve, reject } = deferred();
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    return promise;
};

const indexCursor = (index, keyRange, mode) => {
    const { promise, resolve, reject } = deferred();
    const request = index.openCursor(keyRange, mode);
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    return promise;
};

const indexCount = index => {
    const { promise, resolve, reject } = deferred();
    const request = index.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = event => reject(event.target.error);
    return promise;
};

// --- Funciones de "Wrapping" (Envoltorio) ---
/** * Estas funciones convierten los objetos nativos (DB, Transacción, Store) 
 * en objetos que devuelven promesas automáticamente.
 */

const wrap = (store, db, tx) => {
    const wrappedStore = {
        get: key => get(store, key),
        getAll: () => getAll(store),
        put: (val, key) => put(store, val, key),
        delete: key => del(store, key),
        clear: () => clear(store),
        count: () => count(store),
        openCursor: (keyRange, mode) => cursor(store, keyRange, mode),
        createIndex: (name, keyPath, options) => createIndex(store, name, keyPath, options),
        deleteIndex: name => deleteIndex(store, name),
        index: name => index(store, name),
    };
    wrappedStore.index = name => wrapIndex(index(store, name));
    return wrappedStore;
};

const wrapIndex = index => ({
    get: key => indexGet(index, key),
    getAll: () => indexGetAll(index),
    count: () => indexCount(index),
    openCursor: (keyRange, mode) => indexCursor(index, keyRange, mode),
});

/** Enuelve una transacción para que soporte .done y .store */
const wrapTx = (tx, db) => {
    const wrappedTx = {
        get store() { return wrap(store(tx), db, tx); },
        get objectStoreNames() { return tx.objectStoreNames; },
        get mode() { return tx.mode; },
        get db() { return db; },
        get error() { return tx.error; },
        get oncomplete() { return tx.oncomplete; },
        get onerror() { return tx.onerror; },
        get onabort() { return tx.onabort; },
        abort: () => tx.abort(),
        objectStore: name => wrap(tx.objectStore(name), db, tx),
        // Propiedad fundamental: permite hacer 'await tx.done' para saber cuando termina la transacción
        done: new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        }),
    };
    return wrappedTx;
};

/** Envuelve el objeto de la base de datos (IDBDatabase) */
const wrapDB = db => {
    const wrappedDB = {
        get name() { return db.name; },
        get version() { return db.version; },
        get objectStoreNames() { return db.objectStoreNames; },
        close: () => closeDB(db),
        transaction: (storeNames, mode) => wrapTx(transaction(db, storeNames, mode), wrappedDB),
    };
    return wrappedDB;
};

/** Función principal que se llama para abrir la DB usando el envoltorio */
const wrapOpenDB = (name, version, options) => {
    const { promise, resolve, reject } = deferred();
    openDB(name, version, options).then(db => resolve(wrapDB(db))).catch(reject);
    return promise;
};

// --- Exportación de la API moderna ---
export { wrapOpenDB as openDB, deleteDB };