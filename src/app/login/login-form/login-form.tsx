'use client'

import LoginGoogle from '../../components/auth/LoginButtonGoogle'; // Importamos el componente de login con Google
import { useAuth, EmailPasswordCredentials } from '@rutas/app/context/AuthContext'; // Importamos useAuth y EmailPasswordCredentials
import { useState } from 'react'; // Importamos useState para manejar el estado del formulario
import { toast } from 'sonner'; // Importamos toast para mostrar mensajes amigables

// Componente simplificado solo para login

export function LoginForm() {
  const { signInWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (isSubmitting || loading) return; // Prevenir múltiples envíos
    
    setIsSubmitting(true);
    const credentials: EmailPasswordCredentials = { email, password };
    
    try {
      await signInWithEmail(credentials);
    } catch (error) {
      // Manejar errores específicos de autenticación
      if (error && typeof error === 'object' && 'code' in error) {
        const authError = error as { code: string; message: string };
        
        switch (authError.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
          case 'auth/invalid-email':
            toast.error('Credenciales incorrectas', {
              description: 'El correo electrónico o la contraseña son incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.'
            });
            break;
          case 'auth/user-disabled':
            toast.error('Cuenta deshabilitada', {
              description: 'Esta cuenta ha sido deshabilitada. Contacta al soporte para más información.'
            });
            break;
          case 'auth/too-many-requests':
            toast.error('Demasiados intentos', {
              description: 'Has realizado demasiados intentos fallidos. Espera un momento antes de intentar de nuevo.'
            });
            break;

          default:
            toast.error('Error de autenticación', {
              description: 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.'
            });
        }
      } else {
        toast.error('Error de conexión', {
          description: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
  <div className="w-full max-w-[400px] mx-auto">
    <div className="mb-8 flex flex-col items-center justify-between animate-fade-in">
        <h2 className="text-3xl font-copernicus mb-4 text-center text-gray-950">
          Organiza tu agenda, simplifica tu vida
        </h2>
        <form onSubmit={handleSubmit} className="w-full">
            <div className="mb-4">
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  placeholder="Ingresa tu correo" 
                  className="w-full px-4 py-2 rounded-lg bg-stone-50 text-gray-950 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200 mb-4"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  placeholder="Ingresa tu contraseña" 
                  className="w-full px-4 py-2 rounded-lg bg-stone-50 text-gray-950 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all duration-200"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting || loading}
              className="w-full bg-neutral-950 hover:bg-neutral-900 disabled:bg-neutral-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {(isSubmitting || loading) ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Procesando...
                </>
              ) : (
                'Continuar'
              )}
            </button>
            {/* Los errores ahora se muestran como toasts en lugar de texto directo */}

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


