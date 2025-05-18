'use client'

import React, { useState } from 'react';

export default function RegisterForm() {
    const [nameConsultorio, setNameConsultorio] = useState('');
    const [selectedRole, setSelectedRole] = useState(""); 
    const roles = ["Master", "Médico", "Asistente"];
    
    return (
        <div className='w-full flex'>
            {/* Columna Izquierda - Imagen */}
            <div className="hidden md:flex md:w-1/2 bg-[#bb5b5b] items-center justify-center">
                <div className="p-8 max-w-md">
                    <div className="relative w-full h-[450px]">
                        {/* Aquí puedes colocar una imagen relacionada con medicina o tecnología */}
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 16v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1"></path>
                                <path d="M12 12h4"></path>
                                <path d="M12 16h4"></path>
                                <path d="M8 8h.01"></path>
                                <path d="M8 12h.01"></path>
                                <path d="M8 16h.01"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Columna Derecha - Formulario */}
            <div className="w-full md:w-1/2 bg-[#1e1e1e] text-gray-200 p-8 flex items-center justify-center">
                <div className="w-full max-w-md space-y-8">
                    <div>
                        <h2 className="text-3xl font-medium tracking-tight mb-2">Registra tu entidad</h2>
                        <p className="text-gray-400 text-sm">Completa la información para comenzar</p>
                    </div>
                    
                    <form className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="nameConsultorio" className="block text-sm font-medium text-gray-300">
                                Nombre del consultorio
                            </label>
                            <input 
                                type="text" 
                                id="nameConsultorio"
                                placeholder="Ej: Consultorio 1"
                                className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 transition-all duration-200"
                                value={nameConsultorio}
                                onChange={(e) => setNameConsultorio(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-300">
                                Selecciona tu rol
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {roles.map((rol) => (
                                    <button
                                        key={rol}
                                        type="button"
                                        onClick={() => setSelectedRole(rol)}
                                        className={`px-4 py-2 text-sm rounded-md transition-all duration-200 ${
                                            selectedRole === rol 
                                                ? "bg-[#2d7ff9] text-white" 
                                                : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333]"
                                        }`}
                                    >
                                        {rol}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <button
                            type="submit"
                            className="w-full py-2 px-4 bg-[#2d7ff9] hover:bg-[#2b6fd9] text-white font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2d7ff9] focus:ring-offset-[#1e1e1e]"
                        >
                            Continuar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}