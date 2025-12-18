/**
 * Clase que representa un título, diploma o certificación obtenida.
 */
export class Titulo {
    /**
     * @param {string} nombreTitulo - Nombre oficial del título (ej: "Bachiller").
     * @param {string} fechaObtencion - Fecha en la que se recibió el título.
     * @param {string|null} mencionEspecial - Distinciones adicionales (ej: "Cum Laude"), opcional.
     */
    constructor(nombreTitulo, fechaObtencion, mencionEspecial = null) {
        this.nombreTitulo = nombreTitulo;
        this.fechaObtencion = fechaObtencion;
        this.mencionEspecial = mencionEspecial; // Por defecto es null si no tiene mención
    }
}