import { FC } from 'react';

interface HeaderProps {
    title: string;
}

const Header: FC<HeaderProps> = ({ title }) => {
    return (
        <header className="fixed top-0 w-full z-50 bg-[#D21312] shadow">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-white-900">
                    {title}
                </h1>
            </div>
        </header>
    )
}
export default Header;