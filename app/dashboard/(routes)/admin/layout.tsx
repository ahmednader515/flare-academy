import { SessionMonitor } from "@/components/session-monitor";

const AdminLayout = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    return (
        <div className="h-full p-0">
            <SessionMonitor />
            {children}
        </div>
    );
};

export default AdminLayout; 