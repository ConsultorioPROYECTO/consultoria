'use client'

import React, { useState } from 'react';
import DropdownMenu from "../components/dropdownmenu"

export default function RegisterForm() {
    const [NameConsultorio, setNameConsultorio] = useState('');
    const [selectedRole, setSelectedRole] = useState(""); // Nuevo estado para el rol seleccionado
    const roles = ["Master", "Médico", "Asistente"];
    return (
    <div className='w-full flex flex-cols h-[calc(100vh-20px)]'>
        {/* Left Side */}
            <div className="bg-amber-900 w-[50px] "></div>
                {/* Right Side */}
                <div className="bg-[#414141] p-2">
                    <h2 className="text-3xl font-copernicus mb-4 text-white">Registrate tu entidad</h2>
                        <form>
                            <h1>Nombre del consultorio</h1>
                            <input 
                            type="text" 
                            id="NameConsultorio"
                            placeholder="Ej: Consultorio 1"
                            className=""
                            value={NameConsultorio}
                            onChange={(e) => setNameConsultorio(e.target.value)}
                            required
                            />
                        </form>
                    <hr className="my-4 border-gray-300" />
                <div>
                <div className="flex flex-row justify-between mb-4 gap-1">
                  {roles.map((rol) => (
                    <button
                      key={rol}
                      type="button"
                      onClick={() => setSelectedRole(rol)}
                      className={`ring-2 ring-[#4266c9] rounded-xl text-white px-4 py-1
                        ${selectedRole === rol ? "border-[#de1f3c]" : "bg-transparent border-2 border-[#8cff00]"}
                      `}
                    >
                      {rol}
                    </button>
                  ))}
                </div>
            </div>
        </div>  
    </div>
  )
}