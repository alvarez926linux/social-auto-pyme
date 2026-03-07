# 🛠️ Guía de Configuración OAuth para Vercel

Esta guía contiene los pasos exactos para corregir los errores de redirección y dominios en Facebook y LinkedIn tras el despliegue a Vercel.

**ID de Conversación:** `34257be0-7ec9-4d09-8742-cc24bc76675a`

---

## 1. Facebook (Error de Dominio / No se puede cargar la URL)

1. **Acceso:** Ve a [Facebook Developers](https://developers.facebook.com/apps/).
2. **Configuración Básica:**
   - Selecciona tu App.
   - Ve a **Configuración > Básica**.
   - En **Dominios de la app**, agrega: `social-auto-pyme-v1.vercel.app`
   - En la sección **Sitio Web** (al final), asegúrate de que **URL del sitio** sea: `https://social-auto-pyme-v1.vercel.app`
3. **Configuración de Login:**
   - En el menú lateral, ve a **Inicio de sesión con Facebook > Configuración**.
   - En **URI de redireccionamiento de OAuth válidos**, agrega:
     `https://social-auto-pyme-v1.vercel.app/api/auth/link-instagram`
4. **Guardar:** No olvides guardar todos los cambios.

---

## 2. LinkedIn (Error: The redirect_uri does not match)

1. **Acceso:** Ve al [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps).
2. **Selección:** Abre tu aplicación (SocialAutoPyme).
3. **Autenticación (Auth):**
   - Ve a la pestaña **Auth**.
   - Busca **OAuth 2.0 settings > Authorized Redirect URIs**.
   - Agrega esta URL exacta:
     `https://social-auto-pyme-v1.vercel.app/api/auth/callback/linkedin`
4. **Guardar:** Haz clic en el botón de guardar.

---

## 3. TikTok (Verificación Preventiva)

Si el login de TikTok falla mañana, asegúrate de que tiene esta URL registrada:
- **Redirect URI:** `https://social-auto-pyme-v1.vercel.app/api/auth/link-tiktok`

---

## 4. Meta Compliance (Privacidad y Datos)

Para que Facebook apruebe el uso de Instagram Graph API, debes colocar estas URLs exactas en la sección **Configuración > Básica**:

- **URL de la política de privacidad:** 
  `https://social-auto-pyme-v1.vercel.app/privacy`
- **URL de condiciones del servicio:** 
  `https://social-auto-pyme-v1.vercel.app/terms`
- **URL de eliminación de datos de usuario:** 
  `https://social-auto-pyme-v1.vercel.app/data-deletion`

---

### Resumen del Estado Actual
- ✅ Código desplegado en Vercel (Rama `main`).
- ✅ Páginas de cumplimiento implementadas (/privacy, /data-deletion).
- ✅ Interfaz refinada: sin botones en el header, login centralizado en el grid.
- ✅ Errores de tipado TypeScript corregidos.
- ⏳ Pendiente: Actualización manual de las Redirect URIs y URLs de privacidad en los portales.
