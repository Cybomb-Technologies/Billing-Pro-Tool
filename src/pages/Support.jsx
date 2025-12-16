import React, { useState, useEffect } from 'react';
import { Card, Container, Form, Button, Row, Col, Alert, InputGroup, Table, Spinner, Badge, Modal } from 'react-bootstrap';
import { Search, Mail, Phone, MessageSquare, BookOpen, Download, HelpCircle, Clock, Copy, PhoneCall } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// API Endpoint for submitting new tickets
const SUPPORT_API_BASE_URL = `${API_BASE_URL}/support`;

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

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim() !== '') {
            showAlert(`Simulating search for: "${searchTerm}". (KB Lookup not implemented)`, 'info');
        }
    };

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
            fetchMyTickets();
        } catch (error) {
            console.error('Ticket submission failed:', error.response?.data || error);
            showAlert(`Failed to submit ticket. Error: ${error.response?.data?.message || 'Server error.'}`, 'danger');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCardClick = (title) => {
        if (title === 'Email Support') {
            setShowEmailModal(true);
        } else if (title === 'Phone Support') {
            setShowPhoneModal(true);
        } else {
            showAlert(`Simulating action: ${title}`, 'info');
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
            case 'Open': return <Badge bg="danger">Open</Badge>;
            case 'In Progress': return <Badge bg="warning" text="dark">In Progress</Badge>;
            case 'Closed': return <Badge bg="success">Closed</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const renderTicketTable = () => (
        <Table responsive hover className="mb-0">
            <thead className="bg-light">
                <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                {tickets.map(ticket => (
                    <tr key={ticket.ticketId}>
                        <td className="fw-semibold text-primary">{ticket.ticketId}</td>
                        <td>{ticket.subject}</td>
                        <td>{ticket.department}</td>
                        <td>{getStatusBadge(ticket.status)}</td>
                        <td className="text-muted small">{new Date(ticket.createdAt).toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

    const EmailSupportModal = () => (
        <Modal show={showEmailModal} onHide={() => setShowEmailModal(false)} centered>
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold text-primary"><Mail size={24} className="me-2" /> Email Support</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
                <p>For support inquiries, you can email us directly at:</p>
                <h4 className="fw-bold mb-3">support@example.com</h4>
                <Button variant="outline-primary" onClick={handleCopyEmail}>
                    <Copy size={16} className="me-2" /> Copy Email Address
                </Button>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowEmailModal(false)}>Close</Button>
            </Modal.Footer>
        </Modal>
    );

    const PhoneSupportModal = () => (
        <Modal show={showPhoneModal} onHide={() => setShowPhoneModal(false)} centered>
            <Modal.Header closeButton>
                <Modal.Title className="fw-bold text-primary"><Phone size={24} className="me-2" /> Phone Support</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
                <p>For urgent assistance, please call our support hotline:</p>
                <h4 className="fw-bold mb-3">123-456-7890</h4>
                <Button variant="primary" href="tel:1234567890">
                    <PhoneCall size={16} className="me-2" /> Call Now
                </Button>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowPhoneModal(false)}>Close</Button>
            </Modal.Footer>
        </Modal>
    );

    return (
        <Container fluid className="p-4">
            <Row className="mb-4 align-items-center">
                <Col>
                    <h2 className="text-dark fw-bold mb-1">Staff Support Portal</h2>
                    <p className="text-muted mb-0">Quickly resolve issues or access vital resources.</p>
                </Col>
            </Row>
            
            {alert.show && (
                <Alert variant={alert.type} className="mb-3" dismissible onClose={() => showAlert('', 'hidden')}>
                    {alert.message}
                </Alert>
            )}

            <Card className="mb-4 shadow-sm border-0">
                <Card.Body>
                    <h5 className="text-primary mb-3"><BookOpen size={20} className="me-2" /> Search Knowledge Base</h5>
                    <Form className="d-flex" onSubmit={handleSearch}>
                        <InputGroup style={{ maxWidth: '600px' }}>
                            <Form.Control type="text" placeholder="Search FAQs, guides, or troubleshooting steps..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            <Button type="submit" variant="primary">
                                <Search size={20} />
                            </Button>
                        </InputGroup>
                    </Form>
                </Card.Body>
            </Card>
            
            <Card className="mb-4 shadow-sm border-0">
                <Card.Body className="p-4">
                    <h5 className="text-dark mb-4"><HelpCircle size={20} className="me-2" /> Quick Actions & Contact</h5>
                    <Row className="g-4 text-center">
                        <Col md={3}>
                            <div onClick={() => handleCardClick('Video Guides')} className="p-3 border rounded-3 bg-light cursor-pointer hover-shadow" style={{ cursor: 'pointer' }}>
                                <Download size={24} className="text-info mb-2" />
                                <div className="fw-semibold small">Video Guides</div>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div onClick={() => handleCardClick('Internal Docs')} className="p-3 border rounded-3 bg-light cursor-pointer hover-shadow" style={{ cursor: 'pointer' }}>
                                <BookOpen size={24} className="text-success mb-2" />
                                <div className="fw-semibold small">Internal Docs</div>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div onClick={() => handleCardClick('Phone Support')} className="p-3 border rounded-3 bg-light cursor-pointer hover-shadow" style={{ cursor: 'pointer' }}>
                                <Phone size={24} className="text-warning mb-2" />
                                <div className="fw-semibold small">Phone Support</div>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div onClick={() => handleCardClick('Email Support')} className="p-3 border rounded-3 bg-light cursor-pointer hover-shadow" style={{ cursor: 'pointer' }}>
                                <Mail size={24} className="text-primary mb-2" />
                                <div className="fw-semibold small">Email Support</div>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
            
            <Card className="shadow-sm border-0">
                <Card.Body className="p-4">
                    <h5 className="text-dark mb-4"><MessageSquare size={20} className="me-2" /> Submit a New Issue Ticket</h5>
                    <Form onSubmit={handleFormSubmit}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Your Name *</Form.Label>
                                    <Form.Control type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleFormChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Your Email Address *</Form.Label>
                                    <Form.Control type="email" name="email" placeholder="Work Email" value={formData.email} onChange={handleFormChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Subject *</Form.Label>
                                    <Form.Control type="text" name="subject" placeholder="Brief description of your issue" value={formData.subject} onChange={handleFormChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Department *</Form.Label>
                                    <Form.Select name="department" value={formData.department} onChange={handleFormChange} required>
                                        <option value="technical">Technical Support</option>
                                        <option value="billing">Billing & Payments</option>
                                        <option value="feature">Feature Request</option>
                                        <option value="account">Account Management</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Message / Details *</Form.Label>
                                    <Form.Control as="textarea" rows={4} name="message" placeholder="Describe the issue, including steps to reproduce, if applicable." value={formData.message} onChange={handleFormChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Button type="submit" variant="primary" disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Issue Ticket'}
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            <Card className="shadow-sm border-0 mt-4">
                <Card.Body className="p-4">
                    <h5 className="text-dark mb-4"><Clock size={20} className="me-2" /> Raised Tickets</h5>
                    {loadingTickets ? (
                        <div className="text-center py-3">
                            <Spinner animation="border" size="sm" className="me-2" /> Loading your tickets...
                        </div>
                    ) : ticketError ? (
                        <Alert variant="danger">{ticketError}</Alert>
                    ) : tickets.length > 0 ? (
                        <Table responsive hover className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th>Ticket ID</th>
                                    <th>Subject</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map(ticket => (
                                    <tr key={ticket.ticketId}>
                                        <td className="fw-semibold text-primary">{ticket.ticketId}</td>
                                        <td>{ticket.subject}</td>
                                        <td>{ticket.department}</td>
                                        <td>{getStatusBadge(ticket.status)}</td>
                                        <td className="text-muted small">{new Date(ticket.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <div className="text-center py-4 text-muted">
                            <p className="mb-0">You haven't submitted any support tickets yet.</p>
                            <p className="small">Fill out the form above to get started!</p>
                        </div>
                    )}
                </Card.Body>
            </Card>

            <EmailSupportModal />
            <PhoneSupportModal />

            <style>{`
                .hover-shadow:hover {
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    transform: translateY(-2px);
                    transition: all 0.3s ease;
                }
            `}</style>
        </Container>
    );
};

export default Support;