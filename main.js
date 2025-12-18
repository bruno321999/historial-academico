import { Estudiante } from './estudiante.js';
import { Asignatura } from './asignatura.js';
import { Titulo } from './titulo.js';
import { cargarDatosDB, guardarEstudianteDB, eliminarEstudianteDB } from './db.js';

// ==========================================
// 1. VARIABLES DE ESTADO Y REFERENCIAS AL DOM
// ==========================================
let estudiantes = [];           // Array global que contiene las instancias de Estudiante
let estudianteSeleccionado = null; // Estudiante con el que se está trabajando actualmente

// Variables para los elementos de la interfaz (se inicializan en DOMContentLoaded)
let vistaProfesor, vistaEstudiante, seleccionRol;
let btnProfesor, btnEstudiante;
let formularioNota, historialDiv;
let formularioTitulo, titulosDiv, docDiv;
let formularioEstudiante, listaEstudiantesDiv;
let selectEstudiante, listaEstudiantesDivEstudiante, estudianteActivoDiv;

// ==========================================
// 2. PERSISTENCIA DE DATOS (INDEXEDDB)
// ==========================================

/**
 * Recorre el array local y guarda cada estudiante en la base de datos.
 */
async function guardarDatos() {
    try {
        for (const estudiante of estudiantes) {
            // Convertimos la instancia de clase a un objeto plano para guardarlo en IDB
            const objetoPlano = JSON.parse(JSON.stringify(estudiante));
            await guardarEstudianteDB(objetoPlano);
        }
    } catch (error) {
        console.error("Error al guardar todo el array de datos:", error);
    }
}

/**
 * Recupera los datos de IndexedDB y los "rehidrata".
 * Rehidratar significa convertir objetos JSON simples de nuevo en instancias de clase
 * para poder usar sus métodos (como promedioGeneral()).
 */
async function cargarDatos() {
    const data = await cargarDatosDB();
    if (!data || data.length === 0) return [];
    
    return data.map(obj => {
        // Creamos la instancia principal
        const e = new Estudiante(obj.nombre, obj.dni, obj.fechaNacimiento, obj.nacionalidad);
        e.estado = obj.estado;
        
        // Rehidratamos el historial de Asignaturas
        e.historial = (obj.historial || []).map(a => {
            const esAprobada = typeof a.aprobada === 'string' ? a.aprobada === "true" : !!a.aprobada;
            return new Asignatura(a.nombre, a.nota, esAprobada);
        });
        
        // Rehidratamos la lista de Títulos
        e.titulos = (obj.titulos || []).map(t => new Titulo(t.nombreTitulo, t.fechaObtencion, t.mencionEspecial));
        return e;
    });
}

// ==========================================
// 3. FUNCIONES DE RENDERIZADO (VISTAS)
// ==========================================

/** Actualiza el recuadro que indica qué estudiante está gestionando el profesor */
function mostrarEstudianteActivo() {
    if (!estudianteActivoDiv) return;
    estudianteActivoDiv.innerHTML = estudianteSeleccionado 
        ? `<p><strong>Estudiante seleccionado:</strong> ${estudianteSeleccionado.nombre} (${estudianteSeleccionado.dni})</p>`
        : "<p>Ningún estudiante seleccionado.</p>";
}

/** Dibuja la lista de estudiantes en el panel del Profesor */
function mostrarListaEstudiantes() {
    listaEstudiantesDiv.innerHTML = estudiantes.length === 0 
        ? "<p>No hay estudiantes registrados.</p>" 
        : "";

    estudiantes.forEach((e, i) => {
        listaEstudiantesDiv.innerHTML += `
            <p>
                <strong>${e.nombre}</strong> (${e.dni}) 
                <button class="btn-ver" onclick="seleccionarEstudiante(${i})">Ver/Gestionar</button>
                <button class="btn-editar" onclick="editarEstudiante(${i})">Editar Info</button>
                <button class="btn-eliminar" onclick="eliminarEstudianteIndex(${i})">Eliminar</button>
            </p>`;
    });
}

/** Dibuja la lista de "compañeros" en la vista del Estudiante */
function mostrarListaEstudiantesEstudiante() {
    const seccionCompaneros = document.getElementById('seccion-lista-estudiantes-vista-estudiante');
    if (!seccionCompaneros || !listaEstudiantesDivEstudiante) return;

    // Solo se muestra si estamos en la vista de estudiante y no de profesor
    if (vistaEstudiante.style.display === "block" && vistaProfesor.style.display === "none") {
        seccionCompaneros.style.display = "block";
    } else {
        seccionCompaneros.style.display = "none";
        return; 
    }

    listaEstudiantesDivEstudiante.innerHTML = estudiantes.length === 0 
        ? "<p>No hay estudiantes registrados.</p>" 
        : "";

    estudiantes.forEach(e => {
        listaEstudiantesDivEstudiante.innerHTML += `
            <p class="documentacion">
                <strong>${e.nombre}</strong> (${e.dni}) | Nacionalidad: ${e.nacionalidad} | Estado: ${e.esRegular() ? "Activo" : "Inactivo"}
            </p>`;
    });
}

/** Llena el menú desplegable (Select) con los DNI de los alumnos registrados */
function cargarSelectEstudiantes() {
    if (!selectEstudiante) return;
    selectEstudiante.innerHTML = '<option value="">--- Seleccione su DNI ---</option>';
    estudiantes.forEach(e => {
        const option = document.createElement('option');
        option.value = e.dni;
        option.textContent = `${e.nombre} (${e.dni})`;
        selectEstudiante.appendChild(option);
    });
}

/** Muestra las materias, notas y promedios del alumno seleccionado */
function mostrarHistorial() {
    historialDiv.innerHTML = !estudianteSeleccionado 
        ? "<p>Seleccione un estudiante para ver el historial.</p>" 
        : (estudianteSeleccionado.historial.length === 0 ? "<p>No hay asignaturas registradas.</p>" : "");

    if (estudianteSeleccionado && estudianteSeleccionado.historial.length > 0) {
        estudianteSeleccionado.historial.forEach((a, i) => {
            const clase = a.aprobada ? "aprobada" : "desaprobada";
            const btnEditar = vistaProfesor.style.display === "block"
                ? `<button class="btn-editar" onclick="editarNota(${i})">Editar</button>` : "";
            historialDiv.innerHTML += `<p class="${clase}">${a.nombre} | Nota: ${a.nota} | ${a.aprobada ? "Aprobada" : "Desaprobada"} ${btnEditar}</p>`;
        });

        // Usamos los métodos de la clase Estudiante para los cálculos
        historialDiv.innerHTML += `
            <hr>
            <p><strong>Promedio General:</strong> ${estudianteSeleccionado.promedioGeneral()}</p>
            <p><strong>Aprobadas:</strong> ${estudianteSeleccionado.cantidadAprobadas()}</p>
            <p><strong>Desaprobadas:</strong> ${estudianteSeleccionado.cantidadDesaprobadas()}</p>`;
    }
}

/** Muestra la información personal del estudiante */
function mostrarDocumentacion() {
    docDiv.innerHTML = !estudianteSeleccionado 
        ? "<p>Seleccione un estudiante.</p>" 
        : `
            <p><strong>Nombre:</strong> ${estudianteSeleccionado.nombre}</p>
            <p><strong>DNI:</strong> ${estudianteSeleccionado.dni}</p>
            <p><strong>Nacionalidad:</strong> ${estudianteSeleccionado.nacionalidad}</p>
            <p><strong>Estado:</strong> ${estudianteSeleccionado.esRegular() ? "Activo" : "Inactivo"}</p>`;
}

/** Muestra los títulos obtenidos por el estudiante */
function mostrarTitulos() {
    titulosDiv.innerHTML = !estudianteSeleccionado 
        ? "<p>Seleccione un estudiante.</p>" 
        : (estudianteSeleccionado.titulos.length === 0 ? "<p>No se registran títulos.</p>" : "");

    if (estudianteSeleccionado) {
        estudianteSeleccionado.titulos.forEach(t => {
            titulosDiv.innerHTML += `<p>${t.nombreTitulo} | Fecha: ${t.fechaObtencion} ${t.mencionEspecial ? "| Mención: " + t.mencionEspecial : ""}</p>`;
        });
    }
}

// ==========================================
// 4. GESTIÓN GLOBAL (WINDOW)
// ==========================================
// Estas funciones se asignan a 'window' para que el HTML pueda verlas (onclick).

/** Selecciona un estudiante del array para mostrar su información */
window.seleccionarEstudiante = function (i) {
    estudianteSeleccionado = estudiantes[i];
    mostrarHistorial();
    mostrarDocumentacion();
    mostrarTitulos();
    mostrarEstudianteActivo();
};

/** Abre prompts para editar la información básica de un alumno */
window.editarEstudiante = async function (i) {
    const e = estudiantes[i];
    const nuevoNombre = prompt("Editar nombre:", e.nombre) || e.nombre;
    const nuevoDni = prompt("Editar DNI:", e.dni) || e.dni;

    // Validación de DNI duplicado
    if (nuevoDni !== e.dni && estudiantes.some(est => est.dni === nuevoDni)) {
        alert("¡Error! Ya existe otro estudiante con ese DNI.");
        return;
    }

    if (nuevoDni !== e.dni) {
        await eliminarEstudianteDB(e.dni); // Borramos el registro viejo en DB
        e.dni = nuevoDni;
    }

    e.nombre = nuevoNombre;
    e.fechaNacimiento = prompt("Editar fecha:", e.fechaNacimiento) || e.fechaNacimiento;
    e.nacionalidad = prompt("Editar nacionalidad:", e.nacionalidad) || e.nacionalidad;

    const nuevoEstado = prompt(`Editar estado (activo/inactivo). actual: ${e.estado}`)?.toLowerCase();
    if (nuevoEstado === "activo") e.activar();
    else if (nuevoEstado === "inactivo") e.desactivar();

    // Guardar cambios en DB y refrescar UI
    await guardarEstudianteDB(JSON.parse(JSON.stringify(e)));
    estudiantes = await cargarDatos(); 
    mostrarListaEstudiantes();
    cargarSelectEstudiantes();
};

/** Elimina un estudiante tanto del array como de IndexedDB */
window.eliminarEstudianteIndex = async function (i) {
    if (confirm(`¿Seguro que desea eliminar a ${estudiantes[i].nombre}?`)) {
        await eliminarEstudianteDB(estudiantes[i].dni);
        estudiantes.splice(i, 1);
        estudianteSeleccionado = null;
        mostrarListaEstudiantes();
        cargarSelectEstudiantes();
    }
};

/** Permite al profesor corregir una nota específica */
window.editarNota = async function (i) {
    if (!estudianteSeleccionado) return;
    const asignatura = estudianteSeleccionado.historial[i];
    const nuevaNota = prompt(`Editar nota de ${asignatura.nombre}:`, asignatura.nota);
    
    if (nuevaNota !== null && !isNaN(parseFloat(nuevaNota))) {
        asignatura.nota = parseFloat(nuevaNota);
        asignatura.aprobada = asignatura.nota >= 6; 
        await guardarEstudianteDB(JSON.parse(JSON.stringify(estudianteSeleccionado)));
        mostrarHistorial();
    }
};

// ==========================================
// 5. INICIALIZACIÓN (DOMContentLoaded)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // A. Selección de elementos del DOM
    vistaProfesor = document.getElementById('vista-profesor');
    vistaEstudiante = document.getElementById('vista-estudiante');
    seleccionRol = document.getElementById('seleccion-rol');
    btnProfesor = document.getElementById('btn-profesor');
    btnEstudiante = document.getElementById('btn-estudiante');
    estudianteActivoDiv = document.getElementById('estudiante-activo-profesor');
    formularioNota = document.getElementById('formulario-nota');
    historialDiv = document.getElementById('historial-estudiante');
    formularioTitulo = document.getElementById('formulario-titulo');
    titulosDiv = document.getElementById('titulos-estudiante');
    docDiv = document.getElementById('documentacion-estudiante');
    formularioEstudiante = document.getElementById('formulario-estudiante');
    listaEstudiantesDiv = document.getElementById('lista-estudiantes');
    selectEstudiante = document.getElementById('select-estudiante');
    listaEstudiantesDivEstudiante = document.getElementById('lista-estudiantes-vista-estudiante');
    
    const selectorEstudianteSeccion = document.getElementById('selector-estudiante-seccion');
    const seccionListaEstudiantesVistaEstudiante = document.getElementById('seccion-lista-estudiantes-vista-estudiante');

    // B. Carga inicial de datos desde IndexedDB
    estudiantes = await cargarDatos(); 

    // C. Renderizado inicial
    mostrarListaEstudiantes();
    cargarSelectEstudiantes();
    mostrarListaEstudiantesEstudiante();
    
    // D. Eventos de Cambio de Rol
    btnProfesor.addEventListener('click', () => {
        seleccionRol.style.display = "none";
        vistaProfesor.style.display = "block";
        vistaEstudiante.style.display = "block"; 
        if (selectorEstudianteSeccion) selectorEstudianteSeccion.style.display = "none";
        if (seccionListaEstudiantesVistaEstudiante) seccionListaEstudiantesVistaEstudiante.style.display = "none";
        estudianteSeleccionado = null;
        mostrarEstudianteActivo();
    });
    
    btnEstudiante.addEventListener('click', () => {
        seleccionRol.style.display = "none";
        vistaProfesor.style.display = "none";
        vistaEstudiante.style.display = "block";
        if (selectorEstudianteSeccion) selectorEstudianteSeccion.style.display = "block";
        if (seccionListaEstudiantesVistaEstudiante) seccionListaEstudiantesVistaEstudiante.style.display = "block";
        estudianteSeleccionado = null;
        cargarSelectEstudiantes();
    });
    
    // E. Eventos de Formularios
    selectEstudiante.addEventListener('change', (e) => {
        const dni = e.target.value;
        estudianteSeleccionado = estudiantes.find(est => est.dni === dni) || null;
        mostrarHistorial(); mostrarDocumentacion(); mostrarTitulos();
    });

    // Alta de Estudiante
    formularioEstudiante.addEventListener('submit', async e => {
        e.preventDefault();
        const nombre = document.getElementById('nombre-estudiante').value;
        const dni = document.getElementById('dni-estudiante').value;
        const fecha = document.getElementById('fecha-estudiante').value;
        const nac = document.getElementById('nacionalidad-estudiante').value;
        
        if (estudiantes.some(est => est.dni === dni)) {
            alert("¡Error! DNI ya registrado."); return;
        }

        const nuevo = new Estudiante(nombre, dni, fecha, nac);
        nuevo.activar();
        estudiantes.push(nuevo);
        await guardarEstudianteDB(JSON.parse(JSON.stringify(nuevo)));
        
        formularioEstudiante.reset();
        mostrarListaEstudiantes(); cargarSelectEstudiantes(); mostrarListaEstudiantesEstudiante();
    });

    // Agregar Nota
    formularioNota.addEventListener('submit', async e => {
        e.preventDefault();
        if (!estudianteSeleccionado) return;
        const nombre = document.getElementById('nombre-asignatura').value;
        const nota = parseFloat(document.getElementById('nota').value);
        const aprobada = document.getElementById('estado').value === "true"; 
        
        estudianteSeleccionado.agregarAsignatura(new Asignatura(nombre, nota, aprobada));
        await guardarEstudianteDB(JSON.parse(JSON.stringify(estudianteSeleccionado)));
        mostrarHistorial(); formularioNota.reset();
    });
    
    // Agregar Título
    formularioTitulo.addEventListener('submit', async e => {
        e.preventDefault();
        if (!estudianteSeleccionado) return;
        const nombre = document.getElementById('nombre-titulo').value;
        const fecha = document.getElementById('fecha-titulo').value;
        const mencion = document.getElementById('mencion-titulo').value || null;

        estudianteSeleccionado.agregarTitulo(new Titulo(nombre, fecha, mencion));
        await guardarEstudianteDB(JSON.parse(JSON.stringify(estudianteSeleccionado)));
        mostrarTitulos(); formularioTitulo.reset();
    });
});