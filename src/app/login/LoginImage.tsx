import Image from 'next/image';
import PhotoLogin from '../../../img/photologin.png';

export const LoginImage = () => {
    return (
        <div className="hidden lg:block bg-[#f0e9de] rounded-2xl h-50 relative lg:h-auto overflow-hidden">
            <Image 
                src={PhotoLogin}
                alt="Login" 
                width={1200}
                height={1200}
                className='object-contain w-full h-full'
                priority
            />
        </div>
    );
}; 