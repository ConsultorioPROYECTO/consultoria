import Link from 'next/link';

export const LoginFooter = () => {
    return (
        <div className="flex flex-col items-center justify-center">
            <Link href="/" className="text-balance text-gray-950 underline underline-offset-2">
                Mas información
            </Link>
        </div>
    );
}; 