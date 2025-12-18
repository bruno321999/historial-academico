import { Asignatura } from './asignatura.js';
import { Titulo } from './titulo.js';

/**
 * Clase principal que representa a un Estudiante.
 * Centraliza los datos personales y el historial académico.
 */
export class Estudiante {
    /**
     * @param {string} nombre - Nombre completo.
     * @param {string} dni - Documento de identidad (actúa como ID único).
     * @param {string} fechaNacimiento - Fecha de nacimiento del alumno.
     * @param {string} nacionalidad - País de origen.
     */
    constructor(nombre, dni, fechaNacimiento, nacionalidad) {
        this.nombre = nombre;
        this.dni = dni;
        this.fechaNacimiento = fechaNacimiento;
        this.nacionalidad = nacionalidad;
        
        // Atributos internos de gestión académica
        this.estado = "inactivo"; // Puede ser 'activo' o 'inactivo'
        this.historial = [];      // Array que almacenará objetos de tipo Asignatura
        this.titulos = [];        // Array que almacenará objetos de tipo Titulo
    }

    // --- Gestión de Estado ---

    /** Cambia el estado del alumno a activo */
    activar() { this.estado = "activo"; }

    /** Cambia el estado del alumno a inactivo */
    desactivar() { this.estado = "inactivo"; }

    /** Retorna true si el alumno está activo */
    esRegular() { return this.estado === "activo"; }

    // --- Gestión de Información Académica ---

    /**
     * Recibe un objeto Asignatura y lo añade al historial.
     * @param {Asignatura} asig 
     */
    agregarAsignatura(asig) {
        this.historial.push(asig);
    }

    /**
     * Recibe un objeto Titulo y lo añade a la lista de logros.
     * @param {Titulo} t 
     */
    agregarTitulo(t) {
        this.titulos.push(t);
    }

    // --- Cálculos y Estadísticas ---

    /**
     * Calcula el promedio de todas las notas en el historial.
     * Utiliza 'reduce' para sumar las notas y luego divide por el total.
     * @returns {string|number} Promedio con 2 decimales o 0 si no hay datos.
     */
    promedioGeneral() {
        if (this.historial.length === 0) return 0;
        const sumaTotal = this.historial.reduce((acumulado, asignatura) => acumulado + asignatura.nota, 0);
        return (sumaTotal / this.historial.length).toFixed(2);
    }

    /**
     * Filtra el historial para contar solo las materias con estado aprobada = true.
     * @returns {number}
     */
    cantidadAprobadas() {
        return this.historial.filter(asignatura => asignatura.aprobada).length;
    }

    /**
     * Filtra el historial para contar las materias con estado aprobada = false.
     * @returns {number}
     */
    cantidadDesaprobadas() {
        return this.historial.filter(asignatura => !asignatura.aprobada).length;
    }
}