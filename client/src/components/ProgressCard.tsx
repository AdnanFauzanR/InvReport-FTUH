import { FC, useState } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';

interface ProgressCardProps {
    status: string;
    technician_name: string;
    progress_date: string;
    documentation_url?: string;
    documentation_type?: 'image' | 'video';
}

const ProgressCard: FC<ProgressCardProps> = ({
    status,
    technician_name,
    progress_date,
    documentation_url,
    documentation_type
}) => {
    const [showDocumentation, setShowDocumentation] = useState(false);
    const formattedDate = progress_date ? format(new Date(progress_date), 'dd/MM/yyy HH:mm') : '-';

    return (
        <>
            <div className="bg-white rounded-lg shadow-md p-5 mb-5">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm ${status === 'Selesai'? 'bg-green-100 text-green-800': status === 'Penanganan Internal' || status === 'Penanganan Eksternal'? 'bg-blue-100 text-blue-800': status === 'Pending'? 'bg-yellow-100 text-yellow-800': status === 'Laporan Masuk'? 'bg-red-100 text-red-800': 'bg-gray-100 text-gray-800'}`}>
                              {status || '-'}  
                            </span>
                        </div>
                        <div>
                            <p className="text-gray-600 mb-1">
                                <span className="font-medium">Teknisi:</span> {technician_name || '-'}
                            </p>
                        </div>
                        <p className="text-gray-600">
                            <span className="font-medium">Tanggal:</span> {formattedDate}
                        </p>
                    </div>
                    {documentation_url && (
                        <button
                            className="text-blue-600 hover:text-blue-800 underline"
                            onClick={() => setShowDocumentation(true)}>
                                Lihat Dokumentasi
                            </button>
                    )}
                </div>
            </div>

            {showDocumentation && documentation_url && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                    onClick={() => setShowDocumentation(false)}>
                        <div className="max-w-4xl max-h-full p-5" onClick={(e) => e.stopPropagation()}>
                            {documentation_type === 'image' ? (
                                <Image
                                    src={documentation_url}
                                    alt="Documentation"
                                    width={800}
                                    height={600}
                                    className="max-h-[90vh] object-contain"/>
                            ) : (
                                <video
                                    controls
                                    autoPlay
                                    crossOrigin="anonymous"
                                    src={documentation_url}
                                    className="max-h-[90vh] max-w-full"
                                    />
                            )}
                            <button
                                className="absolute top-4 right-4 text-white text-2xl"
                                onClick={() => setShowDocumentation(false)}>
                                    &times;
                                </button>
                        </div>
                    </div>
            )}
        </>
    );
};

export default ProgressCard;