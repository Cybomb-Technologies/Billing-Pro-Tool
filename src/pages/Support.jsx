import React, { useState, useEffect } from 'react';
import { Card, Container, Form, Button, Row, Col, Alert, Table, Spinner, Badge, Modal } from 'react-bootstrap';
import { Mail, Phone, MessageSquare, Eye, RefreshCw, Plus, CheckCircle, PhoneCall, Copy, Search, HelpCircle, Download, BookOpen, Clock } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

// API Endpoint for submitting new tickets
const SUPPORT_API_BASE_URL = `${API_BASE_URL}/support`;



const EmailSupportModal = ({ show, onHide, handleCopyEmail }) => (
    <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton className="px-4 py-3">
            <Modal.Title className="fw-bold text-primary d-flex align-items-center">
                <Mail size={24} className="me-2" /> Email Support
            </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-4 text-center">
            <p className="mb-3">For support inquiries, you can email us directly at:</p>
            <h4 className="fw-bold mb-4">support@example.com</h4>
            <Button variant="outline-primary" onClick={handleCopyEmail} className="px-4 py-2">
                <Copy size={16} className="me-2" /> Copy Email Address
            </Button>
        </Modal.Body>
        <Modal.Footer className="px-4 py-3">
            <Button variant="secondary" onClick={onHide} className="px-4">Close</Button>
        </Modal.Footer>
    </Modal>
);

const PhoneSupportModal = ({ show, onHide }) => (
    <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton className="px-4 py-3">
            <Modal.Title className="fw-bold text-primary d-flex align-items-center">
                <Phone size={24} className="me-2" /> Phone Support
            </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-4 text-center">
            <p className="mb-3">For urgent assistance, please call our support hotline:</p>
            <h4 className="fw-bold mb-4">123-456-7890</h4>
            <Button variant="primary" href="tel:1234567890" className="px-4 py-2">
                <PhoneCall size={16} className="me-2" /> Call Now
            </Button>
        </Modal.Body>
        <Modal.Footer className="px-4 py-3">
            <Button variant="secondary" onClick={onHide} className="px-4">Close</Button>
        </Modal.Footer>
    </Modal>
);

const NewTicketModal = ({ show, onHide, formData, handleFormChange, handleFormSubmit, submitting }) => (
    <Modal show={show} onHide={onHide} size="lg" centered>
         <Modal.Header closeButton className="px-4 py-3">
            <Modal.Title className="fw-bold text-primary d-flex align-items-center">
                <MessageSquare size={24} className="me-2" /> Submit New Ticket
            </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
             <Form onSubmit={handleFormSubmit}>
                <Row className="g-3">
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label className="fw-bold mb-2">Your Name *</Form.Label>
                            <Form.Control 
                                type="text" 
                                name="name" 
                                placeholder="Full Name" 
                                value={formData.name} 
                                onChange={handleFormChange} 
                                required 
                                className="py-2"
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label className="fw-bold mb-2">Your Email Address *</Form.Label>
                            <Form.Control 
                                type="email" 
                                name="email" 
                                placeholder="Work Email" 
                                value={formData.email} 
                                onChange={handleFormChange} 
                                required 
                                className="py-2"
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label className="fw-bold mb-2">Subject *</Form.Label>
                            <Form.Control 
                                type="text" 
                                name="subject" 
                                placeholder="Brief description of your issue" 
                                value={formData.subject} 
                                onChange={handleFormChange} 
                                required 
                                className="py-2"
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group>
                            <Form.Label className="fw-bold mb-2">Department *</Form.Label>
                            <Form.Select 
                                name="department" 
                                value={formData.department} 
                                onChange={handleFormChange} 
                                required 
                                className="py-2"
                            >
                                <option value="technical">Technical Support</option>
                                <option value="billing">Billing & Payments</option>
                                <option value="feature">Feature Request</option>
                                <option value="account">Account Management</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={12}>
                        <Form.Group>
                            <Form.Label className="fw-bold mb-2">Message / Details *</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={4} 
                                name="message" 
                                placeholder="Describe the issue, including steps to reproduce, if applicable." 
                                value={formData.message} 
                                onChange={handleFormChange} 
                                required 
                                className="py-2"
                            />
                        </Form.Group>
                    </Col>
                </Row>
                <div className="d-flex justify-content-end mt-4">
                    <Button variant="secondary" onClick={onHide} className="me-2 px-4">Cancel</Button>
                    <Button 
                        type="submit" 
                        variant="primary" 
                        className="px-4 fw-bold" 
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                Submitting...
                            </>
                        ) : 'Submit Ticket'}
                    </Button>
                </div>
            </Form>
        </Modal.Body>
    </Modal>
);

const Support = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        department: 'technical',
        message: ''
    });
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });
    const [submitting, setSubmitting] = useState(false);
    
    // New states for fetching and displaying tickets
    const [tickets, setTickets] = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [ticketError, setTicketError] = useState(null);
    
    // States for the support modals
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    const [showNewTicketModal, setShowNewTicketModal] = useState(false);

    // Auth context for role check
    const { user } = useAuth(); // Ensure useAuth is imported

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const showAlert = (message, type = 'success') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: '' }), 5000);
    };

    const fetchMyTickets = async () => {
        setLoadingTickets(true);
        setTicketError(null);
        try {
            const response = await axios.get(`${SUPPORT_API_BASE_URL}/tickets`, {
                headers: getAuthHeaders()
            });
            setTickets(response.data);
        } catch (error) {
            console.error('Error fetching staff tickets:', error.response?.data || error);
            setTicketError('Failed to load your tickets. Please try again.');
        } finally {
            setLoadingTickets(false);
        }
    };

    useEffect(() => {
        fetchMyTickets();
    }, []);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            subject: '',
            department: 'technical',
            message: ''
        });
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            const payload = { ...formData };
            const response = await axios.post(`${SUPPORT_API_BASE_URL}/tickets`, payload, {
                headers: getAuthHeaders()
            });
            
            showAlert(`Ticket #${response.data.ticketId} submitted successfully!`, 'success');
            resetForm();
            setShowNewTicketModal(false);
            fetchMyTickets();
        } catch (error) {
            console.error('Ticket submission failed:', error.response?.data || error);
            showAlert(`Failed to submit ticket. Error: ${error.response?.data?.message || 'Server error.'}`, 'danger');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyEmail = async () => {
        try {
            await navigator.clipboard.writeText('support@example.com');
            showAlert('Email address copied to clipboard!', 'success');
        } catch (err) {
            showAlert('Failed to copy email address.', 'danger');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Open': return <Badge bg="danger" className="px-3 py-1">Open</Badge>;
            case 'In Progress': return <Badge bg="warning" text="dark" className="px-3 py-1">In Progress</Badge>;
            case 'Closed': return <Badge bg="success" className="px-3 py-1">Closed</Badge>;
            default: return <Badge bg="secondary" className="px-3 py-1">{status}</Badge>;
        }
    };

    return (
        <Container fluid className="px-4 py-3">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="text-dark fw-bold mb-1">Customer Support Hub</h2>
                    <p className="text-muted mb-0">Manage incoming issue tickets and communication channels.</p>
                </div>
                <div>
                     <Button 
                        variant="primary" 
                        onClick={() => setShowNewTicketModal(true)} 
                        className="me-2 fw-bold shadow-sm"
                    >
                        <Plus size={18} className="me-2" /> New Ticket
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={fetchMyTickets} 
                        className="fw-bold shadow-sm"
                    >
                        <RefreshCw size={18} className="me-2" /> Refresh Data
                    </Button>
                </div>
            </div>
            
            {alert.show && (
                <Alert variant={alert.type} className="mb-4" dismissible onClose={() => setAlert({ show: false, message: '', type: '' })}>
                    {alert.message}
                </Alert>
            )}

            <Card className="shadow-sm border-0">
                <Card.Body className="p-0">
                     <div className="p-3 border-bottom">
                         <h5 className="mb-0 fw-bold d-flex align-items-center">
                            <MessageSquare size={20} className="me-2" /> Issue Tickets ({tickets.length})
                        </h5>
                     </div>
                    {loadingTickets ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">Loading tickets...</p>
                        </div>
                    ) : ticketError ? (
                        <div className="text-center py-5 text-danger">
                            <Alert variant="danger" className="d-inline-block px-4">{ticketError}</Alert>
                        </div>
                    ) : tickets.length > 0 ? (
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light text-muted">
                                <tr>
                                    <th className="py-3 ps-4 border-bottom-0">Ticket ID</th>
                                    <th className="py-3 ps-4 border-bottom-0">Subject</th>
                                    <th className="py-3 ps-4 border-bottom-0">Customer</th>
                                    <th className="py-3 ps-4 border-bottom-0">Department</th>
                                    <th className="py-3 ps-4 border-bottom-0">Status</th>
                                    <th className="py-3 ps-4 border-bottom-0">Submitted By</th>
                                    <th className="py-3 ps-4 border-bottom-0">Date</th>
                                    {/* Hide Actions for Staff */}
                                    {user?.role !== 'staff' && <th className="py-3 ps-4 border-bottom-0 text-end pe-4">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map(ticket => (
                                    <tr key={ticket.ticketId}>
                                        <td className="py-3 ps-4 fw-bold text-primary">{ticket.ticketId}</td>
                                        <td className="py-3 ps-4">{ticket.subject}</td>
                                        <td className="py-3 ps-4">
                                             <div className="d-flex align-items-center">
                                                <span className="ms-0">{ticket.customerName}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 ps-4 text-capitalize">{ticket.department}</td>
                                        <td className="py-3 ps-4">{getStatusBadge(ticket.status)}</td>
                                        <td className="py-3 ps-4">{ticket.submittedBy?.username || 'N/A'}</td>
                                        <td className="py-3 ps-4 text-muted">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                        {/* Hide Actions for Staff */}
                                        {user?.role !== 'staff' && (
                                            <td className="py-3 ps-4 text-end pe-4">
                                                <Button variant="link" className="text-primary p-0 me-3" title="View Details">
                                                    <Eye size={18} />
                                                </Button>
                                                {ticket.status !== 'Closed' && (
                                                    <Button variant="link" className="text-success p-0" title="Close Ticket">
                                                        <CheckCircle size={18} />
                                                    </Button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <div className="text-center py-5 text-muted">
                            <HelpCircle size={48} className="mb-3 text-secondary" opacity={0.5} />
                            <h5>No tickets found</h5>
                            <p>You haven't submitted any support tickets yet.</p>
                            <Button variant="outline-primary" onClick={() => setShowNewTicketModal(true)}>
                                Create Your First Ticket
                            </Button>
                        </div>
                    )}
                </Card.Body>
            </Card>

            <EmailSupportModal show={showEmailModal} onHide={() => setShowEmailModal(false)} handleCopyEmail={handleCopyEmail} />
            <PhoneSupportModal show={showPhoneModal} onHide={() => setShowPhoneModal(false)} />
            <NewTicketModal 
                show={showNewTicketModal} 
                onHide={() => setShowNewTicketModal(false)} 
                formData={formData} 
                handleFormChange={handleFormChange} 
                handleFormSubmit={handleFormSubmit}
                submitting={submitting}
            />

            <style>{`
                .table th {
                    font-weight: 600;
                    font-size: 0.9rem;
                    white-space: nowrap;
                }
                .table td {
                    font-size: 0.95rem;
                }
                .card {
                    border-radius: 0.75rem;
                }
            `}</style>
        </Container>
    );
};

export default Support;