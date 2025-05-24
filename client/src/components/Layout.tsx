import { FC, ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
    children: ReactNode;
    role: string;
    title: string;
}

const Layout: FC<LayoutProps> = ({ children, role, title }) => {
    return (
        <div className="flex">
            <Sidebar role={role} />
            <div className="flex-1 ml-64 bg-[#070A52]">
                <Header title={title} />
                <main className="pt-25 min-h-screen max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 bg-[#070A52]">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;