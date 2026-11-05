/**
 * Comprime y redimensiona imágenes del lado del cliente antes de enviarlas al servidor.
 * Evita el error HTTP 413 (Content Too Large) con fotos de celulares de alta resolución.
 */
export const comprimirImagen = (archivo, maxDim = 1200, calidad = 0.85) => {
  return new Promise((resolve, reject) => {
    if (!archivo || !archivo.type.startsWith('image/')) {
      return resolve(archivo)
    }

    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(archivo)
            }
            const nuevoArchivo = new File([blob], archivo.name.replace(/\.[^/.]+$/, '') + '.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(nuevoArchivo)
          },
          'image/jpeg',
          calidad
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(archivo)
  })
}

