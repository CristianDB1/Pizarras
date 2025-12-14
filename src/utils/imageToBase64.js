export const imageUrlToBase64 = async (imageUrl) => {
  try {
    // Si ya es base64, retornar directamente
    if (imageUrl && (imageUrl.startsWith('data:image') || imageUrl.startsWith('base64,'))) {
      return imageUrl.startsWith('base64,') ? `data:image/png;${imageUrl}` : imageUrl;
    }

    // Si es una URL vacía o inválida
    if (!imageUrl || imageUrl.trim() === '') {
      console.warn('⚠️ URL de imagen vacía');
      return null;
    }

    // Determinar URL completa
    let fullUrl = imageUrl;
    
    // Si es ruta relativa, hacerla absoluta
    if (imageUrl.startsWith('/')) {
      fullUrl = `${window.location.origin}${imageUrl}`;
    } else if (!imageUrl.startsWith('http')) {
      // Si no empieza con http ni con /, asumir que es relativa a public/
      fullUrl = `${window.location.origin}/${imageUrl}`;
    }

    console.log(`📤 Convirtiendo imagen: ${fullUrl}`);
    
    // Hacer la petición con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout
    
    const response = await fetch(fullUrl, { 
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`⚠️ Error HTTP ${response.status} al obtener imagen`);
      return null;
    }

    const blob = await response.blob();
    
    if (blob.size === 0) {
      console.warn('⚠️ Imagen recibida está vacía');
      return null;
    }

    // Convertir a base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          console.log('✅ Imagen convertida a base64 exitosamente');
          resolve(reader.result);
        } else {
          reject(new Error('Error leyendo imagen'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('⚠️ Timeout obteniendo imagen');
    } else {
      console.error('❌ Error convirtiendo imagen a base64:', error.message);
    }
    return null;
  }
};

// Función alternativa para imágenes por defecto
export const getDefaultLogo = () => {
  // Puedes crear un logo simple en base64 o usar uno por defecto
  const defaultLogo = `
    <svg width="200" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="80" fill="#f0f0f0" rx="10"/>
      <text x="100" y="30" font-family="Arial" font-size="14" fill="#333" text-anchor="middle">SORTEO</text>
      <text x="100" y="50" font-family="Arial" font-size="12" fill="#666" text-anchor="middle">OFICIAL</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(defaultLogo)}`;
};