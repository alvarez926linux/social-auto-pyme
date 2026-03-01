# 🚀 Instrucciones de Arranque - SocialAutoPyme

Para que el sistema funcione correctamente (incluyendo la programación de publicaciones), debes tener estas **3 terminales** abiertas en la carpeta `c:\RedesSociales\social-auto-pyme`:

### 1️⃣ Terminal 1: Servidor Web (Next.js)
Este comando arranca la aplicación de escritorio y la API.
```powershell
npm run dev
```
> **URL:** http://localhost:3001

---

### 2️⃣ Terminal 2: Servidor de Tareas (Inngest)
Este comando permite que las publicaciones agendadas se disparen automáticamente a la hora correcta.
```powershell
npx.cmd inngest-cli@latest dev -u http://localhost:3001/api/inngest
```
> **URL de control:** http://localhost:8288
> **Nota:** Si ves un error de "bind" o "address already in use", cierra todas las ventanas de terminal y vuelve a intentar.

---

### 3️⃣ Terminal 3: Base de Datos (Prisma Studio) - *Opcional*
Este comando te permite ver y editar los posts, usuarios y tokens directamente en una interfaz web.
```powershell
npx.cmd prisma studio
```
> **URL:** http://localhost:5555

---

### 💡 Tips Rápidos:
- Usa siempre `npx.cmd` en lugar de `npx` en PowerShell para evitar errores de permisos.
- Si una publicación falla, revisa la **Terminal 2** para ver el error técnico exacto.
- No cierres ninguna terminal mientras estés usando la aplicación.
