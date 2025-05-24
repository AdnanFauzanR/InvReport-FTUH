import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Image from 'next/image';
import Layout from '../../../components/Layout';
import ProgressCard from '../../../components/ProgressCard';
import { getUserInfo } from '../../../utils/auth';

interface User {
    uuid: string;
    name: string;
}

interface Progress {
    uuid: string;
    status: string;
    technician_name: string;
    external_technician: string;
    description: string;
    progress_date: string;
    documentation_url?: string;
    documentation_type?: 'image' | 'video';
}

interface Report {
    uuid: string;
    name: string;
    phone_number: string;
    location: string;
    building_name: string;
    out_room: string;
    description: string;
    last_status: string;
    date_report: string;
    technician_name: string;
    technician_id: string;
    report_url?: string;
    report_type?: 'image' | 'video';
    progress: Progress[];
}

// Konstanta untuk URL API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; // Sesuaikan dengan port server Express

const ReportDetail = () => {
    const [report, setReport] = useState<Report | null>(null);
    const [technicians, setTechnicians] = useState<User[]>([]);
    const [userInfo, setUserInfo] = useState({ role: '', division: ''});
    const [loading, setLoading] = useState(true);
    const [viewMedia, setViewMedia] = useState(false);
    const router = useRouter();
    
    // Fungsi untuk memastikan URL benar (mengganti port server jika diperlukan)
    const fixMediaUrl = (url: string | undefined): string | undefined => {
        if (!url) return undefined;
        
        // Jika URL adalah path relatif, ubah menjadi URL lengkap
        if (url.startsWith('/')) {
            return `${API_BASE_URL}${url}`;
        }
        
        // Jika URL sudah lengkap tetapi port salah, perbaiki
        return url.replace(/http:\/\/localhost:3000/g, API_BASE_URL);
    };
    
    // Only access router.query after component is mounted
    useEffect(() => {
        const fetchData = async () => {
            // Make sure we have the ID from the router
            const reportId = router.query.id as string;
            if (!reportId) return;
            
            try {
                // 1. Get user info first
                const info = await getUserInfo();
                setUserInfo(info);
                
                // 2. Fetch the report details
                const reportResponse = await axios.get(`${API_BASE_URL}/api/report/detail-report?uuid=${reportId}`);
                const reportData = reportResponse.data;
                
                // Fix report URL if needed
                if (reportData.report_url) {
                    reportData.report_url = fixMediaUrl(reportData.report_url);
                }
                
                // Process report media type
                if (reportData.report_url) {
                    const ext = reportData.report_url.split('.').pop()?.toLowerCase();
                    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                    const videoFormats = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
                    
                    if (ext && imageFormats.includes(ext)) {
                        reportData.report_type = 'image';
                    } else if (ext && videoFormats.includes(ext)) {
                        reportData.report_type = 'video';
                    } else {
                        reportData.report_type = undefined;
                    }
                }
                
                // Initialize with empty progress array
                reportData.progress = [];
                
                // 3. Set initial report state
                setReport(reportData);
                
                // 4. Fetch progress data
                const progressResponse = await axios.get(`${API_BASE_URL}/api/report-progress/list-progress?report_uuid=${reportId}`);
                const progressData = progressResponse.data;
                
                // Process progress media types
                const progressWithTypes: Progress[] = progressData.map((prog: Progress) => {
                    let documentation_type: 'image' | 'video' | undefined;
                    
                    // Fix progress URL if needed
                    if (prog.documentation_url) {
                        prog.documentation_url = fixMediaUrl(prog.documentation_url);
                    }
                
                    if (prog.documentation_url) {
                        const ext = prog.documentation_url.split('.').pop()?.toLowerCase();
                        const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                        const videoFormats = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
                
                        if (ext && imageFormats.includes(ext)) {
                            documentation_type = 'image';
                        } else if (ext && videoFormats.includes(ext)) {
                            documentation_type = 'video';
                        }
                    }
                
                    return { ...prog, documentation_type };
                });
                
                // 5. Update report with progress data
                setReport(prev => prev ? { ...prev, progress: progressWithTypes } : null);
                
                // 6. Fetch technicians if needed
                if (info.role === 'Workshop' || info.role === 'Admin') {
                    const techResponse = await axios.get(`${API_BASE_URL}/api/users/list-user?role=Teknisi`);
                    setTechnicians(techResponse.data);
                }
                
                // 7. Finish loading
                setLoading(false);
                
            } catch (error) {
                console.error('Failed to fetch data:', error);
                setLoading(false);
            }
        };
        
        // Only run this effect when router is ready
        if (router.isReady) {
            fetchData();
        }
    }, [router.isReady, router.query.id]);

    const updateTechnician = async (reportId: string, technicianId: string) => {
        try {
            await axios.put(`${API_BASE_URL}/api/report/update-report/${reportId}`, { technician_uuid: technicianId });

            const selectedTech = technicians.find(tech => tech.uuid === technicianId);

            setReport(prev => prev ? {
                ...prev,
                technician_id: technicianId,
                technician_name: selectedTech ? selectedTech.name : '',
            } : null);
        } catch (error) {
            console.error('Failed to update technician:', error);
        }
    };

    if (loading) {
        return (
            <Layout role={userInfo.role} title="Detail Laporan">
                <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                </div>
            </Layout>
        );
    }

    if (!report) {
        return (
            <Layout role={userInfo.role} title="Detail Laporan">
                <div className="bg-red-100 p-6 rounded-lg text-center">
                    <p className="text-red-500">Laporan tidak ditemukan</p>
                </div>
            </Layout>
        );
    }

    const canEditTechnician = userInfo.role === 'Workshop' || userInfo.role === 'Admin';

    return (
        <Layout role={userInfo.role} title="Detail Laporan">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                {/* Photo/Video Section */}
                <div className="mb-6 text-center">
                    {report.report_url && (
                        <div className="relative h-64 cursor-pointer" onClick={() => setViewMedia(true)}>
                            {report.report_type === 'image' ? (
                                <Image 
                                    src={report.report_url}
                                    alt="Inventaris"
                                    fill
                                    objectFit="cover"
                                    className="rounded-lg"/>
                            ) : (
                                <video 
                                    src={report.report_url}
                                    className="w-full h-full object-cover rounded-lg"
                                    crossOrigin="anonymous"
                                    preload="metadata"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setViewMedia(true);
                                    }}/>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg hover:bg-opacity-20 transition-opacity">
                                <span className="text-white font-medium">Klik untuk memperbesar</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="col-span-2">
                        <h2 className="text-xl font-bold mb-4 text-black">
                            Data Laporan
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 col-span-2 gap-y-3 text-black">
                        <div className="font-medium">Nama Pelapor</div>
                        <div>{report.name || '-'}</div>

                        <div className="font-medium">Nomor Telepon</div>
                        <div>{report.phone_number || '-'}</div>

                        <div className="font-medium">Location</div>
                        <div>{report.building_name ? report.building_name : report.out_room ? report.out_room : '-'}</div>

                        <div className="font-medium">Tanggal Laporan</div>
                        <div>{report.date_report ? new Date(report.date_report).toLocaleDateString() : '-'}</div>

                        <div className="font-medium">Status Terakhir</div>
                        <div>{report.last_status || '-'}</div>

                        <div className="font-medium">Deskripsi</div>
                        <div>{report.description || '-'}</div>

                        <div className="font-medium">Teknisi</div>
                        <div>
                            {canEditTechnician ? (
                                <div>
                                   <label htmlFor="technicianSelect" className="block mb-1 font-medium">{ report.technician_name || '-' }</label>
                                   <select 
                                        id="technicianSelect"
                                        className="border rounded p-2 w-full"
                                        value={report.technician_id || ''}
                                        onChange={(e) => updateTechnician(report.uuid, e.target.value)}>
                                            <option value="">-- Pilih Teknisi --</option>
                                            {technicians.map(tech => (
                                                <option value={tech.uuid} key={tech.uuid}>
                                                    {tech.name}
                                                </option>
                                            ))}
                                    </select> 
                                </div>
                                
                            ) : (
                                report.technician_name || '-'
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-8">
                    <h2 className="text-xl font-bold mb-4 text-black">Progress</h2>
                    {report.progress && report.progress.length > 0 ? (
                        <div>
                            {report.progress.map((prog, index) => (
                                <ProgressCard
                                    key={prog.uuid || index}
                                    status={prog.status}
                                    technician_name={prog.technician_name}
                                    progress_date={prog.progress_date}
                                    documentation_url={prog.documentation_url}
                                    documentation_type={prog.documentation_type}/>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-100 p-6 rounded-lg text-center">
                            <p className="text-gray-500">Belum ada progress.</p>
                        </div>
                    )}
                </div>

                {viewMedia && report.report_url && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                        onClick={() => setViewMedia(false)}>
                            <div className="max-w-5xl max-h-full p-5" onClick={(e) => e.stopPropagation()}>
                                {report.report_type === 'image' ? (
                                    <Image
                                        src={report.report_url}
                                        alt="Inventaris"
                                        width={1200}
                                        height={800}
                                        className="max-h-[90vh] object-contain"/>
                                ) : (
                                    <video
                                        controls
                                        autoPlay
                                        crossOrigin="anonymous"
                                        src={report.report_url}
                                        className="max-h-[90vh] max-w-full"/>
                                )}
                                <button
                                    className="absolute top-4 right-4 text-white text-2xl"
                                    onClick={() => setViewMedia(false)}>
                                        &times;
                                    </button>
                            </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ReportDetail;