import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const token = Cookies.get('token');

        if (token) {
            router.replace('/dashboard/reports');
        } else {
            router.replace('/login')
        }
    }, [router])

    return null;
}