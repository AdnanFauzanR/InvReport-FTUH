import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import axios from 'axios';
import Cookies from 'js-cookie';
import '../app/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const token = Cookies.get('token');

            if (router.pathname === '/login' && token) {
                try {
                    const response = await axios.get('/api/auth/me', {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    router.replace('dashboard/reports');
                } catch (error) {
                    console.error(error)
                    Cookies.remove('token');
                }
            }
        };
        checkAuth();
    }, [router, router.pathname]);

    return <Component {...pageProps} />
}

export default MyApp;