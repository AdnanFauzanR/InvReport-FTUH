import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../../../components/Layout';
import ReportCard from '../../../components/ReportCard';
import { getUserInfo } from '../../../utils/auth';

interface Report {
    uuid: string;
    name: string;
    phone_number: string;
    description: string;
    last_status: string;
    technician_name: string;
    date_report: string;
    division: string;
}

const Reports = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [userInfo, setUserInfo] = useState({ role: '', division: '' });
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const info = await getUserInfo();
                setUserInfo(info);
                fetchReports(info.role, info.division);
            } catch (error) {
                console.error('Failed to get user info:', error);
                router.push('/login');
            }
        };
        fetchUserInfo();
    }, [router]);

    const fetchReports = async (role: string, division: string) => {
        try {
            let url = 'http://localhost:3000/api/report/list-report';

            if (role === 'Departemen' || role === 'Fakultas') {
                url += `?division=${division}`;
            }

            const response = await axios.get(url);
            setReports(response.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
            setLoading(false);
        }
    }

    const handleReportClick = (id: string) => {
        router.push(`/dashboard/reports/${id}`);
    };

    return (
        <Layout role={userInfo.role} title="Laporan">
            <div className="mb-6 bg-[#070A52]">
                <h2 className="text=xl font-semibold mb-4">Daftar Laporan Inventaris</h2>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                    </div>
                ) : reports.length > 0 ? (
                    <>
                        {reports.map(report => (
                            <ReportCard 
                                key={report.uuid}
                                id={report.uuid}
                                name={report.name}
                                phone_number={report.phone_number}
                                description={report.description}
                                last_status={report.last_status}
                                technician_name={report.technician_name}
                                date_report={report.date_report}
                                onClick={() => handleReportClick(report.uuid)}/>
                        ))}
                    </>
                ) : (
                    <div className="bg-gray-100 p-6 rounded-lg text-center">
                        <p className="text-gray-500">Tidak ada laporan yang tersedia.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Reports;