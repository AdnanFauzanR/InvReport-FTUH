import { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

interface SidebarProps {
    role: string;
}

const Sidebar : FC<SidebarProps> = ({ role }) => {
    const router = useRouter();

    const handleLogout = () => {
        Cookies.remove('token');
        router.push('/login');
    };

    return (
        <div className="h-screen bg-gray-800 text-white w-64 fixed">
            <div className="p-5">
                <h2 className="text-2xl font-bold mb-6">
                    Inventary Report FTUH
                </h2>

                <nav className="mt-10">
                    <div className="space-y-2">
                        <Link href="reports" className={`block p-3 rounded hover:bg-gray-700 ${router.pathname.includes('/reports') ? 'bg-gray-700' : ''}`}>
                            Reports
                        </Link>

                        {(role === 'Admin') && (
                            <Link href="users" className={`block p-3 rounded hover:bg-gray-700 ${router.pathname.includes('/users') ? 'bg-gray-700' : ''}`}>
                                Users
                            </Link>
                        )}

                        <button 
                            onClick={handleLogout}
                            className="w-full text-left p-3 rounded hover:bg-gray-700 mt-12 text-red-300">
                                Logout
                        </button>
                    </div>
                </nav>
            </div>
        </div>
    );
};

export default Sidebar;