import React from 'react';
import { Container, Card } from 'react-bootstrap';
import { ActivityLogTable } from '../components/ActivityLogTable';

const ActivityLogs = () => {
    return (
        <Container fluid className="px-4 py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1 text-dark">Activity Logs</h2>
                    <p className="text-muted mb-0">Monitor system activities and audit trails.</p>
                </div>
            </div>

            <div className="animation-fade-in">
                <ActivityLogTable 
                    contextToken={localStorage.getItem('token')} 
                    isSuperAdmin={false} 
                />
            </div>
            
            <style jsx>{`
                .animation-fade-in {
                    animation: fadeIn 0.4s ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </Container>
    );
};

export default ActivityLogs;
