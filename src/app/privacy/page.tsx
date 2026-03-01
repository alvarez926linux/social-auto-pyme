export default function PrivacyPage() {
    return (
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem", fontFamily: "sans-serif" }}>
            <h1>Política de Privacidad</h1>
            <p>Última actualización: Febrero 2025</p>
            <p>
                Esta política describe cómo SocialAutoPyme recopila, usa y protege tu información.
            </p>
            <h2>Datos que recopilamos</h2>
            <ul>
                <li>Nombre y correo electrónico (a través de LinkedIn OAuth)</li>
                <li>Tokens de acceso a tus cuentas de redes sociales</li>
                <li>Contenido y archivos multimedia que subes para publicar</li>
            </ul>
            <h2>Cómo usamos tus datos</h2>
            <p>
                Usamos tus tokens de acceso exclusivamente para publicar contenido en tu nombre
                en las redes sociales que conectes. No vendemos ni compartimos tus datos con terceros.
            </p>
            <h2>Seguridad</h2>
            <p>
                Tus datos se almacenan en bases de datos encriptadas. Los tokens de acceso
                se almacenan de forma segura y se eliminan cuando desconectas una cuenta.
            </p>
            <h2>Tus derechos</h2>
            <p>
                Puedes solicitar la eliminación de tus datos en cualquier momento contactándonos.
            </p>
            <h2>Contacto</h2>
            <p>Para consultas sobre privacidad: privacidad@socialautopyme.com</p>
        </main>
    );
}
