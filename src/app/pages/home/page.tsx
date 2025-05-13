'use client';

import { PanelRight } from 'lucide-react';
import { useSidebar } from './sidebar-context'; // Importamos el hook useSidebar
import { useAuth } from '../../context/AuthContext'; // Importamos useAuth
import { useRouter } from 'next/navigation'; // Importamos useRouter
import { useEffect } from 'react'; // Importamos useEffect

export default function Home() {
  const { toggleSidebar } = useSidebar();
  const { user, loading } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Cargando...</p> {/* O un componente de spinner */}
      </div>
    );
  }
  
  return (
    <div className='bg-[#2a2a2a]/80 backdrop-blur-xl rounded-xl border border-[#3a3a3a] shadow-xl h-[calc(100vh-20px)] sm:h-[calc(100vh-40px)] md:h-[calc(100vh-60px)] lg:h-[calc(100vh-80px)] overflow-hidden w-full flex flex-col'>
      <div className='p-3 sm:p-4 md:p-5'>
        <div className='flex justify-between items-center gap-x-1'>
          <div>
            <div className='flex items-center gap-x-2'>
              <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-gray-700">
                <PanelRight size={24} />
              </button>
          </div>
        </div>
        </div>
        </div>
    </div>
  );
}