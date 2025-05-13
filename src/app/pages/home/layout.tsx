'use client';

//import { useRouter } from 'next/navigation';
import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { Home } from 'lucide-react';
import LogoutButton from '../../components/logout/logout';
import { SidebarContext } from './sidebar-context'; // Importar SidebarContext

const items = [
  { title: "Ve al login", url: "/login", icon: Home },
];

export default function ChatLayout({ children }: { children: ReactNode }) {
  //const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar }}>
      <div className="min-h-screen flex bg-stone-900 text-white font-sans">
        {/* Sidebar - Responsive */}
        <div 
          className={`fixed left-0 sm:left-5 top-0 h-screen flex items-center z-40 transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:-translate-x-[calc(100%+20px)]'}`}
        >
          <div className={`text-white h-[calc(100vh-40px)] sm:h-[calc(100vh-80px)] flex flex-col py-4 sm:py-6 transition-all duration-200 ease-in-out ${isSidebarOpen ? 'w-[200px] sm:w-[240px] items-start px-3 sm:px-4' : 'w-[50px] sm:w-[60px] items-center'}`}>
            <div className="space-y-6 sm:space-y-8 flex flex-col items-center w-full">
              {items.map((item, index) => (
                <Link href={item.url} key={index} passHref className={`${isSidebarOpen ? 'w-full' : ''}`}>
                  <button
                    title={item.title}
                    className={`flex items-center rounded-lg hover:bg-[#3a3a3a] transition-colors duration-200 group ${isSidebarOpen ? 'w-full justify-start py-2 px-2 sm:py-2.5 sm:px-3' : 'w-8 h-8 sm:w-10 sm:h-10 justify-center'}`}
                  >
                    <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-gray-400 group-hover:text-white transition-colors duration-200" />
                    {isSidebarOpen && <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis text-gray-300 group-hover:text-white transition-colors duration-200">{item.title}</span>}
                  </button>
                </Link>
              ))}
            </div>

            {/* Divider - Added at the bottom */}
            <LogoutButton/>

            {/* Profile Image - Added at the bottom */}
            {<Link href={"/pages/home/profile"} className={`mt-auto flex items-center w-full pb-4 sm:pb-6 px-2.5`}>
            <div className="relative group cursor-pointer flex items-center w-full">
              
              <span className={`ml-2 text-sm font-medium whitespace-nowrap ${isSidebarOpen ? 'inline' : 'hidden'}`}>Mi Perfil</span>
            </div>
          </Link>}
          </div>
        </div>
        
        {/* Main Content - Responsive */}
        <div className={`flex-1 p-2 sm:p-4 md:p-6 lg:p-8 flex items-center transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-[200px] sm:ml-[260px]' : 'ml-0'}`}>
          {children}
        </div>
      </div>
    </SidebarContext.Provider>
  );
}