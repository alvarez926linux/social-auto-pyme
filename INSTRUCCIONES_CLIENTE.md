# 🎁 Guía para la Demo del Cliente - SocialAutoPyme

Esta guía contiene los pasos necesarios para que tu cliente pueda probar la aplicación con sus propias cuentas de **LinkedIn** e **Instagram** en tiempo real.

---

## 🛡️ ¿Qué necesita el cliente? (IMPORTANTE)
**No necesitas generar nuevas API Keys.** La aplicación usa las llaves que ya configuraste. Lo único que necesitamos es darle **permiso explícito** al cliente para usar tu aplicación mientras está en "Modo Desarrollo".

---

## 1. Configuración de LinkedIn (Muy Fácil)
LinkedIn es el más sencillo. Si ya configuraste la **Redirect URI** de Vercel en tu consola de LinkedIn, el cliente solo tiene que:
1. Entrar a: `https://social-auto-pyme-v1.vercel.app`
2. Hacer clic en **"Conectar LinkedIn"**.
3. Autorizar los permisos.
4. **Listo.** Podrá publicar posts de texto, imagen y video de inmediato.

---

## 2. Configuración de Instagram/Facebook (Requiere Invitación)
Debido a que Meta es muy estricto, debes agregar al cliente como **Tester** manualmente:

### Paso A: Tú (El Desarrollador) hace esto:
1. Entra a [developers.facebook.com](https://developers.facebook.com/apps).
2. Selecciona tu App.
3. En el menú lateral busca **App Roles** (Roles de la app) y haz clic en **Roles** (¡No vayas a "Test Users"!, ve a **Roles**).
4. Busca la sección que dice **Testers** (Evaluadores) y haz clic en **Add Testers**.
5. Escribe el **Nombre de Usuario** de Facebook de tu cliente (el que sale en su URL de perfil) o su **ID de Facebook**.
6. Haz clic en **Submit**.

### Paso B: El Cliente hace esto:
1. El cliente debe entrar a: [developers.facebook.com/requests](https://developers.facebook.com/requests).
2. Verá una invitación de tu aplicación. Debe hacer clic en **Confirmar/Aceptar**.
   * *Nota: El cliente debe tener una cuenta de desarrollador de Facebook activa (es gratis, solo es aceptar un aviso al entrar).*

---

## 3. Guía de Uso para el Cliente (Resumen)
Una vez aceptada la invitación, envíale estos pasos al cliente:

1. **Entrar al sitio:** Abre `https://social-auto-pyme-v1.vercel.app`.
2. **Conectar Redes:**
   * Haz clic en el botón de **LinkedIn** para vincular tu perfil profesional.
   * Haz clic en el botón de **Instagram/Facebook** para vincular tu página de empresa.
3. **Crear Contenido:**
   * Escribe un título y descripción (ej: "Oferta de Primavera").
   * Haz clic en **"Optimizar con IA"**. La IA generará el post perfecto con hashtags.
4. **Subir Multimedia:**
   * Arrastra una imagen o video MP4 en la sección de la derecha.
5. **Programar y Publicar:**
   * Selecciona las redes donde quieres publicar.
   * Elige una fecha/hora y dale a **"Confirmar y Programar"**.

---

### 💡 Tips para que la Demo sea Exitosa:
- **Instagram:** Asegúrate de que la cuenta de Instagram de tu cliente sea **Business (Comercial)** y esté vinculada a una **Página de Facebook** de la cual él sea administrador.
- **Video:** Recomienda usar videos de menos de 10-15MB para que la subida sea instantánea durante la demo.
