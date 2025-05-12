'use client'

import LoginGoogle from '../auth/LoginButtonGoogle'; // Importamos el componente de login con Google

export function LoginForm() {
  return (
  <div className="w-full max-w-[400px] mx-auto">
    <div className="mb-8 flex flex-col items-center justify-between animate-fade-in">
        <h2 className="text-3xl font-copernicus mb-4 text-center text-gray-950">Organiza tu agenda, simplifica tu vida</h2>
        <form action="" className="w-full">
            <div className="mb-4">
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  placeholder="Ingresa tu correo" 
                  className="w-full px-4 py-2 rounded-lg bg-stone-50 text-gray-950 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 mb-4"
                  required
                />
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  placeholder="Ingresa tu contraseña" 
                  className="w-full px-4 py-2 rounded-lg bg-stone-50 text-gray-950 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200"
                  required
                />
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-neutral-950 hover:bg-neutral-900 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 "
            >
              Continuar
            </button>

            {/* Separador entre botones */}
            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-sm text-gray-500">o</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Botón de Google con estilos adaptados */}
            <div className="w-full">
              <LoginGoogle/>
            </div>
        </form>
    </div>
  </div>
  )
}


