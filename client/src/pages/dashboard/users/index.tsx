// pages/dashboard/users/index.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../../../components/Layout';
import UserCard from '../../../components/UserCard';
import { getUserInfo } from '../../../utils/auth';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface User {
  uuid: string;
  name: string;
  username: string;
  email: string;
  division: string;
  role: string;
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userInfo, setUserInfo] = useState({ role: '' });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const info = await getUserInfo();
        setUserInfo(info);
        
        // Pastikan hanya admin yang bisa mengakses halaman ini
        if (info.role !== 'Admin') {
          router.push('/dashboard/reports');
          return;
        }
        
        fetchUsers();
      } catch (error) {
        console.error('Failed to get user info:', error);
        router.push('/login');
      }
    };

    fetchUserInfo();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/list-user`);
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setLoading(false);
    }
  };

  // Updated to correctly redirect to the user edit page
  const handleEditUser = (id: string) => {
    router.push(`/dashboard/users/${id}`);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      try {
        const token = Cookies.get('token');
        await axios.delete(`${API_BASE_URL}/api/users/delete-user/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        fetchUsers(); // Refresh the user list after deletion
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert('Gagal menghapus pengguna.');
      }
    }
  };

  if (userInfo.role !== 'Admin') {
    return null; // Tidak render apa-apa jika bukan admin (redirect akan terjadi)
  }

  return (
    <Layout role={userInfo.role} title="Users">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Daftar Pengguna</h2>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            onClick={() => router.push('/dashboard/users/add')}
          >
            Tambah User
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
          </div>
        ) : users.length > 0 ? (
          <>
            {users.map(user => (
              <UserCard
                key={user.uuid}
                id={user.uuid}
                name={user.name}
                username={user.username}
                email={user.email}
                division={user.division}
                role={user.role}
                onEdit={() => handleEditUser(user.uuid)}
                onDelete={() => handleDeleteUser(user.uuid)}
              />
            ))}
          </>
        ) : (
          <div className="bg-gray-100 p-6 rounded-lg text-center">
            <p className="text-gray-500">Tidak ada pengguna yang tersedia.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Users;