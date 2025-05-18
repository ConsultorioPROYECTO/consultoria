import { LoginForm } from '@rutas/app/components/login-form/login-form';
import { LoginHeader } from './LoginHeader';
import { LoginFooter } from './LoginFooter';

export const LoginContent = () => {
    return (
        <div className="flex items-center h-auto min-h-[97vh] w-full py-6">
            <div className="flex flex-col h-full w-full items-center justify-between">
                <LoginHeader />
                <LoginForm />
                <LoginFooter />
            </div>
        </div>
    );
}; 