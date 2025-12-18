/**
 * Clase que representa una materia o asignatura académica.
 */
export class Asignatura {
    /**
     * @param {string} nombre - El nombre de la asignatura (ej: "Matemática").
     * @param {number} nota - La calificación numérica obtenida.
     * @param {boolean} aprobada - Estado de la materia (true si está aprobada, false si no).
     */
    constructor(nombre, nota, aprobada) {
        this.nombre = nombre;
        this.nota = nota;
        this.aprobada = aprobada; // Indica si el alumno superó la materia
    }
}