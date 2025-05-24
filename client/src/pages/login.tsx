import { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Cookies from 'js-cookie';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            console.log('API BASE URL:', process.env.NEXT_PUBLIC_API_BASE_URL);

            const response = await axios.post(`http://localhost:3000/api/auth/login`, { username, password });
            Cookies.set('token', response.data.token, { expires: 1, secure: true, sameSite: 'strict' });
            router.push('/dashboard/reports');
        } catch (error) {
            console.error(error);
            setError('Username atau password salah');
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">
                    Sistem Pelaporan Inventaris
                </h1>

                {
                    error && (
                        <div className="bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )
                }

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                            Username
                        </label>
                        <input 
                            id="username"
                            type="text"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus: outline-none focus: shadow-outline" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required/>
                    </div>

                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                                id="password" 
                                type="password"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-non focus: shadow-outline"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required />
                    </div>

                    <div className="flex items-center justify-center">
                        <button 
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full">
                                Login
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;