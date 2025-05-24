import { FC } from 'react';
import { format } from 'date-fns';

interface ReportCardProps {
  id: string;
  name: string;
  phone_number: string;
  description: string;
  last_status: string;
  technician_name: string;
  date_report: string;
  onClick: () => void;
}

const ReportCard: FC<ReportCardProps> = ({
  id,
  name,
  phone_number,
  description,
  last_status,
  technician_name,
  date_report,
  onClick,
}) => {
  const truncatedDescription =
    description.length > 150 ? `${description.substring(0, 150)}...` : description;

    const formattedDate = date_report ? format(new Date(date_report), 'dd/MM/yyyy HH:mm') : '-';

  return (
    <div
      className="bg-white rounded-lg shadow-md p-5 mb-5 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between">
        <div className="w-3/5">
          <h3 className="font-bold text-black text-lg mb-2">{name || '-'}</h3>
          <p className="text-gray-600 mb-1">
            <span className="font-medium">Tel:</span> {phone_number || '-'}
          </p>
          <p className="text-gray-700 mt-3">{truncatedDescription || '-'}</p>
        </div>
        <div className="w-2/5 border-l pl-5">
          <div className="mb-3">
            <span className="font-medium text-gray-600">Status:</span>
            <span
              className={`ml-2 px-2 py-1 rounded-full text-sm ${
                last_status === 'Selesai'
                  ? 'bg-green-100 text-green-800'
                  : last_status === 'Penanganan Internal' || last_status === 'Penanganan Eksternal'
                  ? 'bg-blue-100 text-blue-800'
                  : last_status === 'Pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : last_status === 'Laporan Masuk'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {last_status || '-'}
            </span>
          </div>
          <p className="text-gray-600 mb-3">
            <span className="font-medium">Teknisi:</span> {technician_name || '-'}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Tanggal:</span> {formattedDate}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;