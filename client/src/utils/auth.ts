import axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
    uuid: string;
    username: string;
    email: string;
    division: string;
    role: string;
}

export const getUserInfo = async () => {
    const token = Cookies.get('token');

    if (!token) throw new Error('Not authenticated');

    try {
        const decoded = jwtDecode<DecodedToken>(token);
        return {
            id: decoded.uuid,
            username: decoded.username,
            email: decoded.email,
            division: decoded.division,
            role: decoded.role,
        }
    } catch (error) {
        console.error('Failed to decode token:', error);
        throw new Error('Invalid Token');
    }

    axios.interceptors.request.use(
        (config) => {
            const token = Cookies.get('token');
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    )
};

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            Cookies.remove('token');
            window.location.href = '/login'
        }
        return Promise.reject(error);
    }
)