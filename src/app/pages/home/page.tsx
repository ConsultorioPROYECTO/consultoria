'use client';

import { PanelRight } from 'lucide-react';
import { useSidebar } from './layout'; // Importamos el hook useSidebar

export default function Home() {
  // Obtenemos la función toggleSidebar del contexto
  const { toggleSidebar } = useSidebar();
  
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