import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Row, Col, Button, Form, Modal, Badge, Spinner, Alert, Container } from 'react-bootstrap';
import { Plus, Clock, List, CheckCircle, User, AlertTriangle, Eye } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; // Corrected path assumption
import { API_BASE_URL } from '../config';

// --- Initial Log Structure ---
const initialLogState = {
    date: new Date().toISOString().split('T')[0],
    category: 'Invoice Processing',
    details: '',
    status: 'Pending'
};

const taskCategories = [
    'Invoice Processing', 'Inventory Check', 'Customer Follow-up', 
    'Report Generation', 'Data Entry', 'Other'
];

// Helper function to render status badges
const getStatusBadge = (status) => {
    switch (status) {
        case 'Completed': return <Badge bg="success"><CheckCircle size={14} className="me-1" />Completed</Badge>;
        case 'In Progress': return <Badge bg="primary"><Clock size={14} className="me-1" />In Progress</Badge>;
        case 'Pending': return <Badge bg="warning"><AlertTriangle size={14} className="me-1" />Pending</Badge>;
        default: return <Badge bg="secondary">{status}</Badge>;
    }
};

// View Detail Modal Component
const ViewLogModal = ({ show, onHide, log }) => {
    if (!log) return null;
    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title className="h5 fw-bold">Task Details</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0 fw-bold">{log.category}</h5>
                    {getStatusBadge(log.status)}
                </div>
                <div className="text-muted small mb-3">
                    {new Date(log.date).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="p-3 bg-light rounded border">
                    <label className="text-muted small text-uppercase fw-bold mb-2">Description</label>
                    <div className="text-dark">{log.details || 'No details provided.'}</div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};

const StaffLog = () => {
    // Access authenticated user info
    const { user } = useAuth();
    const userId = user?._id || user?.id; // Assuming user ID is stored in _id or id
    const userName = user?.username || 'Guest Staff'; 
    const isAuthenticated = !!userId; // Check if user ID is available

    const [logs, setLogs] = useState([]);
    const [newLog, setNewLog] = useState(initialLogState);
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const showAlert = (message, type = 'success') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: '' }), 4000);
    };

    // --- API Interaction (Real Calls) ---
    const fetchLogs = useCallback(async () => {
        if (!isAuthenticated) {
             setError('Authentication required to load logs.');
             setLoading(false);
             return;
        }

        setLoading(true);
        setError(null);
        
        try {
            // NOTE: Uses the endpoint you set up in the backend
            const response = await axios.get(`${API_BASE_URL}/stafflogs`, {
                headers: getAuthHeaders()
            });
            
            // Sort by creation date (newest first)
            const sortedLogs = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            setLogs(sortedLogs);
        } catch (e) {
            setError('Failed to fetch daily logs from the server.');
            console.error('Log fetch error:', e);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleCreateLog = async (e) => {
        e.preventDefault();
        
        if (!newLog.details || !newLog.date) {
            showAlert('Please fill in task details and date.', 'warning');
            return;
        }

        const logPayload = {
            ...newLog,
            // userId and userName are handled by the backend using the auth token
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/stafflogs`, logPayload, {
                headers: getAuthHeaders()
            });
            
            const savedLog = response.data;

            // Optimistically update UI and reset form
            setLogs(prev => [savedLog, ...prev]);
            setNewLog(initialLogState);
            setShowModal(false);
            showAlert('Task logged successfully!', 'success');
        } catch (e) {
            showAlert('Failed to save task. Please check server connection.', 'danger');
            console.error('Log submission error:', e);
        }
    };
    
    return (
        <Container fluid className="px-4 py-3">
            {alert.show && (
                <Alert variant={alert.type} className="position-fixed top-0 end-0 m-3 shadow" style={{ zIndex: 1050 }} onClose={() => setAlert({ show: false, message: '', type: '' })} dismissible>
                    {alert.message}
                </Alert>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="text-dark fw-bold mb-1">Staff Activity Log</h2>
                    <p className="text-muted mb-0">Record your day-to-day tasks and accomplishments.</p>
                </div>
                <Button variant="success" className="d-flex align-items-center shadow-sm fw-bold" onClick={() => setShowModal(true)} disabled={!isAuthenticated}>
                    <Plus size={18} className="me-2" />
                    Log New Task
                </Button>
            </div>
            
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
                    <h5 className="mb-0 fw-bold">Your Recent Activities</h5>
                    <Badge bg="primary" className="py-2 px-3"><User size={14} className="me-2" />Logged in as: {userName}</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                    {error && <Alert variant="danger" className="m-3">{error}</Alert>}
                    
                    {loading ? (
                        <div className="text-center py-5 text-muted">
                            <Spinner animation="border" size="sm" className="me-2" /> Loading logs...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <List size={48} className="mb-3 opacity-25" />
                            <p>{isAuthenticated ? 'No tasks found for your user account.' : 'Please log in to view your activity log.'}</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="py-3 ps-4">Date</th>
                                        <th className="py-3">Category</th>
                                        <th className="py-3">Task Details</th>
                                        <th className="py-3 text-center">Status</th>
                                        <th className="py-3">Logged At</th>
                                        <th className="py-3 pe-4 text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, index) => (
                                        <tr key={log._id || index}>
                                            <td className="ps-4 fw-semibold text-dark">{new Date(log.date).toLocaleDateString()}</td>
                                            <td>
                                                <Badge bg="info" className="text-dark bg-opacity-10 text-uppercase border border-info border-opacity-25" style={{ fontSize: '0.75rem' }}>
                                                    {log.category}
                                                </Badge>
                                            </td>
                                            <td className="text-muted" style={{ maxWidth: '350px' }}>
                                                <div className="text-truncate" title={log.details}>
                                                    {log.details || 'No details provided'}
                                                </div>
                                            </td>
                                            <td className="text-center">{getStatusBadge(log.status)}</td>
                                            <td className="text-muted small">
                                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="text-end pe-4">
                                                <Button 
                                                    variant="outline-primary" 
                                                    size="sm" 
                                                    className="shadow-sm"
                                                    onClick={() => { setSelectedLog(log); setShowViewModal(true); }}
                                                    title="View Full Details"
                                                >
                                                    <Eye size={16} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Task Logging Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h5 fw-bold">Log Daily Task</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateLog}>
                    <Modal.Body className="p-4">
                        <Alert variant="info" className="p-2 small mb-3 d-flex align-items-center">
                            <User size={16} className="me-2" />
                            Logging task for user: <strong className="ms-1">{userName}</strong>
                        </Alert>
                        
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-uppercase text-muted">Date of Activity *</Form.Label>
                            <Form.Control 
                                type="date"
                                value={newLog.date}
                                onChange={(e) => setNewLog({...newLog, date: e.target.value})}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-uppercase text-muted">Task Category *</Form.Label>
                            <Form.Select
                                value={newLog.category}
                                onChange={(e) => setNewLog({...newLog, category: e.target.value})}
                                required
                            >
                                {taskCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </Form.Select>
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-uppercase text-muted">Task Details (What was done?) *</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={newLog.details}
                                onChange={(e) => setNewLog({...newLog, details: e.target.value})}
                                placeholder="E.g., Processed invoices INV-0045 to INV-0050 and filed them."
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold small text-uppercase text-muted">Status</Form.Label>
                            <Form.Select
                                value={newLog.status}
                                onChange={(e) => setNewLog({...newLog, status: e.target.value})}
                                required
                            >
                                <option value="Completed">Completed</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Pending">Pending</option>
                            </Form.Select>
                        </Form.Group>

                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="success" type="submit" className="fw-bold">
                            <CheckCircle size={18} className="me-1" />
                            Submit Log
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            
            <ViewLogModal 
                show={showViewModal} 
                onHide={() => setShowViewModal(false)} 
                log={selectedLog} 
            />
        </Container>
    );
};

export default StaffLog;