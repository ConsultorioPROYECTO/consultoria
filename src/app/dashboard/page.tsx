'use client';
import AdminDashboard from "./Admin/page";
import DoctorDashboard from "./Doctor/page";
import AssistantDashboard from "./Assistant/page";
import { getFirebaseAuthToken } from "@rutas/app/lib/firebase/clientUtils";
import { useAuth } from "../context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export interface FetchRolUser {
  role: string;
}

const fetchRolUser = async () => {
  try {
    const token = await getFirebaseAuthToken();

    if (!token) {
      console.error('No se pudo obtener el token de autenticación.');
      return null;
    }

    const response = await fetch('/api/users/rol',{
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data : FetchRolUser = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return null;
  }
}

export default function Page() {
  const { user, loading } = useAuth(); 
  const router = useRouter();
  const [checkingRole, setCheckingRole] = useState(true);
  const [UserDashboard, setUserDashboard] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (!loading && user) {
      fetchRolUser().then((data) => {
        if (data && 'role' in data) {
          if (data.role === 'N/A') {
            router.push('/onboard');
            // No liberamos checkingRole aquí, así nunca se renderiza la página
            return;
          } else if (data.role === 'medico') {
            setUserDashboard(() => DoctorDashboard);
          } else if (data.role ==='asistente') {
            setUserDashboard(() => AssistantDashboard);
          } else if (data.role ==='admin') {
            setUserDashboard(() => AdminDashboard);
          }
        }
        setCheckingRole(false);
      }).catch((error) => {
        console.error('Error fetching rol:', error);
        setCheckingRole(false);
      });
    } else if (!loading) {
      setCheckingRole(false);
    }
  }, [user, loading, router]);
  if (loading || !user || checkingRole || !UserDashboard) {
    return null;
  }

  return (

        <UserDashboard />

  )
}
