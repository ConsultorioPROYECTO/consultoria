'use client'
import RegisterForm from "../register/components/form"

export default function Register() {
  return (
    <div className='bg-[#1e1e1e] min-h-screen flex items-center justify-center'>
      <div className="w-full max-w-4xl shadow-lg rounded-xl overflow-hidden">
        <RegisterForm />
      </div>
    </div>
  )
}