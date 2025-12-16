import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Row, Col, Button, Form, Modal, Badge, Spinner, Alert } from 'react-bootstrap';
import { Plus, Clock, List, CheckCircle, User, AlertTriangle } from 'lucide-react';
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

const StaffLog = () => {
    // Access authenticated user info
    const { user } = useAuth();
    const userId = user?._id || user?.id; // Assuming user ID is stored in _id or id
    const userName = user?.username || 'Guest Staff'; 
    const isAuthenticated = !!userId; // Check if user ID is available

    const [logs, setLogs] = useState([]);
    const [newLog, setNewLog] = useState(initialLogState);
    const [showModal, setShowModal] = useState(false);
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
    
    // Helper function to render status badges
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Completed': return <Badge bg="success"><CheckCircle size={14} className="me-1" />Completed</Badge>;
            case 'In Progress': return <Badge bg="primary"><Clock size={14} className="me-1" />In Progress</Badge>;
            case 'Pending': return <Badge bg="warning"><AlertTriangle size={14} className="me-1" />Pending</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="p-4">
            {alert.show && (
                <Alert variant={alert.type} className="position-fixed top-0 end-0 m-3" style={{ zIndex: 1050 }} onClose={() => setAlert({ show: false, message: '', type: '' })} dismissible>
                    {alert.message}
                </Alert>
            )}

            <Row className="mb-4 align-items-center">
                <Col>
                    <h2 className="mb-1">Staff Activity Log</h2>
                    <p className="text-muted mb-0">Record your day-to-day tasks and accomplishments.</p>
                </Col>
                <Col xs="auto">
                    <Button variant="success" className="d-flex align-items-center" onClick={() => setShowModal(true)} disabled={!isAuthenticated}>
                        <Plus size={18} className="me-2" />
                        Log New Task
                    </Button>
                </Col>
            </Row>
            
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Your Recent Activities</h5>
                    <Badge bg="primary"><User size={14} className="me-2" />Logged in as: {userName}</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                    {error && <Alert variant="danger" className="m-3">{error}</Alert>}
                    
                    {loading ? (
                        <div className="text-center py-5 text-muted">
                            <Spinner animation="border" size="sm" className="me-2" /> Loading logs...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <List size={32} className="mb-3" />
                            <p>{isAuthenticated ? 'No tasks found for your user account.' : 'Please log in to view your activity log.'}</p>
                        </div>
                    ) : (
                        <Table responsive hover className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Task Details</th>
                                    <th>Status</th>
                                    <th>Logged At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log._id}>
                                        <td className="fw-semibold">{new Date(log.date).toLocaleDateString()}</td>
                                        <td><Badge bg="info">{log.category}</Badge></td>
                                        <td>{log.details}</td>
                                        <td>{getStatusBadge(log.status)}</td>
                                        <td className="text-muted small">{new Date(log.createdAt).toLocaleTimeString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Task Logging Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h5">Log Daily Task</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateLog}>
                    <Modal.Body>
                        <Alert variant="info" className="p-2 small">Logging task for user: **{userName}**</Alert>
                        
                        <Form.Group className="mb-3">
                            <Form.Label>Date of Activity *</Form.Label>
                            <Form.Control 
                                type="date"
                                value={newLog.date}
                                onChange={(e) => setNewLog({...newLog, date: e.target.value})}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Task Category *</Form.Label>
                            <Form.Select
                                value={newLog.category}
                                onChange={(e) => setNewLog({...newLog, category: e.target.value})}
                                required
                            >
                                {taskCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </Form.Select>
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                            <Form.Label>Task Details (What was done?) *</Form.Label>
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
                            <Form.Label>Status</Form.Label>
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
                        <Button variant="success" type="submit">
                            <CheckCircle size={18} className="me-1" />
                            Submit Log
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default StaffLog;