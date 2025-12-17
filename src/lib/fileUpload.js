import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class FileUpload {
    constructor() {
        this.baseDir = path.join(process.cwd(), 'public', 'uploads');
        this.logosDir = path.join(this.baseDir, 'logos', 'colegios');
        this.tempDir = path.join(this.baseDir, 'logos', 'temp');
    }

    // Inicializar directorios
    async init() {
        try {
            await fs.mkdir(this.logosDir, { recursive: true });
            await fs.mkdir(this.tempDir, { recursive: true });
            //console.log('✅ Directorios de upload creados');
        } catch (error) {
            console.error('❌ Error creando directorios:', error);
        }
    }

    // Validar imagen
    validateImage(base64String, maxSizeMB = 2) {
        // Verificar si es base64 válido
        if (!base64String || typeof base64String !== 'string') {
            return { valid: false, error: 'Base64 inválido' };
        }

        // Verificar tamaño (aproximado en bytes)
        const sizeInBytes = (base64String.length * 3) / 4;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        
        if (sizeInBytes > maxSizeBytes) {
            return { 
                valid: false, 
                error: `La imagen excede el tamaño máximo de ${maxSizeMB}MB` 
            };
        }

        // Extraer tipo MIME
        const mimeMatch = base64String.match(/^data:(image\/\w+);base64,/);
        if (!mimeMatch) {
            return { valid: false, error: 'Formato de imagen no válido' };
        }

        const mimeType = mimeMatch[1];
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        
        if (!allowedMimeTypes.includes(mimeType)) {
            return { 
                valid: false, 
                error: 'Tipo de imagen no permitido. Use JPEG, PNG, GIF, WebP o SVG' 
            };
        }

        return { 
            valid: true, 
            mimeType, 
            extension: this.getExtensionFromMime(mimeType) 
        };
    }

    // Obtener extensión del MIME type
    getExtensionFromMime(mimeType) {
        const extensions = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
            'image/svg+xml': 'svg'
        };
        return extensions[mimeType] || 'jpg';
    }

    // Guardar imagen desde Base64
    async saveBase64Image(base64String, filename = null) {
        try {
            // Validar imagen
            const validation = this.validateImage(base64String);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Extraer datos Base64
            const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');

            // Generar nombre de archivo único
            const extension = validation.extension;
            const uniqueId = uuidv4().substring(0, 8);
            const finalFilename = filename 
                ? `${path.parse(filename).name}-${uniqueId}.${extension}`
                : `${uniqueId}-${Date.now()}.${extension}`;

            // Sanitizar nombre de archivo
            const safeFilename = finalFilename
                .toLowerCase()
                .replace(/[^a-z0-9.-]/g, '-')
                .replace(/-+/g, '-');

            // Ruta completa
            const filePath = path.join(this.logosDir, safeFilename);

            // Guardar archivo
            await fs.writeFile(filePath, buffer);

            //console.log(`✅ Imagen guardada: ${safeFilename}`);

            return {
                success: true,
                filename: safeFilename,
                filePath: filePath,
                publicUrl: `/uploads/logos/colegios/${safeFilename}`,
                mimeType: validation.mimeType,
                size: buffer.length
            };

        } catch (error) {
            console.error('❌ Error guardando imagen:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Eliminar imagen
    async deleteImage(filename) {
        try {
            const filePath = path.join(this.logosDir, filename);
            await fs.unlink(filePath);
            //console.log(`🗑️ Imagen eliminada: ${filename}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error eliminando imagen:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener lista de imágenes
    async listImages() {
        try {
            const files = await fs.readdir(this.logosDir);
            return files.filter(file => 
                ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
                    .some(ext => file.toLowerCase().endsWith(ext))
            );
        } catch (error) {
            console.error('❌ Error listando imágenes:', error);
            return [];
        }
    }
}

// Instancia singleton
const fileUpload = new FileUpload();

export default fileUpload;