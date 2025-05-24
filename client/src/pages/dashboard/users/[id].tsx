// pages/dashboard/users/[id].tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../../../components/Layout';
import { getUserInfo } from '../../../utils/auth';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface UserData {
  uuid: string;
  name: string;
  email: string;
  username: string;
  division: string;
  role: string;
}

interface FormData extends UserData {
  password: string;
  confirmPassword: string;
}

const divisions = [
  'Fakultas', 
  'Gedung Arsitektur', 
  'Gedung Mesin', 
  'Gedung Sipil', 
  'Gedung Elektro', 
  'Gedung Geologi', 
  'Gedung Perkapalan'
];

const roles = ['Admin', 'Sub-Admin', 'Workshop', 'Fakultas', 'Departemen', 'Teknisi'];

const EditUser = () => {
  const [formData, setFormData] = useState<FormData>({
    uuid: '',
    name: '',
    email: '',
    username: '',
    division: '',
    role: '',
    password: '',
    confirmPassword: ''
  });
  const [initialFormData, setInitialFormData] = useState<FormData | null>(null);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({ role: '' });
  const [saveLoading, setSaveLoading] = useState(false);
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    const checkUserAuth = async () => {
      try {
        const info = await getUserInfo();
        setUserInfo(info);
        
        // Ensure only admin can access this page
        if (info.role !== 'Admin') {
          router.push('/dashboard/reports');
          return;
        }
        
        if (id) {
          fetchUserData(id as string);
        }
      } catch (error) {
        console.error('Failed to get user info:', error);
        router.push('/dashboard/users');
      }
    };

    checkUserAuth();
  }, [router, id]);

  const fetchUserData = async (userId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/get-user-profile/${userId}`);
      const userData = response.data;

      const userDataWithEmptyPassword: FormData = {
        ...userData,
        password: '',
        confirmPassword: ''
      }
      
      setFormData(userDataWithEmptyPassword);
      setInitialFormData(userDataWithEmptyPassword)
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      alert('Gagal mengambil data pengguna.');
      router.push('/dashboard/users');
    }
  };

  const isFormChanged = () => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }

  const isDisabled = !isFormChanged() || saveLoading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Nama harus diisi';
    if (!formData.email.trim()) newErrors.email = 'Email harus diisi';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Format email tidak valid';
    
    if (!formData.username.trim()) newErrors.username = 'Username harus diisi';
    if (!formData.division) newErrors.division = 'Divisi harus dipilih';
    if (!formData.role) newErrors.role = 'Role harus dipilih';
    
    // Password validation only if user is changing password
    if (formData.password) {
      if (formData.password.length < 6) newErrors.password = 'Password minimal 6 karakter';
      
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Konfirmasi password harus diisi';
      else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Password dan konfirmasi password tidak cocok';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSaveLoading(true);
    
    try {
      const token = Cookies.get('token');
      console.log(token);

      const payload = {
        name: formData.name,
        email: formData.email,
        username: formData.username,
        division: formData.division,
        role: formData.role
      };
      
      // Add password only if provided
      if (formData.password) {
        Object.assign(payload, { password: formData.password });
      }
      
      await axios.put(`${API_BASE_URL}/api/users/update-user/${formData.uuid}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      alert('User berhasil diperbarui!');
      router.push('/dashboard/users');
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Gagal memperbarui user. Silakan coba lagi.');
      router.push('/dashboard/users');
    } finally {
      setSaveLoading(false);
    }
  };

  if (userInfo.role !== 'Admin') {
    return null; // Don't render anything if not admin (redirect will happen)
  }

  if (loading) {
    return (
      <Layout role={userInfo.role} title="Edit User">
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role={userInfo.role} title="Edit User">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6">Edit User</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="name">
              Nama Lengkap
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Masukkan nama lengkap"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Masukkan email"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="username">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.username ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Masukkan username"
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="division">
              Divisi
            </label>
            <select
              id="division"
              name="division"
              value={formData.division}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.division ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option className="text-black" value="">Pilih Divisi</option>
              {divisions.map((division) => (
                <option className="text-black" key={division} value={division}>
                  {division}
                </option>
              ))}
            </select>
            {errors.division && <p className="text-red-500 text-sm mt-1">{errors.division}</p>}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.role ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option className="text-black" value="">Pilih Role</option>
              {roles.map((role) => (
                <option className="text-black" key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-6">
            <p className="text-gray-600 mb-4">
              Kosongkan password jika tidak ingin mengubahnya
            </p>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2" htmlFor="password">
                Password Baru
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Masukkan password baru"
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Konfirmasi password baru"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => router.push('/dashboard/users')}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-md mr-4"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isDisabled}
              className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-md flex items-center"
            >
              {saveLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EditUser;