import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Row, Col, Badge, Button, Spinner, Alert, Tabs, Tab, Modal } from 'react-bootstrap';
import { Mail, MessageSquare, Clock, User, CheckCircle, RefreshCw, Archive, Bell, Eye, XOctagon, CornerUpLeft } from 'lucide-react'; // Added CornerUpLeft
import axios from 'axios';
import { io } from 'socket.io-client';

// --- Configuration for Data Fetching ---
import { API_BASE_URL, SERVER_URL } from '../config';

// --- Configuration for Data Fetching ---
const SUPPORT_API_BASE_URL = `${API_BASE_URL}/support`;
const SOCKET_URL = SERVER_URL; // Your backend URL

// --- Mock Data Structure (for emails only) ---
const mockEmails = [
    { id: 'EML-2001', subject: 'Question about pricing plans', sender: 'contact@example.com', body: 'We are interested in your pricing structure for 5 users...', status: 'Unread', date: '2025-10-07T08:15:00Z' },
    { id: 'EML-2002', subject: 'Payment confirmation for invoice #0008', sender: 'billing@clientcorp.com', body: 'Please confirm receipt of payment sent today.', status: 'Archived', date: '2025-10-06T11:45:00Z' },
];

const SupportData = () => {
    const [tickets, setTickets] = useState([]);
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('tickets');
    const [notifications, setNotifications] = useState([]);
    // State for viewing ticket details
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchSupportData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        
        if (!token) {
            setError("Authentication failed. Please ensure you are logged in to view support data.");
            setLoading(false);
            setEmails(mockEmails);
            return;
        }

        try {
            // --- Fetch Support Tickets ---
            const ticketsRes = await axios.get(`${SUPPORT_API_BASE_URL}/tickets`, { headers: getAuthHeaders() });
            setTickets(ticketsRes.data);

            // --- Fetch Support Emails (Mocked) ---
            const emailsRes = { data: mockEmails };
            setEmails(emailsRes.data);

        } catch (e) {
            console.error("Error fetching support data:", e.response?.data?.message || e.message || e);
            
            let errorMessage = "Failed to load support data from the server. Check API endpoints.";
            if (e.response && e.response.status === 401) {
                errorMessage = "Access Denied (401). Please check your login session and permissions.";
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    // --- Socket.IO setup (unchanged) ---
    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            console.log('Connected to socket server:', socket.id);
        });

        socket.on('newTicket', (data) => {
            console.log('New ticket notification received:', data.message);
            setNotifications(prev => [...prev, data.message]);
            // Refresh the data to show the new ticket
            fetchSupportData(); 
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from socket server.');
        });

        // Cleanup on unmount
        return () => socket.disconnect();
    }, [fetchSupportData]);

    useEffect(() => {
        fetchSupportData();
    }, [fetchSupportData]);

    // --- Ticket Action Handlers ---

    const handleViewTicket = (ticket) => {
        setSelectedTicket(ticket);
        setShowDetailModal(true);
    };

    const handleStatusUpdate = async (ticketId, currentStatus) => {
        // Prevent accidental multiple clicks and irrelevant status updates
        if (statusUpdating || currentStatus === 'Closed') return;

        setStatusUpdating(true);
        const newStatus = 'Closed'; // For simplicity, we only allow closing here
        
        // NOTE: This assumes a PUT endpoint exists on the backend to handle the status update
        const UPDATE_STATUS_API = `${SUPPORT_API_BASE_URL}/tickets/${ticketId}/status`;

        try {
            // Send the new status to the backend
            await axios.put(UPDATE_STATUS_API, { status: newStatus }, { headers: getAuthHeaders() });
            
            // 1. Update the local state for the main ticket list
            setTickets(prevTickets => prevTickets.map(t => 
                t.ticketId === ticketId ? { ...t, status: newStatus } : t
            ));

            // 2. Update the selectedTicket state (which controls the modal content)
            setSelectedTicket(prevSelected => 
                prevSelected && prevSelected.ticketId === ticketId ? { ...prevSelected, status: newStatus } : prevSelected
            );
            
            // 3. CRITICAL FIX: Close the modal after successful update
            setShowDetailModal(false); 
            
        } catch (e) {
            console.error(`Failed to update status for ticket ${ticketId}:`, e.response?.data || e);
            // Re-fetch data if update failed to ensure state integrity
            fetchSupportData();
        } finally {
            setStatusUpdating(false);
        }
    };


    // --- Helper Functions ---
    const getStatusBadge = (status) => {
        switch (status) {
            case 'Open': return <Badge pill bg="danger">Open</Badge>;
            case 'In Progress': return <Badge pill bg="warning" text="dark">In Progress</Badge>;
            case 'Closed': return <Badge pill bg="success">Closed</Badge>;
            case 'Pending': return <Badge pill bg="info">Pending</Badge>;
            case 'Unread': return <Badge pill bg="primary">Unread</Badge>;
            case 'Archived': return <Badge pill bg="secondary">Archived</Badge>;
            default: return <Badge pill bg="secondary">{status}</Badge>;
        }
    };

    // --- Modal Component for Ticket Details ---
    const TicketDetailModal = () => (
        <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold text-primary">Ticket Details: {selectedTicket?.ticketId}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {selectedTicket ? (
                    <Row className="g-3">
                        <Col md={12}>
                            <h4 className="mb-3">{selectedTicket.subject}</h4>
                        </Col>
                        
                        {/* Status Bar */}
                        <Col md={12} className="mb-3">
                             <div className="d-flex align-items-center bg-light p-3 border rounded">
                                <span className="text-muted me-3">Current Status:</span>
                                {getStatusBadge(selectedTicket.status)}
                                {selectedTicket.status !== 'Closed' && (
                                    <span className="ms-auto text-muted small"><Clock size={14} className="me-1" /> Opened since {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                                )}
                            </div>
                        </Col>
                        
                        {/* Customer Info */}
                        <Col sm={6}>
                            <p className="mb-1 text-muted small">Customer Name:</p>
                            <p className="fw-semibold d-flex align-items-center mb-0"><User size={14} className="me-2 text-muted" />{selectedTicket.customerName}</p>
                        </Col>
                        <Col sm={6}>
                            <p className="mb-1 text-muted small">Customer Email:</p>
                            <p className="fw-semibold d-flex align-items-center mb-0"><Mail size={14} className="me-2 text-muted" />{selectedTicket.customerEmail}</p>
                        </Col>
                        <Col sm={6}>
                            <p className="mb-1 text-muted small">Department:</p>
                            <p className="fw-semibold">{selectedTicket.department}</p>
                        </Col>
                        <Col sm={6}>
                            <p className="mb-1 text-muted small">Submitted By (Staff):</p>
                            <p className="fw-semibold">{selectedTicket.submittedBy ? selectedTicket.submittedBy.username : 'N/A'}</p>
                        </Col>
                        <Col md={12} className="pt-3">
                            <Card className="bg-white border">
                                <Card.Header className="text-primary fw-bold">Issue Message:</Card.Header>
                                <Card.Body>
                                    <p style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.message}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                        
                         {/* Reply Placeholder (UI Enhancement) */}
                        {/* <Col md={12} className="mt-4">
                            <Card className="bg-light border-0">
                                <Card.Body className="d-flex justify-content-between align-items-center">
                                    <span className="text-muted">
                                        <CornerUpLeft size={16} className="me-2" />
                                        Future Feature: Reply to customer directly here.
                                    </span>
                                    <Button variant="outline-secondary" size="sm" disabled>Send Reply</Button>
                                </Card.Body>
                            </Card>
                        </Col> */}

                    </Row>
                ) : (
                    <p>Loading ticket details...</p>
                )}
            </Modal.Body>
            <Modal.Footer>
                {selectedTicket?.status !== 'Closed' && (
                    <Button 
                        variant="success" 
                        onClick={() => handleStatusUpdate(selectedTicket.ticketId, selectedTicket.status)} 
                        disabled={statusUpdating}
                    >
                        {statusUpdating ? <Spinner animation="border" size="sm" className="me-2" /> : <CheckCircle size={18} className="me-2" />}
                        Mark as Resolved (Closed)
                    </Button>
                )}
                <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
            </Modal.Footer>
        </Modal>
    );

    // --- Render Functions for Each Tab ---

    const renderTicketTable = () => (
        <Table responsive hover className="mb-0">
            <thead className="bg-light">
                <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>Customer</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Submitted By</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {tickets.map(ticket => (
                    <tr key={ticket.ticketId}>
                        <td className="fw-semibold text-primary">{ticket.ticketId}</td>
                        <td>{ticket.subject}</td>
                        <td><User size={14} className="me-1 text-muted" />{ticket.customerName}</td>
                        <td>{ticket.department}</td>
                        <td>{getStatusBadge(ticket.status)}</td>
                        {/* submittedBy is an object if populated by Mongoose */}
                        <td>{ticket.submittedBy ? ticket.submittedBy.username : 'N/A'}</td>
                        <td className="text-muted small">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                        <td className="d-flex gap-2">
                            {/* View Action */}
                            <Button 
                                variant="outline-primary" 
                                size="sm" 
                                title="View Details"
                                onClick={() => handleViewTicket(ticket)}
                            >
                                <Eye size={14} />
                            </Button>
                            
                            {/* Close Action - Disabled if already closed or updating */}
                            {ticket.status !== 'Closed' && (
                                <Button 
                                    variant="outline-success" 
                                    size="sm"
                                    title="Mark as Resolved"
                                    onClick={() => handleStatusUpdate(ticket.ticketId, ticket.status)}
                                    disabled={statusUpdating}
                                >
                                    <CheckCircle size={14} />
                                </Button>
                            )}
                            {ticket.status === 'Closed' && (
                                <Button 
                                    variant="success" 
                                    size="sm"
                                    title="Already Resolved"
                                    disabled
                                >
                                    <CheckCircle size={14} />
                                </Button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

    const renderEmailTable = () => (
        <Table responsive hover className="mb-0">
            <thead className="bg-light">
                <tr>
                    <th>Email ID</th>
                    <th>Subject</th>
                    <th>Sender</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {emails.map(email => (
                    <tr key={email.id} className={email.status === 'Unread' ? 'fw-bold' : ''}>
                        <td className="text-primary">{email.id}</td>
                        <td>{email.subject}</td>
                        <td><Mail size={14} className="me-1 text-muted" />{email.sender}</td>
                        <td>{getStatusBadge(email.status)}</td>
                        <td className="text-muted small">{new Date(email.date).toLocaleString()}</td>
                        <td className="d-flex gap-2">
                            <Button variant="outline-primary" size="sm" title="Read Email" onClick={() => console.log(`Reading email from ${email.sender}:\n\n${email.body}`)}>
                                <Eye size={14} />
                            </Button>
                            <Button variant="outline-secondary" size="sm" title="Archive Email" onClick={() => console.log(`Archiving email ${email.id}`)}>
                                <Archive size={14} />
                            </Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

    return (
        <div className="p-4">
            <Row className="mb-4 align-items-center">
                <Col>
                    <h2 className="mb-1">Customer Support Hub</h2>
                    <p className="text-muted mb-0">Manage incoming issue tickets and communication channels.</p>
                </Col>
                <Col xs="auto">
                    {notifications.length > 0 && (
                        <div className="d-inline-block me-3 position-relative">
                            <Button variant="warning" onClick={() => setNotifications([])} title="Clear Notifications">
                                <Bell size={18} className="me-2" />
                                New! ({notifications.length})
                                <XOctagon size={14} className="ms-2" />
                            </Button>
                        </div>
                    )}
                    <Button variant="primary" className="d-flex align-items-center fw-semibold" onClick={fetchSupportData} disabled={loading}>
                        <RefreshCw size={18} className="me-2" />
                        {loading ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                </Col>
            </Row>

            <Card className="shadow-lg border-0">
                <Card.Body className="p-0">
                    {/* Display Error prominently if fetching failed */}
                    {error && <Alert variant="danger" className="m-3">{error}</Alert>}

                    {loading && (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" size="sm" className="me-2" /> Loading records...
                        </div>
                    )}

                    {!loading && !error && (
                        <Tabs
                            id="support-data-tabs"
                            activeKey={activeTab}
                            onSelect={(k) => setActiveTab(k)}
                            className="mb-3 ps-3 pt-3"
                        >
                            <Tab eventKey="tickets" title={<><MessageSquare size={16} className="me-2" /> Issue Tickets ({tickets.length})</>}>
                                {tickets.length > 0 ? renderTicketTable() : <p className="text-center p-4 text-muted">No support tickets found.</p>}
                            </Tab>
                            {/* <Tab eventKey="emails" title={<><Mail size={16} className="me-2" /> Support Emails ({emails.length})</>}>
                                {renderEmailTable()}
                            </Tab> */}
                        </Tabs>
                    )}
                </Card.Body>
            </Card>
            
            {/* Ticket Detail Modal */}
            <TicketDetailModal />
        </div>
    );
};

export default SupportData;