' use client ';

export default function Login() {
    return (
<div className="bg-gray-800 grid grid-cols-2 gap-1 p-2 max-w-full">
    {/* Seccion 1 */}
    <div className="bg-pink-200 rounded-2xl">
        AQUI VA IMAGEN
    </div>
    {/* Seccion 2 */}
    <div className="bg-gray-800">
        <div>
            <textarea className="bg-gray-800 rounded-2xl p-2" placeholder="Escribe tu mensaje"></textarea>
        </div>
    </div>
</div>
    );
}