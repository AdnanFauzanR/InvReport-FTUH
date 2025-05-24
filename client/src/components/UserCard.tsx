import { FC } from 'react';

interface UserCardProps {
    id: string;
    name: string;
    username: string;
    email: string;
    division: string;
    role: string;
    onEdit: () => void;
    onDelete: () => void;
}

const UserCard: FC<UserCardProps> = ({
    name,
    username,
    email,
    division,
    role,
    onEdit,
    onDelete
}) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-5 mb-5 relative">
            <div className="mb-4">
                <h3 className="font-bold text-black text-lg">
                    {name || '-'}
                </h3>
                <p className="text-gray-600">
                    {username || '-'}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <p className="text-gray-600"><span className="font-medium">Email:</span> {email || '-'}</p>
                </div>
                <div>
                    <p className="text-gray-600"><span className="font-medium">Divisi:</span> {division || '-'}</p>
                </div>
                <div>
                    <p className="text-gray-600"><span className="font-medium">Role:</span> {role || '-'}</p>
                </div>
            </div>

            <div className="absolute top-5 right-5 flex space-x-2">
                <button 
                    className="p-2 bg-blue-100 text-blue-700 rounded hover: bg-blue-200"
                    onClick={onEdit}>
                        Edit
                </button>
                <button
                    className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    onClick={onDelete}>
                        Delete
                </button>
            </div>
        </div>
    );
};

export default UserCard;